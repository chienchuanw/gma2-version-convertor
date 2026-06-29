import { describe, it, expect } from "vitest";
import {
  convert,
  detectVersion,
  NotGma2XmlError,
  NoVersionInfoError,
} from "./convert";

// Authentic genuine-export header (from gma2-plugins Update Info.xml): path == attrs.
const genuine3960 =
  '<?xml version="1.0" encoding="utf-8"?>\r\n' +
  '<MA xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.malighting.de/grandma2/xml/MA" xsi:schemaLocation="http://schemas.malighting.de/grandma2/xml/MA http://schemas.malighting.de/grandma2/xml/3.9.60/MA.xsd" major_vers="3" minor_vers="9" stream_vers="60">\r\n' +
  '\t<Plugin index="0" execute_on_load="0" name="Update Info" luafile="Update Info.lua" />\r\n' +
  "</MA>\r\n";

describe("detectVersion", () => {
  it("reads the version from the *_vers attributes of a genuine MA file", () => {
    const r = detectVersion(genuine3960);
    expect(r.attrVersion).toEqual({ major: 3, minor: 9, stream: 60 });
  });

  it("reads the version from the schemaLocation path", () => {
    const r = detectVersion(genuine3960);
    expect(r.schemaVersion).toEqual({ major: 3, minor: 9, stream: 60 });
  });

  it("throws NotGma2XmlError when the input has no <MA> tag", () => {
    expect(() => detectVersion("<?xml version=\"1.0\"?>\n<root/>")).toThrow(
      NotGma2XmlError,
    );
  });

  it("on a genuine file: sourceVersion set, no mismatch, has schemaLocation", () => {
    const r = detectVersion(genuine3960);
    expect(r.sourceVersion).toEqual({ major: 3, minor: 9, stream: 60 });
    expect(r.mismatch).toBe(false);
    expect(r.hasSchemaLocation).toBe(true);
  });

  it("flags a mismatch and takes the higher version when path and attrs disagree", () => {
    // Non-genuine file (gma2-plugins Presets_to_Offsets): path 3.8.0, attrs 3.3.4.
    const mismatch =
      '<MA xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.malighting.de/grandma2/xml/MA" xsi:schemaLocation="http://schemas.malighting.de/grandma2/xml/3.8.0/MA.xsd" major_vers="3" minor_vers="3" stream_vers="4">\n</MA>';
    const r = detectVersion(mismatch);
    expect(r.mismatch).toBe(true);
    expect(r.sourceVersion).toEqual({ major: 3, minor: 8, stream: 0 });
  });

  it("handles a file with *_vers but no schemaLocation attribute", () => {
    const noSchema =
      '<MA xmlns="http://schemas.malighting.de/grandma2/xml/MA" major_vers="3" minor_vers="9" stream_vers="60">\n</MA>';
    const r = detectVersion(noSchema);
    expect(r.schemaVersion).toBeNull();
    expect(r.hasSchemaLocation).toBe(false);
    expect(r.sourceVersion).toEqual({ major: 3, minor: 9, stream: 60 });
    expect(r.mismatch).toBe(false);
  });
});

describe("convert", () => {
  it("rewrites schema path and all three *_vers to the target, byte-faithful elsewhere", () => {
    const out = convert(genuine3960, { major: 3, minor: 3, stream: 4 });
    const expected = genuine3960
      .replace("xml/3.9.60/MA.xsd", "xml/3.3.4/MA.xsd")
      .replace(
        'major_vers="3" minor_vers="9" stream_vers="60"',
        'major_vers="3" minor_vers="3" stream_vers="4"',
      );
    expect(out.output).toBe(expected);
    expect(out.output).not.toContain("3.9.60");
  });

  it("reports the <MA> opening tag before and after, and changed=true", () => {
    const out = convert(genuine3960, { major: 3, minor: 3, stream: 4 });
    expect(out.changed).toBe(true);
    expect(out.before).toContain('major_vers="3" minor_vers="9" stream_vers="60"');
    expect(out.before).toContain("xml/3.9.60/MA.xsd");
    expect(out.after).toContain('major_vers="3" minor_vers="3" stream_vers="4"');
    expect(out.after).toContain("xml/3.3.4/MA.xsd");
  });

  it("is a no-op (changed=false, output identical) when target equals source", () => {
    const out = convert(genuine3960, { major: 3, minor: 9, stream: 60 });
    expect(out.changed).toBe(false);
    expect(out.output).toBe(genuine3960);
  });

  it("preserves a leading UTF-8 BOM", () => {
    const withBom = "﻿" + genuine3960;
    const out = convert(withBom, { major: 3, minor: 3, stream: 4 });
    expect(out.output.startsWith("﻿")).toBe(true);
  });

  it("rewrites only *_vers when the file has no schemaLocation (no attr injected)", () => {
    const noSchema =
      '<MA xmlns="http://schemas.malighting.de/grandma2/xml/MA" major_vers="3" minor_vers="9" stream_vers="60">\n</MA>';
    const out = convert(noSchema, { major: 3, minor: 3, stream: 4 });
    expect(out.output).toContain('major_vers="3" minor_vers="3" stream_vers="4"');
    expect(out.output).not.toContain("MA.xsd");
  });

  it("throws NoVersionInfoError when the <MA> tag carries no version info", () => {
    expect(() => convert("<MA>\n</MA>", { major: 3, minor: 3, stream: 4 })).toThrow(
      NoVersionInfoError,
    );
  });

  it("throws NotGma2XmlError for non-MA input", () => {
    expect(() => convert("<root/>", { major: 3, minor: 3, stream: 4 })).toThrow(
      NotGma2XmlError,
    );
  });
});
