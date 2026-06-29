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

A higher-version console can load a lower-version file, but not vice versa. The gate is a version
value in the header (editing it makes a refused file load); when moving between builds of the same
`major.minor` line, `stream_vers` is the only differing attribute, so it is the de-facto gate.
Writing all parts consistently covers it regardless. The real-world need is *downgrading*:
new file → old console.

## V1 Scope — "naive marker rewrite"

V1 only rewrites the version marker; it does **not** transform file content to match an older
schema. (Content-aware downgrade is a deliberate future phase "B".)

### Core conversion behaviour
- Rewrite, on the `<MA>` tag: the `schemaLocation` path version **and** all three `*_vers`
  attributes, **all set to the same target version triple** — making the file look exactly like
  a native export from the target console. (`stream_vers` is the de-facto gate, but writing all
  parts consistently is the safest, most native-looking result.)
- Each version field is rewritten **in place**: `*_vers` attributes are matched individually
  (order-independent, single- or double-quoted) so a reordered file can never silently leave the
  `stream_vers` gate un-lowered. Only fields that are **present** are rewritten; missing fields are
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
- Input: **drag-and-drop + click-to-pick**. V1 accepts **`.xml` only** (future: `.show.gz`,
  which is gzipped XML — the string-in/string-out core makes adding a decompress/recompress
  layer straightforward).
- Target version: **dropdown of known releases (as complete as discoverable)** as primary,
  **custom major/minor/stream input** as fallback. Common targets surfaced first:
  `3.3.4`, `3.8.0`, `3.9.0`, `3.9.60` (exact triples pending research verification).
- Before download: show a **"source version → target version" summary** plus the `<MA>` line
  **before/after**.
- Output filename gets a **target-version suffix** (`Name_3.3.4.xml`) — never overwrites the
  source.
- **Single file** in V1; architecture leaves room for **batch** (UI-level loop + zip) later.

### Version ordering
- Compare versions by the full triple, in order `major → minor → stream`. Used for: dropdown
  filtering (downgrade only), the no-op / "no conversion needed" check.

### Error handling — "fail loud, never silently emit a possibly-broken file"
- File has no `<MA>` tag / is not grandMA2 XML → clear error, no conversion.
- `<MA>` found but version info partial (e.g. `schemaLocation` present but `*_vers` missing, or
  vice versa) → rewrite what exists, fill in what's missing, warn that source version info was
  incomplete.
- Source version undeterminable (malformed marker) → error, and show the raw detected string so
  the user can judge.
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
- `.show.gz` support (decompress → rewrite → recompress).
- Batch / multi-file conversion with zip download.
- i18n (zh-TW), arbitrary-direction conversion if a use case emerges.

## Version table — DONE
Compiled in `docs/grandma2-versions.md`: distinct header triples for the dropdown (2.5.3 → 3.9.63),
field semantics, gate analysis, and the four priority versions verified
(3.3.4 = 3/3/4, 3.8.0 = 3/8/0, 3.9.0 = 3/9/0, 3.9.60 = 3/9/60, all HIGH confidence). Custom-triple
input remains the escape hatch for beta/interim builds with raw stream counters.
