import { describe, it, expect } from "vitest";
import {
  CATALOG,
  downgradeTargets,
  versionString,
  withVersionSuffix,
  type CatalogEntry,
} from "./versions";

const sample: CatalogEntry[] = [
  { label: "3.9.60", version: { major: 3, minor: 9, stream: 60 } },
  { label: "3.8.0", version: { major: 3, minor: 8, stream: 0 } },
  { label: "3.3.4", version: { major: 3, minor: 3, stream: 4 } },
  { label: "2.5.3", version: { major: 2, minor: 5, stream: 3 } },
];

describe("versionString", () => {
  it("formats a version triple as major.minor.stream", () => {
    expect(versionString({ major: 3, minor: 3, stream: 4 })).toBe("3.3.4");
  });
});

describe("withVersionSuffix", () => {
  it("inserts the version before the final extension", () => {
    expect(withVersionSuffix("Show.xml", { major: 3, minor: 3, stream: 4 })).toBe(
      "Show_3.3.4.xml",
    );
  });

  it("only touches the final extension", () => {
    expect(
      withVersionSuffix("My.Show.xml", { major: 3, minor: 8, stream: 0 }),
    ).toBe("My.Show_3.8.0.xml");
  });

  it("appends when there is no extension", () => {
    expect(withVersionSuffix("Show", { major: 3, minor: 3, stream: 4 })).toBe(
      "Show_3.3.4",
    );
  });
});

describe("downgradeTargets", () => {
  it("returns only versions strictly older than the source, newest-first", () => {
    const src = { major: 3, minor: 8, stream: 0 };
    const result = downgradeTargets(src, sample).map((e) => e.label);
    expect(result).toEqual(["3.3.4", "2.5.3"]);
  });

  it("excludes the source's own version (no self / no-op target)", () => {
    const src = { major: 3, minor: 9, stream: 60 };
    const result = downgradeTargets(src, sample).map((e) => e.label);
    expect(result).not.toContain("3.9.60");
    expect(result).toEqual(["3.8.0", "3.3.4", "2.5.3"]);
  });

  it("returns nothing when the source is already the oldest", () => {
    const src = { major: 2, minor: 5, stream: 3 };
    expect(downgradeTargets(src, sample)).toEqual([]);
  });
});

describe("CATALOG", () => {
  it("includes the four priority targets with correct triples", () => {
    const byLabel = Object.fromEntries(CATALOG.map((e) => [e.label, e.version]));
    expect(byLabel["3.3.4"]).toEqual({ major: 3, minor: 3, stream: 4 });
    expect(byLabel["3.8.0"]).toEqual({ major: 3, minor: 8, stream: 0 });
    expect(byLabel["3.9.0"]).toEqual({ major: 3, minor: 9, stream: 0 });
    expect(byLabel["3.9.60"]).toEqual({ major: 3, minor: 9, stream: 60 });
  });

  it("is sorted newest-first", () => {
    for (let i = 1; i < CATALOG.length; i++) {
      const prev = CATALOG[i - 1].version;
      const cur = CATALOG[i].version;
      const newer =
        prev.major - cur.major || prev.minor - cur.minor || prev.stream - cur.stream;
      expect(newer).toBeGreaterThan(0);
    }
  });
});
