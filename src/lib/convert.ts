export interface Version {
  major: number;
  minor: number;
  stream: number;
}

export interface DetectResult {
  /** Version from the major_vers/minor_vers/stream_vers attributes, if present. */
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

const MA_TAG_RE = /<MA[\s>]/;
const MA_OPEN_TAG_RE = /<MA\b[^>]*>/;
const SCHEMA_PATH_RE = /xml\/(\d+)\.(\d+)\.(\d+)\/MA\.xsd/;
const VERS_ATTRS_RE =
  /major_vers="(\d+)"\s+minor_vers="(\d+)"\s+stream_vers="(\d+)"/;

/** Compare two versions by major, then minor, then stream. */
export function compareVersions(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor || a.stream - b.stream;
}

export function detectVersion(xml: string): DetectResult {
  if (!MA_TAG_RE.test(xml)) throw new NotGma2XmlError();

  const schema = SCHEMA_PATH_RE.exec(xml);
  const attrs = VERS_ATTRS_RE.exec(xml);

  const attrVersion: Version | null = attrs
    ? { major: +attrs[1], minor: +attrs[2], stream: +attrs[3] }
    : null;
  const schemaVersion: Version | null = schema
    ? { major: +schema[1], minor: +schema[2], stream: +schema[3] }
    : null;

  const mismatch =
    attrVersion !== null &&
    schemaVersion !== null &&
    compareVersions(attrVersion, schemaVersion) !== 0;

  let sourceVersion: Version | null = null;
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
  };
}

/**
 * Rewrite a grandMA2 file's version marker to `target`, changing only the
 * schemaLocation path and the three *_vers attributes on the opening <MA> tag.
 * Every other byte is preserved.
 */
export function convert(xml: string, target: Version): ConvertResult {
  const detected = detectVersion(xml); // throws NotGma2XmlError if no <MA>
  if (detected.sourceVersion === null) throw new NoVersionInfoError();

  const tagMatch = MA_OPEN_TAG_RE.exec(xml);
  if (tagMatch === null) throw new NoVersionInfoError();

  const before = tagMatch[0];
  const after = before
    .replace(
      SCHEMA_PATH_RE,
      `xml/${target.major}.${target.minor}.${target.stream}/MA.xsd`,
    )
    .replace(
      VERS_ATTRS_RE,
      `major_vers="${target.major}" minor_vers="${target.minor}" stream_vers="${target.stream}"`,
    );

  const output =
    xml.slice(0, tagMatch.index) +
    after +
    xml.slice(tagMatch.index + before.length);

  return { output, before, after, changed: output !== xml };
}
