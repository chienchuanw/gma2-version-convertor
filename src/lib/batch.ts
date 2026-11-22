import { zipSync } from "fflate";
import { downgradeCaveats, type Caveat } from "./caveats";
import {
  compareVersions,
  convert,
  detectVersion,
  diffFields,
  NotGma2XmlError,
  type DetectResult,
  type FieldDiff,
  type Version,
} from "./convert";
import { encodeUtf8 } from "./encoding";

/**
 * Batch conversion of many grandMA2 XML files (e.g. a whole "Export High Show" folder) to one
 * target. Pure: the UI reads the files and hands over `{ path, text }` (or `{ path, error }` when a
 * file couldn't be read); this module never touches the DOM.
 */

export interface BatchInput {
  /** Relative path inside the dropped folder (or just the file name). */
  path: string;
  text?: string;
  /** Why the file couldn't be read (e.g. unsupported encoding). */
  error?: string;
}

/** ok = convertible · warning = convertible but its version info is odd · skipped = not converted. */
export type EntryStatus = "ok" | "warning" | "skipped";

export interface BatchEntry {
  path: string;
  status: EntryStatus;
  text?: string;
  detect?: DetectResult;
  /** Reason for a warning or a skip. */
  note?: string;
}

export interface BatchOutputFile {
  path: string;
  status: Exclude<EntryStatus, "skipped">;
  note?: string;
  /** Output content (unchanged when the file is already at or below the target). */
  text: string;
  changed: boolean;
  source: Version;
  rows: FieldDiff[];
  /** *_vers present but not a whole number (left as is) — for the diff table. */
  unreadable: string[];
  caveats: Caveat[];
}

export interface BatchResult {
  files: BatchOutputFile[];
  skipped: BatchEntry[];
  changedCount: number;
  keptCount: number;
}

const list = (names: string[]) => names.join(" and ");

function versionNote(d: DetectResult): string | undefined {
  if (d.mismatch) return "Version fields disagree (schema path vs. *_vers); the higher one is used.";
  const parts: string[] = [];
  if (d.missingVers.length > 0) parts.push(`${list(d.missingVers)} missing`);
  if (d.unreadableVers.length > 0) parts.push(`${list(d.unreadableVers)} not a whole number`);
  return parts.length > 0 ? `Version attributes incomplete: ${parts.join("; ")}.` : undefined;
}

/** Detect each file's version and decide whether it can be converted. Sorted by path. */
export function analyzeBatch(inputs: BatchInput[]): BatchEntry[] {
  return [...inputs]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((input): BatchEntry => {
      const { path, text } = input;
      if (input.error !== undefined || text === undefined) {
        return { path, status: "skipped", note: input.error ?? "Couldn’t read this file." };
      }
      let detect: DetectResult;
      try {
        detect = detectVersion(text);
      } catch (e) {
        if (e instanceof NotGma2XmlError) {
          return { path, status: "skipped", note: "Not a grandMA2 file (no <MA> tag)." };
        }
        throw e;
      }
      if (detect.sourceVersion === null) {
        return { path, status: "skipped", detect, note: "No readable version information in the <MA> tag." };
      }
      const note = versionNote(detect);
      return { path, status: note ? "warning" : "ok", text, detect, note };
    });
}

/** The batch's effective source: the highest version among convertible files. */
export function batchSourceVersion(entries: BatchEntry[]): Version | null {
  let max: Version | null = null;
  for (const e of entries) {
    const s = e.status === "skipped" ? null : e.detect?.sourceVersion;
    if (s && (!max || compareVersions(s, max) > 0)) max = s;
  }
  return max;
}

/**
 * Convert every convertible file to `target`. Files already at or below the target are kept
 * unchanged (they load as they are), so the output stays a complete copy of the folder.
 */
export function convertBatch(entries: BatchEntry[], target: Version): BatchResult {
  const files: BatchOutputFile[] = [];
  const skipped: BatchEntry[] = [];
  for (const e of entries) {
    if (e.status === "skipped" || !e.text || !e.detect?.sourceVersion) {
      skipped.push(e);
      continue;
    }
    const source = e.detect.sourceVersion;
    const downgrade = compareVersions(target, source) < 0;
    const text = downgrade ? convert(e.text, target).output : e.text;
    files.push({
      path: e.path,
      status: e.status,
      note: e.note,
      text,
      changed: text !== e.text,
      source,
      rows: downgrade ? diffFields(e.text, target) : [],
      unreadable: e.detect.unreadableVers,
      caveats: downgradeCaveats(e.text, source, target),
    });
  }
  const changedCount = files.filter((f) => f.changed).length;
  return { files, skipped, changedCount, keptCount: files.length - changedCount };
}

/**
 * If every path sits under the same top-level folder, strip it (the zip then mirrors the
 * folder's contents) and name the zip after it.
 */
export function zipLayout(paths: string[]): { prefix: string; name: string | null } {
  const tops = new Set(paths.map((p) => (p.includes("/") ? p.slice(0, p.indexOf("/")) : null)));
  if (paths.length === 0 || tops.size !== 1 || tops.has(null)) return { prefix: "", name: null };
  const [name] = tops as Set<string>;
  return { prefix: `${name}/`, name };
}

/** Zip the output files at their relative paths (minus `prefix`). Each entry is the exact bytes. */
export function buildZip(files: { path: string; text: string }[], prefix = ""): Uint8Array<ArrayBuffer> {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    const path = prefix && f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path;
    entries[path] = encodeUtf8(f.text);
  }
  return zipSync(entries, { level: 6 }) as Uint8Array<ArrayBuffer>;
}
