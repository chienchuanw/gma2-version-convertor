# gma2-version-convertor

A browser-based tool to **downgrade the version marker** of grandMA2 XML files, so an older
grandMA2 / grandMA2 onPC can load files written by a newer version. A higher-version console can
load lower-version files, but not the reverse — this tool rewrites a newer file's version marker
down to a target you choose.

Everything runs **client-side**: files never leave your machine. Deployed on Vercel.

## What it does (V1)

- Rewrites the `<MA>` tag's `xsi:schemaLocation` path **and** `major_vers`/`minor_vers`/`stream_vers`
  to a target version you select — making the file look like a native export from that console.
- **Precise string replacement only**: every other byte (indentation, CRLF/LF, BOM, encoding,
  attribute order, comments) is preserved.
- **Downgrade only.** The source version is auto-detected; you can only target older versions.
- Pick a target from the known-release dropdown, or enter a custom `major.minor.stream` triple.
- Shows a source → target summary with the `<MA>` line before/after, then downloads the result with
  a version suffix (e.g. `Show_3.3.4.xml`) — never overwriting your source.

See [`SPEC.md`](./SPEC.md) for the full specification and
[`docs/grandma2-versions.md`](./docs/grandma2-versions.md) for the version reference.

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Vitest. The conversion core
(`src/lib/convert.ts`) is a pure, framework-free module with unit tests.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # run the core unit tests
```

## Roadmap (not in V1)

- Content-aware downgrade (transform elements an older schema can't handle).
- `.show.gz` (gzipped showfile) support.
- Batch / multi-file conversion with zip download.
