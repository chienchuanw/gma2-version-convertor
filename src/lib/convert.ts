export interface Version {
  major: number;
  minor: number;
  stream: number;
}

export interface DetectResult {
  /** Version from the major_vers/minor_vers/stream_vers attributes (only when all three present). */
  attrVersion: Version | null;
  /** Version from the xsi:schemaLocation path, if present. */
  schemaVersion: Version | null;
  /** Whether the source carried an xsi:schemaLocation path at all. */
  hasSchemaLocation: boolean;
  /**
   * Effective source version for the downgrade filter: the higher of the attr
   * and schema versions. Null only when neither could be read.
   */
  sourceVersion: Version | null;
  /** True when both versions are present and disagree (signals a non-genuine file). */
  mismatch: boolean;
  /** True when *_vers is partially present (1 or 2 of the three) — a hand-edited anomaly. */
  partial: boolean;
}

/** Thrown when the input is not a grandMA2 XML file (no <MA> root element). */
export class NotGma2XmlError extends Error {
  constructor(message = "This does not look like a grandMA2 XML file (no <MA> element).") {
    super(message);
    this.name = "NotGma2XmlError";
  }
}

/** Thrown when an <MA> tag is present but carries no readable version information. */
export class NoVersionInfoError extends Error {
  constructor(
    message = "The <MA> tag has no readable version information to convert.",
  ) {
    super(message);
    this.name = "NoVersionInfoError";
  }
}

export interface ConvertResult {
  /** The full converted file content. */
  output: string;
  /** The original <MA ...> opening tag. */
  before: string;
  /** The rewritten <MA ...> opening tag. */
  after: string;
  /** False when the target equals the source, i.e. nothing changed. */
  changed: boolean;
}

const MA_OPEN_TAG_RE = /<MA\b[^>]*>/;
const SCHEMA_PATH_RE = /xml\/(\d+)\.(\d+)\.(\d+)\/MA\.xsd/;
const VERS_NAMES = ["major_vers", "minor_vers", "stream_vers"] as const;

/** Match a single numeric version attribute, allowing single or double quotes. */
function attrRe(name: string): RegExp {
  return new RegExp(`${name}\\s*=\\s*(["'])(\\d+)\\1`);
}

/** Read a numeric version attribute's value from a tag string, or null if absent. */
function readAttr(tag: string, name: string): number | null {
  const m = attrRe(name).exec(tag);
  return m ? Number(m[2]) : null;
}

/** Compare two versions by major, then minor, then stream. */
export function compareVersions(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor || a.stream - b.stream;
}

/** Extract the opening <MA ...> tag, or throw NotGma2XmlError when absent. */
function openingTag(xml: string): { tag: string; index: number } {
  const m = MA_OPEN_TAG_RE.exec(xml);
  if (m === null) throw new NotGma2XmlError();
  return { tag: m[0], index: m.index };
}

export function detectVersion(xml: string): DetectResult {
  const { tag } = openingTag(xml);

  const nums = VERS_NAMES.map((n) => readAttr(tag, n));
  const presentCount = nums.filter((n) => n !== null).length;
  const attrVersion: Version | null =
    presentCount === 3
      ? { major: nums[0]!, minor: nums[1]!, stream: nums[2]! }
      : null;

  const schema = SCHEMA_PATH_RE.exec(tag);
  const schemaVersion: Version | null = schema
    ? { major: +schema[1], minor: +schema[2], stream: +schema[3] }
    : null;

  const mismatch =
    attrVersion !== null &&
    schemaVersion !== null &&
    compareVersions(attrVersion, schemaVersion) !== 0;

  let sourceVersion: Version | null;
  if (attrVersion && schemaVersion) {
    sourceVersion =
      compareVersions(attrVersion, schemaVersion) >= 0 ? attrVersion : schemaVersion;
  } else {
    sourceVersion = attrVersion ?? schemaVersion;
  }

  return {
    attrVersion,
    schemaVersion,
    hasSchemaLocation: schemaVersion !== null,
    sourceVersion,
    mismatch,
    partial: presentCount > 0 && presentCount < 3,
  };
}

/**
 * Rewrite a grandMA2 file's version marker to `target`. Within the opening <MA>
 * tag only, it rewrites the schemaLocation path and every *_vers attribute that
 * is present — each in place, preserving order, spacing and quote style. Missing
 * attributes are never injected; every other byte is preserved.
 */
export function convert(xml: string, target: Version): ConvertResult {
  const { tag: before, index } = openingTag(xml);
  if (detectVersion(xml).sourceVersion === null) throw new NoVersionInfoError();

  const values: Record<string, number> = {
    major_vers: target.major,
    minor_vers: target.minor,
    stream_vers: target.stream,
  };

  let after = before.replace(
    SCHEMA_PATH_RE,
    `xml/${target.major}.${target.minor}.${target.stream}/MA.xsd`,
  );
  for (const name of VERS_NAMES) {
    after = after.replace(
      new RegExp(`(${name}\\s*=\\s*["'])\\d+`),
      `$1${values[name]}`,
    );
  }

  const output = xml.slice(0, index) + after + xml.slice(index + before.length);
  return { output, before, after, changed: output !== xml };
}
