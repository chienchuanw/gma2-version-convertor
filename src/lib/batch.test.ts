import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  analyzeBatch,
  batchSourceVersion,
  buildZip,
  convertBatch,
  zipLayout,
  type BatchInput,
} from "./batch";
import { encodeUtf8 } from "./encoding";

const ns = "http://schemas.malighting.de/grandma2/xml/MA";
const xsd = "http://schemas.malighting.de/grandma2/xml";
const ma = (v: string, body = "<Macros index=\"12\" />") => {
  const [major, minor, stream] = v.split(".");
  return `﻿<?xml version="1.0" encoding="utf-8"?>\n<MA xmlns="${ns}" xsi:schemaLocation="${ns} ${xsd}/${v}/MA.xsd" major_vers="${major}" minor_vers="${minor}" stream_vers="${stream}">\n\t<Info datetime="2026-11-22T23:34:01" showfile="demo" />\n\t${body}\n</MA>\n`;
};
const v = (major: number, minor: number, stream: number) => ({ major, minor, stream });

const MIXED: BatchInput[] = [
  { path: "show/importexport/Macros.xml", text: ma("3.9.63") },
  { path: "show/importexport/Sequence.xml", text: ma("3.9.60", "<Sequences index=\"25\" />") },
  { path: "show/importexport/Old.xml", text: ma("3.3.2") },
  {
    path: "show/importexport/Mismatch.xml",
    text: ma("3.9.60").replace(`${xsd}/3.9.60/`, `${xsd}/3.9.61/`),
  },
  { path: "show/importexport/Partial.xml", text: ma("3.9.60").replace(' stream_vers="60"', "") },
  { path: "show/importexport/UserProfiles.xml", text: ma("3.9.63", "<UserProfiles index=\"0\" />") },
  { path: "show/library/notes.xml", text: "<?xml version=\"1.0\"?><notes/>" },
  { path: "show/library/NoVersion.xml", text: "<?xml version=\"1.0\"?>\n<MA xmlns=\"x\"></MA>" },
  { path: "show/library/utf16.xml", error: "This file is UTF-16-encoded." },
];

describe("analyzeBatch", () => {
  const entries = analyzeBatch(MIXED);
  const byName = (n: string) => entries.find((e) => e.path.endsWith(n))!;

  it("keeps every input, sorted by path", () => {
    expect(entries.map((e) => e.path)).toEqual([...MIXED.map((i) => i.path)].sort());
  });

  it("marks clean grandMA2 files ok", () => {
    expect(byName("Macros.xml").status).toBe("ok");
    expect(byName("Macros.xml").detect?.sourceVersion).toEqual(v(3, 9, 63));
  });

  it("flags mismatched and partial version info as warnings", () => {
    expect(byName("Mismatch.xml")).toMatchObject({ status: "warning", note: expect.stringMatching(/disagree/) });
    expect(byName("Partial.xml")).toMatchObject({ status: "warning", note: expect.stringMatching(/stream_vers/) });
  });

  it("skips non-grandMA2, version-less and unreadable files with a reason", () => {
    expect(byName("notes.xml")).toMatchObject({ status: "skipped", note: expect.stringMatching(/<MA>/) });
    expect(byName("NoVersion.xml")).toMatchObject({ status: "skipped", note: expect.stringMatching(/version/i) });
    expect(byName("utf16.xml")).toMatchObject({ status: "skipped", note: "This file is UTF-16-encoded." });
  });
});

describe("analyzeBatch duplicates", () => {
  it("skips a second file with the same path (case-insensitively)", () => {
    const entries = analyzeBatch([
      { path: "a/importexport/M.xml", text: ma("3.9.60") },
      { path: "a/importexport/m.xml", text: ma("3.9.63") },
    ]);
    expect(entries.map((e) => e.status)).toEqual(["ok", "skipped"]);
    expect(entries[1].note).toMatch(/Duplicate path/);
  });
});

describe("batchSourceVersion", () => {
  it("is the highest version among convertible files", () => {
    expect(batchSourceVersion(analyzeBatch(MIXED))).toEqual(v(3, 9, 63));
  });

  it("is null for an empty batch or when every file is skipped", () => {
    expect(batchSourceVersion([])).toBeNull();
    expect(batchSourceVersion(analyzeBatch([{ path: "a.xml", text: "<x/>" }]))).toBeNull();
  });
});

describe("convertBatch", () => {
  const result = convertBatch(analyzeBatch(MIXED), v(3, 3, 4));
  const file = (n: string) => result.files.find((f) => f.path.endsWith(n))!;

  it("converts every file newer than the target", () => {
    expect(file("Macros.xml")).toMatchObject({ changed: true });
    expect(file("Macros.xml").text).toContain('major_vers="3" minor_vers="3" stream_vers="4"');
    expect(file("Macros.xml").text).toContain(`${xsd}/3.3.4/MA.xsd`);
    expect(file("Sequence.xml").changed).toBe(true);
  });

  it("keeps files already at or below the target unchanged", () => {
    expect(file("Old.xml")).toMatchObject({ changed: false, text: ma("3.3.2") });
  });

  it("converts warning files too and keeps their warning", () => {
    expect(file("Mismatch.xml")).toMatchObject({ changed: true, status: "warning" });
    expect(file("Partial.xml").changed).toBe(true);
  });

  it("lists skipped files separately and never outputs them", () => {
    expect(result.skipped.map((s) => s.path.split("/").pop())).toEqual(["NoVersion.xml", "notes.xml", "utf16.xml"]);
    expect(result.files.some((f) => f.path.endsWith("notes.xml"))).toBe(false);
  });

  it("counts changed and kept files", () => {
    expect(result.changedCount).toBe(5);
    expect(result.keptCount).toBe(1);
  });

  it("carries content caveats (user profiles) per file", () => {
    expect(file("UserProfiles.xml").caveats.map((c) => c.id)).toEqual(["user-profiles"]);
    expect(file("Macros.xml").caveats).toEqual([]);
  });

  it("handles an empty batch", () => {
    expect(convertBatch([], v(3, 3, 4))).toEqual({ files: [], skipped: [], changedCount: 0, keptCount: 0 });
  });
});

describe("zipLayout", () => {
  it("strips a single shared top folder and names the zip after it", () => {
    expect(zipLayout(["show/importexport/a.xml", "show/library/b.xml"])).toEqual({ prefix: "show/", name: "show" });
  });

  it("keeps paths as they are when there is no single shared folder", () => {
    expect(zipLayout(["a/x.xml", "b/y.xml"])).toEqual({ prefix: "", name: null });
    expect(zipLayout(["x.xml", "y.xml"])).toEqual({ prefix: "", name: null });
    expect(zipLayout([])).toEqual({ prefix: "", name: null });
  });
});

describe("buildZip", () => {
  it("writes every output file at its relative path, byte-for-byte", () => {
    const result = convertBatch(analyzeBatch(MIXED), v(3, 3, 4));
    const zip = buildZip(result.files, "show/");
    const unzipped = unzipSync(zip);
    expect(Object.keys(unzipped).sort()).toEqual(result.files.map((f) => f.path.slice("show/".length)).sort());
    for (const f of result.files) {
      expect(unzipped[f.path.slice("show/".length)]).toEqual(encodeUtf8(f.text));
    }
  });

  it("changes only the <MA> tag of a converted file", () => {
    const input = ma("3.9.63");
    const [out] = convertBatch(analyzeBatch([{ path: "M.xml", text: input }]), v(3, 3, 4)).files;
    const tag = /<MA\b[^>]*>/;
    expect(out.text.replace(tag, "")).toBe(input.replace(tag, ""));
  });
});
