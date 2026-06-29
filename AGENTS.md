<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# gma2-version-convertor

A **client-side** browser tool that downgrades the version marker of grandMA2 XML files so older
consoles can load newer files. Full spec: `SPEC.md`. Version reference: `docs/grandma2-versions.md`.

## Architecture
- **Conversion core is framework-free**: `src/lib/convert.ts` is pure TS (string in → string out),
  unit-tested with Vitest (`src/lib/convert.test.ts`). Keep all conversion logic here, not in
  React components, so it stays testable and reusable (future MCP server / VS Code extension).
- The Next.js UI is a thin layer that calls the core. All work happens in the browser — no server
  routes, no uploads.

## The core rule
A grandMA2 `<MA>` tag carries the version as `major.minor.stream` (4th "build" digit dropped) and
restates it in the `xsi:schemaLocation` path. Conversion rewrites **the schema path + all three
`*_vers` to the same target triple**, via **precise string replacement on the opening `<MA>` tag
only** — every other byte is preserved (CRLF/LF, BOM, encoding, attribute order, comments). Never
parse-and-reserialize the whole document. Downgrade only.

## Workflow
- TDD the core: write the failing Vitest test first, watch it fail, then implement. `npm test`.
- Git: default branch `main`; never commit directly to `main` for feature work — branch + PR. The
  remote is `origin` (git@github.com:chienchuanw/gma2-version-convertor.git).
