import { describe, expect, it } from "vitest";
import { downgradeCaveats, firstContentElement } from "./caveats";

const MA = `<MA xmlns="http://schemas.malighting.de/grandma2/xml/MA" major_vers="3" minor_vers="9" stream_vers="63">`;
const file = (body: string, bom = "\uFEFF") =>
  `${bom}<?xml version="1.0" encoding="utf-8"?>\n${MA}\n\t<Info datetime="2026-11-22T23:34:01" showfile="demo" />\n${body}\n</MA>\n`;

const v = (major: number, minor: number, stream: number) => ({ major, minor, stream });

describe("firstContentElement", () => {
  it("returns the first element under <MA>, skipping <Info>", () => {
    expect(firstContentElement(file(`\t<UserProfiles index="0">`))).toBe("UserProfiles");
    expect(firstContentElement(file(`\t<Macros index="12">`))).toBe("Macros");
    expect(firstContentElement(file(`\t<Macro index="0" name="x">`, ""))).toBe("Macro");
  });

  it("skips comments and works without an <Info> element", () => {
    const xml = `<?xml version="1.0"?>\n${MA}<!-- note --><Form index="0" name="CAL 130">`;
    expect(firstContentElement(xml)).toBe("Form");
  });

  it("returns null when there is no <MA> tag or nothing under it", () => {
    expect(firstContentElement(`<root><Macros/></root>`)).toBeNull();
    expect(firstContentElement(`${MA}</MA>`)).toBeNull();
  });
});

describe("downgradeCaveats", () => {
  it("warns when a user-profile export is downgraded", () => {
    const c = downgradeCaveats(file(`\t<UserProfiles index="0">`), v(3, 9, 63), v(3, 3, 4));
    expect(c).toHaveLength(1);
    expect(c[0].id).toBe("user-profiles");
    expect(c[0].message).toMatch(/crash/);
    expect(c[0].message).toMatch(/3\.9\.63/); // names the observed case
  });

  it("also covers a single UserProfile export", () => {
    expect(downgradeCaveats(file(`\t<UserProfile index="1">`), v(3, 9, 60), v(3, 3, 4))).toHaveLength(1);
  });

  it("has no caveat for other object types", () => {
    for (const el of ["Macros", "Sequences", "Presets", "Users", "Groups"]) {
      expect(downgradeCaveats(file(`\t<${el} index="0">`), v(3, 9, 63), v(3, 3, 4))).toEqual([]);
    }
  });

  it("has no caveat when nothing is downgraded (target equals source)", () => {
    expect(downgradeCaveats(file(`\t<UserProfiles index="0">`), v(3, 9, 60), v(3, 9, 60))).toEqual([]);
  });
});
