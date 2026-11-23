# Development Progress

_Last updated: 2026-11-23 · Current release: **v1.2.0**_

## Status

**V1.2 is live** at https://gma2-converter.vercel.app (Vercel project
`gma2-converter`, production deployed from `main` via the Git integration).

| Area | State |
| --- | --- |
| Conversion core (`src/lib/convert.ts`) | Done — marker rewrite, hardened detection, diff fields |
| Version catalog (`src/lib/versions.ts`, `docs/grandma2-versions.md`) | Done — 2.5.3 → 3.9.63; 3.9.63 confirmed from a real export, 2.6.0/2.7.0/2.9.1 still inferred |
| Converter UI (`src/app/page.tsx`) | Done — Figma redesign (step cards, diff table, common targets); raw `<MA>` tag, reading state, field-level warnings; strict UTF-8 input; user-profile caveat; batch / folder → zip |
| Privacy guard | Done — CSP `connect-src 'self'` blocks any off-origin request |
| Real-software verification | Done — converted files load on onPC 3.3.4.1, 3.7.0.5, 3.9.0.3, 3.9.60.50 (see `docs/grandma2-versions.md`) |
| Deployment | Done — production on Vercel |
| Tests | 93 passing (Vitest: core, encoding, caveats, batch, folder walk; UI verified in the browser) |

## Milestones

| Date | PR | Change |
| --- | --- | --- |
| 2026-06-29 | — | Initial scaffold and tested conversion core |
| 2026-06-29 | [#1](https://github.com/chienchuanw/gma2-version-convertor/pull/1) | Version catalog and client-side converter UI |
| 2026-06-29 | [#2](https://github.com/chienchuanw/gma2-version-convertor/pull/2) | Harden version detection: order-independent, quote-flexible, partial-aware |
| 2026-11-22 | [#3](https://github.com/chienchuanw/gma2-version-convertor/pull/3) | UI redesign from Figma; diff table and output kept in lockstep; page-wide drop |
| 2026-11-22 | [#4](https://github.com/chienchuanw/gma2-version-convertor/pull/4) | Privacy CSP header; live URL in README |
| 2026-11-22 | [#5](https://github.com/chienchuanw/gma2-version-convertor/pull/5) | Progress doc; version 0.1.0 → 1.0.0 |
| 2026-11-22 | — | **v1.0.0** released (tag `v1.0.0`, GitHub Release) |
| 2026-11-22 | — | Adopted `dev` → `main` branch flow; `dev` is the GitHub default branch |
| 2026-11-22 | [#15](https://github.com/chienchuanw/gma2-version-convertor/pull/15) | Raw `<MA>` tag on unreadable version, reading state, superseded reads ignored (closes #10, #11) |
| 2026-11-22 | [#16](https://github.com/chienchuanw/gma2-version-convertor/pull/16) | Name missing vs non-numeric `*_vers` fields; exact attribute-name matching (closes #13) |
| 2026-11-22 | — | **v1.1.0** released (tag `v1.1.0`, GitHub Release) |
| 2026-11-22 | [#20](https://github.com/chienchuanw/gma2-version-convertor/pull/20) | Record onPC verification: version gate, `.show.gz` is binary, 3.9.63 header (closes #6, #8, #9) |
| 2026-11-22 | [#21](https://github.com/chienchuanw/gma2-version-convertor/pull/21) | Reject non-UTF-8 input instead of re-encoding it (closes #12) |
| 2026-11-22 | [#22](https://github.com/chienchuanw/gma2-version-convertor/pull/22) | Warn before converting a newer UserProfiles export (closes #19) |
| 2026-11-22 | [#23](https://github.com/chienchuanw/gma2-version-convertor/pull/23) | Batch-convert files or an exported show folder into one zip (closes #7) |
| 2026-11-23 | — | **v1.2.0** released (tag `v1.2.0`, GitHub Release) |

## Branch flow

```
feature/fix branch ──PR──▶ dev ──PR (release)──▶ main ──▶ Vercel production + tag vX.Y.Z
```

- `dev`: integration branch; every feature/fix PR targets it.
- `main`: production only — updated from `dev` when a release is ready.
- After each release: tag on `main`, publish the GitHub Release, update this file.

## Open issues (v1.x backlog)

None — every v1.x issue is closed.

Not yet tested on real software: the 3.8.0 target (no onPC 3.8 available) and any 2.x version.

## Next (out of V1 scope)

Tracked in `SPEC.md` → _Future_:

- **B: content-aware downgrade** — strip/transform elements an older schema cannot handle.
- i18n (zh-TW); arbitrary-direction conversion if a use case emerges.
- Reuse the core in an MCP server / VS Code extension.
