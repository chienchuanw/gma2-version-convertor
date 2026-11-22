# Development Progress

_Last updated: 2026-11-22 · Current release: **v1.1.0**_

## Status

**V1.1 is live** at https://gma2-converter.vercel.app (Vercel project
`gma2-converter`, production deployed from `main` via the Git integration).

| Area | State |
| --- | --- |
| Conversion core (`src/lib/convert.ts`) | Done — marker rewrite, hardened detection, diff fields |
| Version catalog (`src/lib/versions.ts`, `docs/grandma2-versions.md`) | Done — 2.5.3 → 3.9.63 |
| Converter UI (`src/app/page.tsx`) | Done — Figma redesign (step cards, diff table, common targets); raw `<MA>` tag, reading state, field-level warnings |
| Privacy guard | Done — CSP `connect-src 'self'` blocks any off-origin request |
| Deployment | Done — production on Vercel |
| Tests | 51 passing (Vitest, core + read-race guard; UI verified in the browser) |

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

## Branch flow

```
feature/fix branch ──PR──▶ dev ──PR (release)──▶ main ──▶ Vercel production + tag vX.Y.Z
```

- `dev`: integration branch; every feature/fix PR targets it.
- `main`: production only — updated from `dev` when a release is ready.
- After each release: tag on `main`, publish the GitHub Release, update this file.

## Open issues (v1.x backlog)

| Type | Issue |
| --- | --- |
| Bug | [#12](https://github.com/chienchuanw/gma2-version-convertor/issues/12) Non-UTF-8 input is silently re-encoded as UTF-8 on download |
| Feat | [#7](https://github.com/chienchuanw/gma2-version-convertor/issues/7) Batch-convert exported showfile XML folders with zip download |
| Doc | [#6](https://github.com/chienchuanw/gma2-version-convertor/issues/6) Verify `.show.gz` format before keeping it on the roadmap |
| Doc | [#8](https://github.com/chienchuanw/gma2-version-convertor/issues/8) Verify downgraded files load on real older grandMA2 software |
| Doc | [#9](https://github.com/chienchuanw/gma2-version-convertor/issues/9) Confirm inferred catalog versions (3.9.63, 2.9.1, 2.7.0, 2.6.0) |

## Next (out of V1 scope)

Tracked in `SPEC.md` → _Future_:

- **B: content-aware downgrade** — strip/transform elements an older schema cannot handle.
- i18n (zh-TW); arbitrary-direction conversion if a use case emerges.
- Reuse the core in an MCP server / VS Code extension.
