# grandMA2 version reference (for the converter's version table)

## How the `<MA>` header encodes version

grandMA2's software version has **4 parts**: `major.minor.stream.build`. The XML header keeps the
**first three** and drops the 4th (build):

- `major_vers` = major
- `minor_vers` = minor
- `stream_vers` = stream (3rd component) — for clean public releases this equals the patch digit
  (3.3.**4** → 4, 3.9.**60** → 60); interim/beta builds emit large raw counters (e.g. 70, 123, 229).
- `xsi:schemaLocation` path `X.Y.Z` = **the same `major.minor.stream` restated as a URL.** It is a
  nominal label, not a real file — every `http://schemas.malighting.de/grandma2/xml/<v>/MA.xsd`
  returns HTTP 500, so the console never fetches it; it reads the attributes itself.

**In genuine console exports, `schemaLocation` path == `major.minor.stream`, always** (verified
across ~150 real exports, 2012–2026). Mismatches occur **only** in hand-authored plugin descriptors
and MA self-test files (in this workspace: `api_test.xml`, `LayoutFX_MAte.xml`,
`MIDI-Twister*.xml`, `Presets_to_Offsets_v1.2.3.xml`), where authors hardcoded a stray header. A
path ≠ attribute mismatch is therefore a reliable signal the file is **not** a clean console export.

→ Converter rule (validated): set the schema path **and** all three `*_vers` to the **same** target
triple, matching what the destination console natively writes.

## Which field gates loading?

A version value in the header gates import — editing it can make a refused file load
(forum thread 67655: refusal is "profile written in a … higher version than the console", fixed by
"hack[ing] the correct version into the .XML"). No MA source isolates `stream_vers` *specifically*
as the gate, but when moving a file between builds of the same major.minor line, `stream_vers` is
the only attribute that differs — so it is the de-facto discriminator in the most common scenario.
Setting all four consistently covers the gate regardless.

## Distinct header triples (the dropdown options)

Keyed by `(major, minor, stream)` — the header drops the 4th build digit, so all `3.9.60.x` builds
share one header `3/9/60`. Confidence: **R** = verified from a real export header; **I** = inferred
from the release list / pattern (triple is certain, just no captured export header).

| Label | major | minor | stream | First shipped | Conf |
|---|---|---|---|---|---|
| 2.5.3 | 2 | 5 | 3 | 2012-01 | R |
| 2.6.0 | 2 | 6 | 0 | 2012-06 | I |
| 2.7.0 | 2 | 7 | 0 | 2013-01 | I |
| 2.8.3 | 2 | 8 | 3 | 2013-04 | R |
| 2.9.1 | 2 | 9 | 1 | 2014-02 | I |
| 3.0.0 | 3 | 0 | 0 | 2014-10 | R |
| 3.1.0 | 3 | 1 | 0 | 2014-12 | R |
| 3.1.1 | 3 | 1 | 1 | 2015 | R |
| 3.1.2 | 3 | 1 | 2 | 2015-01 | R |
| 3.2.2 | 3 | 2 | 2 | 2016-06 | R |
| 3.3.2 | 3 | 3 | 2 | 2017-05 | R |
| **3.3.4** | 3 | 3 | 4 | 2017-09 | R |
| 3.4.0 | 3 | 4 | 0 | 2018-07 | R |
| 3.5.0 | 3 | 5 | 0 | 2018-11 | R |
| 3.6.1 | 3 | 6 | 1 | 2019-01 | R |
| 3.7.0 | 3 | 7 | 0 | 2019-04 | R |
| **3.8.0** | 3 | 8 | 0 | 2019-12 | R |
| **3.9.0** | 3 | 9 | 0 | 2020-04 | R |
| 3.9.51 | 3 | 9 | 51 | 2020-07 | R |
| **3.9.60** | 3 | 9 | 60 | 2020-09 | R |
| 3.9.61 | 3 | 9 | 61 | 2025-07 | R |
| 3.9.63 | 3 | 9 | 63 | 2026-05 | I |

Notes:
- **"3.9.60" is a build series** (3.9.60.2 … 3.9.60.91), not a single release. MA continued past it
  to 3.9.61.x and the current **3.9.63.6 (2026-05-27)**. All share their header by stream digit.
- No public 3.6.0 (line jumped 3.5.0.6 → 3.6.1.1). 3.8 shipped as 3.8.0.0.
- Beta/interim exports can carry raw stream counters (e.g. 3.1.229, 2.8.123) — the **custom triple
  input** is the escape hatch for anything not in this list.
- ⚠️ The `chienchuanw/gma2-macros` README reportedly claims 3.9.60 → `stream_vers="0"`. That is
  **wrong**; every real 3.9.60 export is `stream=60`.

## The four priority targets (all HIGH confidence)

| Software | major | minor | stream | schema path |
|---|---|---|---|---|
| 3.3.4 | 3 | 3 | 4 | 3.3.4 |
| 3.8.0 | 3 | 8 | 0 | 3.8.0 |
| 3.9.0 | 3 | 9 | 0 | 3.9.0 |
| 3.9.60 | 3 | 9 | 60 | 3.9.60 |

## Parser edge cases (from real files)
- A file may have **no `xsi:schemaLocation` attribute at all** while still carrying valid `*_vers`
  (seen in a real 3.9.60 export). Detect source from `*_vers` in that case; on output, rewrite the
  `*_vers` and leave the (absent) schema path absent — stay faithful, don't inject new attributes.
- A file may have `schemaLocation` but **default/junk `*_vers`** (e.g. plugin templates with
  `1/0/0` or `3/0/0`). If path and `*_vers` disagree → surface both to the user; use the **higher**
  of the two as the effective source for the downgrade-only filter; overwrite all to target on convert.
