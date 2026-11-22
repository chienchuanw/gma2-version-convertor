import { describe, expect, it } from "vitest";
import { decodeUtf8Strict, encodeUtf8, UnsupportedEncodingError } from "./encoding";

const enc = new TextEncoder();
const bytes = (...parts: (string | number[])[]) =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === "string" ? [...enc.encode(p)] : p)));

const HEADER = `<?xml version="1.0" encoding="utf-8"?>\n<MA major_vers="3" minor_vers="9" stream_vers="60">\n</MA>\n`;

function expectReject(input: Uint8Array, match: RegExp) {
  expect(() => decodeUtf8Strict(input)).toThrow(UnsupportedEncodingError);
  expect(() => decodeUtf8Strict(input)).toThrow(match);
}

describe("decodeUtf8Strict", () => {
  it("decodes plain UTF-8 and round-trips byte-for-byte", () => {
    const input = bytes(HEADER);
    const text = decodeUtf8Strict(input);
    expect(text).toBe(HEADER);
    expect(encodeUtf8(text)).toEqual(input);
  });

  it("keeps a UTF-8 BOM so the output round-trips byte-for-byte", () => {
    const input = bytes([0xef, 0xbb, 0xbf], HEADER);
    const text = decodeUtf8Strict(input);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(encodeUtf8(text)).toEqual(input);
  });

  it("round-trips CRLF and non-ASCII names (e.g. Chinese macro names)", () => {
    const input = bytes(HEADER.replace(/\n/g, "\r\n"), `<Macro name="燈光 測試 ü" />\r\n`);
    expect(encodeUtf8(decodeUtf8Strict(input))).toEqual(input);
  });

  it("accepts files with no XML declaration and UTF8 / upper-case spellings", () => {
    expect(() => decodeUtf8Strict(bytes(`<MA major_vers="3"></MA>`))).not.toThrow();
    expect(() => decodeUtf8Strict(bytes(`<?xml version="1.0" encoding="UTF-8"?><MA/>`))).not.toThrow();
    expect(() => decodeUtf8Strict(bytes(`<?xml version='1.0' encoding='utf8'?><MA/>`))).not.toThrow();
    expect(() => decodeUtf8Strict(bytes(`<?xml version="1.0"?><MA/>`))).not.toThrow();
  });

  it("rejects UTF-16 LE and BE with a BOM", () => {
    const le = new Uint8Array([0xff, 0xfe, 0x3c, 0x00, 0x3f, 0x00]);
    const be = new Uint8Array([0xfe, 0xff, 0x00, 0x3c, 0x00, 0x3f]);
    expectReject(le, /UTF-16/);
    expectReject(be, /UTF-16/);
  });

  it("rejects UTF-32 with a BOM", () => {
    expectReject(new Uint8Array([0xff, 0xfe, 0x00, 0x00, 0x3c, 0, 0, 0]), /UTF-32/);
    expectReject(new Uint8Array([0x00, 0x00, 0xfe, 0xff, 0, 0, 0, 0x3c]), /UTF-32/);
  });

  it("rejects UTF-16 without a BOM (NUL-interleaved '<?')", () => {
    expectReject(new Uint8Array([0x3c, 0x00, 0x3f, 0x00, 0x78, 0x00]), /UTF-16/);
    expectReject(new Uint8Array([0x00, 0x3c, 0x00, 0x3f, 0x00, 0x78]), /UTF-16/);
  });

  it("rejects UTF-16/32 without a BOM that doesn't start with '<?' (NUL bytes)", () => {
    const utf16le = new Uint8Array([...enc.encode("<MA/>")].flatMap((c) => [c, 0]));
    const utf32be = new Uint8Array([...enc.encode("<MA/>")].flatMap((c) => [0, 0, 0, c]));
    expectReject(utf16le, /NUL bytes/);
    expectReject(utf32be, /NUL bytes/);
  });

  it("ignores encoding= inside a later <?xml-stylesheet?> instruction", () => {
    const xml = `<?xml-stylesheet type="text/xsl" encoding="x"?><MA major_vers="3"/>`;
    expect(() => decodeUtf8Strict(bytes(xml))).not.toThrow();
  });

  it("rejects a declaration that names another encoding, even when the bytes are ASCII", () => {
    expectReject(bytes(`<?xml version="1.0" encoding="ISO-8859-1"?><MA/>`), /ISO-8859-1/);
    expectReject(bytes(`<?xml version="1.0" encoding='windows-1252'?><MA/>`), /windows-1252/);
  });

  it("rejects bytes that are not valid UTF-8 (e.g. a Latin-1 'é')", () => {
    expectReject(bytes(`<?xml version="1.0"?><MA name="caf`, [0xe9], `"/>`), /not valid UTF-8/);
  });
});
