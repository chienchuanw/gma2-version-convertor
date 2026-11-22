import { compareVersions, type Version } from "./convert";

/**
 * Content caveats a version-marker rewrite can't fix. The converter never changes content (SPEC
 * "V1 Scope"), so for object types known to break an older onPC on import, it can only warn.
 */

export interface Caveat {
  id: "user-profiles";
  message: string;
}

const MA_OPEN_RE = /<MA\b[^>]*>/;
// Whitespace, comments and <Info .../> may precede the first content element.
const SKIP_RE = /^(?:\s+|<!--[\s\S]*?-->|<Info\b[^>]*\/>|<Info\b[^>]*>[\s\S]*?<\/Info>)*/;
const ELEMENT_RE = /^<([A-Za-z_][\w.-]*)/;

/** Name of the first element under <MA> (skipping <Info>), e.g. "Macros" — the exported object type. */
export function firstContentElement(xml: string): string | null {
  const open = MA_OPEN_RE.exec(xml);
  if (!open) return null;
  const rest = xml.slice(open.index + open[0].length);
  const after = rest.slice(SKIP_RE.exec(rest)?.[0].length ?? 0);
  return ELEMENT_RE.exec(after)?.[1] ?? null;
}

const USER_PROFILE_ELEMENTS = new Set(["UserProfiles", "UserProfile"]);

/** Caveats for converting this file from `source` down to `target` (empty when nothing applies). */
export function downgradeCaveats(xml: string, source: Version, target: Version): Caveat[] {
  if (compareVersions(target, source) >= 0) return [];
  const kind = firstContentElement(xml);
  if (kind && USER_PROFILE_ELEMENTS.has(kind)) {
    return [
      {
        id: "user-profiles",
        message:
          "User profiles from a newer version can crash an older onPC on import: a 3.9.63 UserProfiles export converted to 3.3.4 crashed onPC 3.3.4.1. The marker rewrite doesn’t remove settings the older version doesn’t know. Recreate user profiles on the target instead, or test the import on a copy of your show first.",
      },
    ];
  }
  return [];
}
