/**
 * Byte ↔ text for grandMA2 XML. grandMA2 writes UTF-8 only (with or without a BOM — verified on
 * onPC 3.3.4.1 → 3.9.63.11 exports), and onPC refuses a UTF-16 copy of an importable file. So
 * anything that isn't valid UTF-8 is rejected instead of being decoded lossily: a lossy decode
 * would re-encode bytes outside the <MA> tag and break the "every other byte is preserved" rule.
 */

/** Thrown when the input is not UTF-8 (UTF-16/32, another declared encoding, or invalid bytes). */
export class UnsupportedEncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedEncodingError";
  }
}

const startsWith = (b: Uint8Array, ...sig: number[]) => sig.every((v, i) => b[i] === v);

/** The encoding a BOM or NUL-interleaved "<?" points to, if it isn't UTF-8. */
function wideEncoding(b: Uint8Array): string | null {
  // Check UTF-32 before UTF-16: the UTF-32 LE BOM starts with the UTF-16 LE BOM.
  if (startsWith(b, 0xff, 0xfe, 0x00, 0x00) || startsWith(b, 0x00, 0x00, 0xfe, 0xff)) return "UTF-32";
  if (startsWith(b, 0xff, 0xfe) || startsWith(b, 0xfe, 0xff)) return "UTF-16";
  if (startsWith(b, 0x3c, 0x00, 0x3f, 0x00) || startsWith(b, 0x00, 0x3c, 0x00, 0x3f)) return "UTF-16";
  return null;
}

const DECL_ENCODING_RE = /^\uFEFF?<\?xml\s[^>]*?\bencoding\s*=\s*(["'])([^"']*)\1/;

/**
 * Decode bytes as UTF-8, keeping a leading BOM, or throw UnsupportedEncodingError.
 * For any input it accepts, `encodeUtf8(decodeUtf8Strict(b))` returns exactly `b`.
 */
export function decodeUtf8Strict(bytes: Uint8Array): string {
  const wide = wideEncoding(bytes);
  if (wide) {
    throw new UnsupportedEncodingError(
      `This file is ${wide}-encoded. grandMA2 writes XML as UTF-8, so this isn’t an original export — re-save it as UTF-8 and try again.`,
    );
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new UnsupportedEncodingError(
      "This file is not valid UTF-8 (it was probably saved in a legacy encoding such as Windows-1252). grandMA2 writes XML as UTF-8 — re-save it as UTF-8 and try again.",
    );
  }

  // NUL is legal UTF-8 but never appears in XML; it means UTF-16/32 without a BOM.
  if (text.includes("\0")) {
    throw new UnsupportedEncodingError(
      "This file contains NUL bytes, so it is probably UTF-16 or UTF-32 without a byte-order mark. grandMA2 writes XML as UTF-8 — re-save it as UTF-8 and try again.",
    );
  }

  const declared = DECL_ENCODING_RE.exec(text)?.[2];
  if (declared !== undefined && !/^utf-?8$/i.test(declared.trim())) {
    throw new UnsupportedEncodingError(
      `The XML declaration says encoding="${declared}". grandMA2 writes XML as UTF-8, so this isn’t an original export — re-save it as UTF-8 and try again.`,
    );
  }
  return text;
}

/** Encode text as UTF-8 bytes (a leading U+FEFF becomes the UTF-8 BOM again). */
export function encodeUtf8(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}
