import { compareVersions, type Version } from "./convert";

export interface CatalogEntry {
  /** Human-facing label, e.g. "3.9.60". */
  label: string;
  version: Version;
  /** Approximate first-shipped year, for display. */
  year?: number;
  /** Whether the triple was verified from a real export header or inferred. */
  confidence?: "verified" | "inferred";
  /** A version the user commonly downgrades to. */
  priority?: boolean;
}

/**
 * Known grandMA2 release header triples (major.minor.stream), newest-first.
 * Source: docs/grandma2-versions.md. The dropdown lists these; a custom-triple
 * input covers beta/interim builds with raw stream counters (e.g. 3.1.229).
 */
export const CATALOG: CatalogEntry[] = [
  { label: "3.9.63", version: { major: 3, minor: 9, stream: 63 }, year: 2026, confidence: "inferred" },
  { label: "3.9.61", version: { major: 3, minor: 9, stream: 61 }, year: 2025, confidence: "verified" },
  { label: "3.9.60", version: { major: 3, minor: 9, stream: 60 }, year: 2020, confidence: "verified", priority: true },
  { label: "3.9.51", version: { major: 3, minor: 9, stream: 51 }, year: 2020, confidence: "verified" },
  { label: "3.9.0", version: { major: 3, minor: 9, stream: 0 }, year: 2020, confidence: "verified", priority: true },
  { label: "3.8.0", version: { major: 3, minor: 8, stream: 0 }, year: 2019, confidence: "verified", priority: true },
  { label: "3.7.0", version: { major: 3, minor: 7, stream: 0 }, year: 2019, confidence: "verified" },
  { label: "3.6.1", version: { major: 3, minor: 6, stream: 1 }, year: 2019, confidence: "verified" },
  { label: "3.5.0", version: { major: 3, minor: 5, stream: 0 }, year: 2018, confidence: "verified" },
  { label: "3.4.0", version: { major: 3, minor: 4, stream: 0 }, year: 2018, confidence: "verified" },
  { label: "3.3.4", version: { major: 3, minor: 3, stream: 4 }, year: 2017, confidence: "verified", priority: true },
  { label: "3.3.2", version: { major: 3, minor: 3, stream: 2 }, year: 2017, confidence: "verified" },
  { label: "3.2.2", version: { major: 3, minor: 2, stream: 2 }, year: 2016, confidence: "verified" },
  { label: "3.1.2", version: { major: 3, minor: 1, stream: 2 }, year: 2015, confidence: "verified" },
  { label: "3.1.1", version: { major: 3, minor: 1, stream: 1 }, year: 2015, confidence: "verified" },
  { label: "3.1.0", version: { major: 3, minor: 1, stream: 0 }, year: 2014, confidence: "verified" },
  { label: "3.0.0", version: { major: 3, minor: 0, stream: 0 }, year: 2014, confidence: "verified" },
  { label: "2.9.1", version: { major: 2, minor: 9, stream: 1 }, year: 2014, confidence: "inferred" },
  { label: "2.8.3", version: { major: 2, minor: 8, stream: 3 }, year: 2013, confidence: "verified" },
  { label: "2.7.0", version: { major: 2, minor: 7, stream: 0 }, year: 2013, confidence: "inferred" },
  { label: "2.6.0", version: { major: 2, minor: 6, stream: 0 }, year: 2012, confidence: "inferred" },
  { label: "2.5.3", version: { major: 2, minor: 5, stream: 3 }, year: 2012, confidence: "verified" },
];

/** Format a version triple as "major.minor.stream". */
export function versionString(v: Version): string {
  return `${v.major}.${v.minor}.${v.stream}`;
}

/** Insert "_X.Y.Z" before the final extension (or append if there is none). */
export function withVersionSuffix(filename: string, v: Version): string {
  const suffix = `_${versionString(v)}`;
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return filename + suffix;
  return filename.slice(0, dot) + suffix + filename.slice(dot);
}

/** Catalog entries strictly older than `source`, newest-first (valid downgrade targets). */
export function downgradeTargets(
  source: Version,
  catalog: CatalogEntry[] = CATALOG,
): CatalogEntry[] {
  return catalog
    .filter((e) => compareVersions(e.version, source) < 0)
    .sort((a, b) => compareVersions(b.version, a.version));
}
