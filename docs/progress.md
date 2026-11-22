# Development Progress

_Last updated: 2026-11-22 · Current release: **v1.0.0**_

## Status

**V1 is complete and live** at https://gma2-converter.vercel.app (Vercel project
`gma2-converter`, deployed from `main` via the Git integration).

| Area | State |
| --- | --- |
| Conversion core (`src/lib/convert.ts`) | Done — marker rewrite, hardened detection, diff fields |
| Version catalog (`src/lib/versions.ts`, `docs/grandma2-versions.md`) | Done — 2.5.3 → 3.9.63 |
| Converter UI (`src/app/page.tsx`) | Done — Figma redesign (step cards, diff table, common targets) |
| Privacy guard | Done — CSP `connect-src 'self'` blocks any off-origin request |
| Deployment | Done — production on Vercel |
| Tests | 37 passing (Vitest, core only; UI untested by design in V1) |

## Milestones

| Date | PR | Change |
| --- | --- | --- |
| 2026-06-29 | — | Initial scaffold and tested conversion core |
| 2026-06-29 | [#1](https://github.com/chienchuanw/gma2-version-convertor/pull/1) | Version catalog and client-side converter UI |
| 2026-06-29 | [#2](https://github.com/chienchuanw/gma2-version-convertor/pull/2) | Harden version detection: order-independent, quote-flexible, partial-aware |
| 2026-11-22 | [#3](https://github.com/chienchuanw/gma2-version-convertor/pull/3) | UI redesign from Figma; diff table and output kept in lockstep; page-wide drop |
| 2026-11-22 | [#4](https://github.com/chienchuanw/gma2-version-convertor/pull/4) | Privacy CSP header; live URL in README |
| 2026-11-22 | — | **v1.0.0** released |

## Next (out of V1 scope)

Tracked in `SPEC.md` → _Future_:

- **B: content-aware downgrade** — strip/transform elements an older schema cannot handle.
- `.show.gz` support (decompress → rewrite → recompress).
- Batch / multi-file conversion with zip download.
- i18n (zh-TW); arbitrary-direction conversion if a use case emerges.
- Reuse the core in an MCP server / VS Code extension.
