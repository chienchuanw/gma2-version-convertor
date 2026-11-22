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

**Verified on real onPC (2026-11-22): the `*_vers` attributes are the gate; the
`xsi:schemaLocation` path is ignored.** Rewriting only `*_vers` makes a refused file import;
rewriting only the schema path leaves it refused. This held on onPC 3.3.4.1, 3.7.0.5, 3.9.0.3 and
3.9.60.50 (see [Verified end-to-end](#verified-end-to-end-on-grandma2-onpc)). Within one
`major.minor` line `stream_vers` alone decides (3.9.63 → refused by 3.9.0 and 3.9.60).

A refused file is not an error on the command line — the feedback is just
`0 object(s) from "<file>.xml" imported.` The system log carries the reason:
`Import Error: File is from a future software version. It cannot be imported.`

The converter still writes all four fields to the same triple, so the output looks exactly like a
native export of the target version.

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
| 3.9.63 | 3 | 9 | 63 | 2026-05 | R |

Notes:
- 3.9.63 was verified from 13 genuine onPC 3.9.63.11 exports (2026-11-22): schema path `3.9.63`,
  `3/9/63`. 3.7.0, 3.9.0 and 3.9.60 were re-confirmed the same way from onPC 3.7.0.5, 3.9.0.3 and
  3.9.60.50 exports.
- **2.6.0, 2.7.0 and 2.9.1 stay inferred.** No 2.x software was available for testing (the test
  machine has onPC 3.3.4.1 → 3.9.63.11 only). The triples follow the release list and the verified 2.5.3 / 2.8.3 pattern;
  the dropdown labels them "— inferred". Confirm from a genuine 2.x export if one turns up.
- **"3.9.60" is a build series** (3.9.60.2 … 3.9.60.91), not a single release. MA continued past it
  to 3.9.61.x and 3.9.63.x (3.9.63.6 released 2026-05-27; 3.9.63.11 seen with build date 2026-09-18). All share their header by stream digit.
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

## Verified end-to-end on grandMA2 onPC

Tested 2026-11-22 on one Windows 11 machine with onPC 3.3.4.1, 3.7.0.5, 3.9.0.3, 3.9.60.50 and
3.9.63.11 installed side by side. Each converted file was produced by this repo's `convert()`
(same decode/encode as the web UI) and imported with `Import "<file>" At Root 13` (macro pool) or
`At Macro N` (single macro). "Refused" = `0 object(s) … imported` + the "future software version"
log line above.

Source: the macro pool (29 macros) exported from the onPC 3.9.63.11 demo show, unless noted.

| Case | Target / onPC | Before conversion | After conversion |
|---|---|---|---|
| Full rewrite | 3.3.4 / 3.3.4.1 | Refused | **Imported** (29 macros) |
| Full rewrite | 3.7.0 / 3.7.0.5 | Refused | **Imported** (29) |
| Full rewrite (stream gate only) | 3.9.0 / 3.9.0.3 | Refused | **Imported** (29) |
| Full rewrite (stream gate only) | 3.9.60 / 3.9.60.50 | Refused | **Imported** (29) |
| `*_vers` only, schema path left at 3.9.63 | all four | — | **Imported** |
| Schema path only, `*_vers` left at 3/9/63 | all four | — | Refused |
| No `xsi:schemaLocation` (only `*_vers`) | 3.3.4 / 3.3.4.1 | — | **Imported** |
| CRLF line endings + UTF-8 BOM | 3.3.4 / 3.3.4.1 | — | **Imported** |
| No BOM | 3.3.4 / 3.3.4.1 | — | **Imported** |
| Real 3.9.60 single-macro file (CRLF, no BOM, 2 macros × 64 lines) | 3.3.4 / 3.3.4.1 | Refused | **Imported** (both, all lines) |
| UTF-16 LE + BOM copy of an importable file | 3.9.60 / 3.9.60.50 | — | Refused (onPC reads UTF-8 only) |

**Full show ("Export High Show" → "Import Low Show")**: the 3.9.63.11 demo show was exported to
13 XML files (`importexport/`, `fixture_layers/`, `library/`), converted to 3.3.4 and re-imported
into an empty onPC 3.3.4.1 show with the macro's command sequence. Every file imported and the
counts match the source: fixture types 5, fixture layers 5, sequences 7, groups 7, macros 29,
effects 34, plus image pool, layouts, presets, executor pages, timecodes and users. Two caveats:

- **`UserProfiles` crashed onPC 3.3.4.1** (`ACCESS_VIOLATION` right after
  `No xml node definition for "ColorWindowSettings" in xml class "UserSettings"`). Don't import
  newer user profiles into a much older version; recreate them on the target instead.
- Elements the older version doesn't know are **skipped with a log warning**, not converted — the
  marker rewrite does not transform content (that is the future "content-aware" phase). Seen on
  3.9.63 → 3.3.4: `CuePart.CuePartPresetTiming` (Sequence), `Slot.media` and
  `FixtureType.EncryptedInfo_` (FixtureType). The objects themselves still imported.
- `FixtureLayers` needs an existing layer to import into (`Error #16: RESIZE FORBIDDEN` in a brand
  new show). That is the "patch a dimmer first" step of the macro's README, not a version issue.

Not tested: a 3.8.0 target (no onPC 3.8 on the test machine) and any 2.x target.

## `.show.gz` is a binary format, not XML

Checked on three real files (onPC 3.9.63.11 save, onPC 3.9.60.50 save, the 3.3.4 "rpu demo show"):

```
$ gunzip -c cvt_saved_3963.show.gz | xxd | head -1
00000000: 4d41 2044 4154 4100 0b3f 0903 0200 0000  MA DATA..?......
$ gunzip -c cvt_saved_3963.show.gz | grep -c '<MA'      # also 0 for '<?xml'
0
```

- A `.show.gz` is gzip around MA's proprietary binary show format: magic `MA DATA\0`, then
  (in 3.9.x saves) the full 4-part version as little-endian bytes at offset 8 — `0b 3f 09 03` =
  3.9.63.11, `32 3c 09 03` = 3.9.60.50. The 2015 demo show has a different value there
  (`00 00 02 01`), so the layout is not stable across versions.
- There is no `<MA>` tag and no XML, so this tool cannot downgrade a `.show.gz`. (Patching the
  binary version bytes was not tested; the body would still be in the newer binary layout.)
- The supported path is the XML export workflow above (export the show to XML → convert the files
  → import them into an empty show on the older version).

## Parser edge cases (from real files)
- A file may have **no `xsi:schemaLocation` attribute at all** while still carrying valid `*_vers`
  (seen in a real 3.9.60 export). Detect source from `*_vers` in that case; on output, rewrite the
  `*_vers` and leave the (absent) schema path absent — stay faithful, don't inject new attributes.
- A file may have `schemaLocation` but **default/junk `*_vers`** (e.g. plugin templates with
  `1/0/0` or `3/0/0`). If path and `*_vers` disagree → surface both to the user; use the **higher**
  of the two as the effective source for the downgrade-only filter; overwrite all to target on convert.
