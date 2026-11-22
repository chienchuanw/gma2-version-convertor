# gma2-version-convertor — Specification

A browser-based tool to **downgrade the version marker** of grandMA2 XML files so that an
older grandMA2 / grandMA2 onPC can load files that were written by a newer version.

## Background

A grandMA2 XML file carries its version in the root `<MA>` tag, in **two independent places**:

```xml
<MA xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns="http://schemas.malighting.de/grandma2/xml/MA"
    xsi:schemaLocation="http://schemas.malighting.de/grandma2/xml/3.9.60/MA.xsd"
    major_vers="3" minor_vers="9" stream_vers="60">
```

- `major_vers` / `minor_vers` / `stream_vers` — the first three parts of the software version
  (`major.minor.stream`, the 4th "build" digit is dropped) that wrote the file.
- `xsi:schemaLocation` path version (`.../xml/3.9.60/MA.xsd`) — **the same `major.minor.stream`
  restated as a URL**. It is a nominal label, not a fetched file (the schema URLs return HTTP 500).

In **genuine console exports these two are always consistent** (`path == major.minor.stream`,
verified across ~150 real exports). They only disagree in hand-authored plugin descriptors / MA
self-test files where someone hardcoded a stray header — a mismatch is a reliable signal the file
is *not* a clean console export. (Details + the full version table: `docs/grandma2-versions.md`.)

A higher-version console can load a lower-version file, but not vice versa. **The gate is the
`*_vers` attributes** — verified on real onPC 3.3.4.1 / 3.7.0.5 / 3.9.0.3 / 3.9.60.50: rewriting
only `*_vers` makes a refused file import, rewriting only the schema path does not, and within one
`major.minor` line `stream_vers` alone decides. Writing all parts consistently keeps the output
identical to a native export. The real-world need is *downgrading*:
new file → old console.

## V1 Scope — "naive marker rewrite"

V1 only rewrites the version marker; it does **not** transform file content to match an older
schema. (Content-aware downgrade is a deliberate future phase "B".)

### Core conversion behaviour
- Rewrite, on the `<MA>` tag: the `schemaLocation` path version **and** all three `*_vers`
  attributes, **all set to the same target version triple** — making the file look exactly like
  a native export from the target console. (`*_vers` is the verified gate; writing all parts
  consistently is the most native-looking result.)
- Each version field is rewritten **in place**: `*_vers` attributes are matched individually
  (order-independent, single- or double-quoted) so a reordered file can never silently leave the
  `*_vers` gate un-lowered. Only fields that are **present** are rewritten; missing fields are
  **never injected** (stay faithful — a genuine export without `schemaLocation` is valid).
- If the source has **partial `*_vers`** (1–2 of the three) it is flagged and the user is warned;
  the present fields are still rewritten. If `schemaLocation` and `*_vers` **disagree** (non-genuine
  file), surface both and use the **higher** as the effective source for the downgrade filter.
- **Precise string replacement only.** Every other byte of the file is preserved: indentation,
  CRLF/LF line endings, BOM, encoding declaration, attribute order, comments.
- **Downgrade only.** Source version is auto-detected (primary: `*_vers`; fallback:
  `schemaLocation` path). The target dropdown lists only versions older than the source. If the
  source is already the oldest known version, or the chosen target equals the source → show
  "no conversion needed", produce no download.

### Form factor & stack
- **Client-side only** — files never leave the user's machine. Deployed on **Vercel**.
- **Next.js (App Router) + TypeScript + Tailwind CSS.**
- Conversion core is a **pure TypeScript module** (string in → string out, no React/DOM
  dependency) so it is unit-testable and reusable (future MCP server / VS Code extension).

### Input / output
- Input: **drag-and-drop + click-to-pick**. Accepts **`.xml` only**. A `.show.gz` is gzip around
  MA's proprietary **binary** show format (magic `MA DATA`, no `<MA>` tag — verified, see
  `docs/grandma2-versions.md`), so it cannot be downgraded by a marker rewrite. Whole shows go
  through the XML export workflow instead (export to XML → convert → import on the older version).
