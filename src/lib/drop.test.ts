import { describe, expect, it } from "vitest";
import { collectDropped, isXmlPath, walkEntries } from "./drop";

// Minimal stand-ins for the browser's FileSystemEntry API.
function fileEntry(fullPath: string): FileSystemEntry {
  const name = fullPath.split("/").pop()!;
  return {
    isFile: true,
    isDirectory: false,
    name,
    fullPath,
    file: (ok: (f: File) => void) => ok(new File(["x"], name)),
  } as unknown as FileSystemEntry;
}

function dirEntry(fullPath: string, children: FileSystemEntry[], chunk = 2): FileSystemEntry {
  return {
    isFile: false,
    isDirectory: true,
    name: fullPath.split("/").pop()!,
    fullPath,
    createReader: () => {
      // Like Chrome: entries come back in chunks, then an empty array.
      let i = 0;
      return {
        readEntries: (ok: (e: FileSystemEntry[]) => void) => {
          ok(children.slice(i, i + chunk));
          i += chunk;
        },
      };
    },
  } as unknown as FileSystemEntry;
}

const SHOW = dirEntry("/show", [
  dirEntry("/show/importexport", [
    fileEntry("/show/importexport/Macros.xml"),
    fileEntry("/show/importexport/Sequence.xml"),
    fileEntry("/show/importexport/._Macros.xml"),
  ]),
  dirEntry("/show/library", [fileEntry("/show/library/FixtureType.xml")]),
  fileEntry("/show/.DS_Store"),
]);

describe("walkEntries", () => {
  it("walks nested folders across readEntries chunks, with paths relative to the drop", async () => {
    const picked = await walkEntries([SHOW]);
    expect(picked.map((p) => p.path).sort()).toEqual([
      "show/.DS_Store",
      "show/importexport/._Macros.xml",
      "show/importexport/Macros.xml",
      "show/importexport/Sequence.xml",
      "show/library/FixtureType.xml",
    ]);
    expect(picked.every((p) => p.file instanceof File)).toBe(true);
  });
});

describe("isXmlPath", () => {
  it("keeps .xml files (any case) and drops macOS ._ files and other types", () => {
    expect(isXmlPath("show/importexport/Macros.xml")).toBe(true);
    expect(isXmlPath("MACROS.XML")).toBe(true);
    expect(isXmlPath("show/importexport/._Macros.xml")).toBe(false);
    expect(isXmlPath("show/.DS_Store")).toBe(false);
    expect(isXmlPath("show/demo.show.gz")).toBe(false);
  });
});

describe("collectDropped", () => {
  const dt = (entries: (FileSystemEntry | null)[], names: string[]) =>
    ({
      files: names.map((n) => new File(["x"], n)),
      items: entries.map((e) => ({ kind: "file", webkitGetAsEntry: () => e })),
    }) as unknown as DataTransfer;

  it("treats plain files as a file selection (not a folder)", async () => {
    const r = await collectDropped(dt([fileEntry("/a.xml"), fileEntry("/b.xml")], ["a.xml", "b.xml"]));
    expect(r.folder).toBe(false);
    expect(r.picked.map((p) => p.path)).toEqual(["a.xml", "b.xml"]);
  });

  it("walks a dropped folder", async () => {
    const r = await collectDropped(dt([SHOW], ["show"]));
    expect(r.folder).toBe(true);
    expect(r.picked).toHaveLength(5);
  });

  it("falls back to dataTransfer.files when entries aren't available", async () => {
    const r = await collectDropped(dt([null], ["a.xml"]));
    expect(r).toMatchObject({ folder: false, picked: [{ path: "a.xml" }] });
  });
});