- Target version: **dropdown of known releases (as complete as discoverable)** as primary,
  **custom major/minor/stream input** as fallback. Common targets surfaced first:
  `3.3.4`, `3.8.0`, `3.9.0`, `3.9.60`.
- Before download: show a **"source version → target version" summary**, a **per-field diff
  table** (`schemaLocation` path + each `*_vers`, changed values highlighted, absent fields shown
  as "not added"), and the raw `<MA>` line **before/after** behind a "Show raw tag" toggle.
- Priority versions older than the source are offered as one-click **"Common targets"** chips
  above the full dropdown.
- Output filename gets a **target-version suffix** (`Name_3.3.4.xml`) — never overwrites the
  source.
- **Batch**: several files or a whole folder (picked with "Choose a folder" or dropped; read
  recursively, only `*.xml` kept, macOS `._*` files ignored) are converted to one target and
  downloaded as **one zip** that keeps the relative folder structure and original file names
  (`<folder>_<target>.zip`, or `grandMA2-xml_<target>.zip` for loose files). Each file gets a status (ok / warning: mismatch or partial / skipped:
  not grandMA2, no version info, or unsupported encoding); skipped files are listed and never put
  in the zip. The batch source is the **highest** detected version, so the target list offers
  versions older than it; files already at or below the target are copied unchanged. Pure logic
  lives in `src/lib/batch.ts`. A single picked file keeps the plain `.xml` download.

### Version ordering
- Compare versions by the full triple, in order `major → minor → stream`. Used for: dropdown
  filtering (downgrade only), the no-op / "no conversion needed" check.

### Error handling — "fail loud, never silently emit a possibly-broken file"
- File has no `<MA>` tag / is not grandMA2 XML → clear error, no conversion.
- `<MA>` found but version info partial (e.g. `schemaLocation` present but `*_vers` missing, or
  vice versa) → rewrite only what exists (missing fields are **never injected** — see Core
  conversion behaviour), and warn that source version info was incomplete.
- Source version undeterminable (malformed marker) → error, and show the raw detected string so
  the user can judge.
- Input is not UTF-8 (UTF-16/32 BOM, a declaration naming another encoding, or invalid UTF-8
  bytes) → "Unsupported text encoding" error, no conversion. grandMA2 only writes UTF-8 (verified
  across five onPC versions), and accepted input is decoded/encoded so that every byte outside the
  `<MA>` tag round-trips exactly.
- Large files (multi-MB showfile fragments) → no size cap; show a processing state.

### Quality
- **Vitest** unit tests on the core module. Fixtures drawn from the real multi-version XML in
  the sibling `gma2-plugins` repo (2.5.93 / 3.0.0 / 3.3.4 / 3.9.60 / …). Cases: normal
  downgrade, missing version attrs, non-MA error, CRLF/LF + BOM preservation, same-version no-op.
- UI layer: no tests in V1.
- **UI language: English.**

## Future (out of V1 scope)
- **B: content-aware downgrade** — understand per-version schema differences and strip/transform
  elements an older version cannot handle, so the file genuinely loads clean.
- i18n (zh-TW), arbitrary-direction conversion if a use case emerges.

## Version table — DONE
Compiled in `docs/grandma2-versions.md`: distinct header triples for the dropdown (2.5.3 → 3.9.63),
field semantics, gate analysis, and the four priority versions verified
(3.3.4 = 3/3/4, 3.8.0 = 3/8/0, 3.9.0 = 3/9/0, 3.9.60 = 3/9/60, all HIGH confidence); 3.9.63 = 3/9/63
verified from a real 3.9.63.11 export. 2.6.0 / 2.7.0 / 2.9.1 remain inferred (no 2.x software to
test). Custom-triple input remains the escape hatch for beta/interim builds with raw stream counters.

## Verified on real software
End-to-end import tests on onPC 3.3.4.1, 3.7.0.5, 3.9.0.3 and 3.9.60.50 (2026-11-22) are recorded in
`docs/grandma2-versions.md` → "Verified end-to-end on grandMA2 onPC", including the two content
caveats a marker rewrite cannot fix: newer-only elements are skipped on import, and newer
`UserProfiles` can crash a much older onPC.
