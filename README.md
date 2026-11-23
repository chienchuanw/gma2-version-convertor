# gma2-version-convertor

A browser-based tool to **downgrade the version marker** of grandMA2 XML files, so an older
grandMA2 / grandMA2 onPC can load files written by a newer version. A higher-version console can
load lower-version files, but not the reverse — this tool rewrites a newer file's version marker
down to a target you choose.

**Use it:** https://gma2-converter.vercel.app

Everything runs **client-side**: files never leave your machine. This is enforced by a
Content-Security-Policy (`connect-src 'self'`), so the page cannot make network requests to any
other origin — you can verify it in your browser's DevTools.

## What it does (V1)

- Rewrites the `<MA>` tag's `xsi:schemaLocation` path **and** `major_vers`/`minor_vers`/`stream_vers`
  to a target version you select — making the file look like a native export from that console.
- **Precise string replacement only**: every other byte (indentation, CRLF/LF, BOM, encoding,
  attribute order, comments) is preserved. Input must be UTF-8, which is what grandMA2 writes;
  anything else is rejected with a clear error rather than silently re-encoded.
- **Downgrade only.** The source version is auto-detected; you can only target older versions.
- Pick a target from the known-release dropdown, or enter a custom `major.minor.stream` triple.
- Shows a source → target summary with the `<MA>` line before/after, then downloads the result with
  a version suffix (e.g. `Show_3.3.4.xml`) — never overwriting your source.
- **Whole show exports**: pick or drop a folder (e.g. the USB stick after "Export High Show") or
  several files. Every grandMA2 `.xml` inside is converted to one target and downloaded as a zip
  with the same folder structure and file names, ready to copy back for "Import Low Show".
  Non-grandMA2 files are listed as skipped.

## Verified on real grandMA2 software

Converted files were imported on real **grandMA2 onPC 3.3.4.1, 3.7.0.5, 3.9.0.3 and 3.9.60.50**
(sources: 3.9.63.11 and 3.9.60 exports): the original was refused ("File is from a future software
version"), the converted file imported. A full 3.9.63 show export also re-imported into 3.3.4 with
matching object counts. Details and the full matrix:
[`docs/grandma2-versions.md`](./docs/grandma2-versions.md#verified-end-to-end-on-grandma2-onpc).

Things a version-marker rewrite can't fix:

- Elements only the newer version knows are **skipped** by the older one on import (e.g. newer cue
  timing options) — check the result on the target.
- **Don't import newer `UserProfiles`** into a much older version: a 3.9.63 user-profile export
  crashed onPC 3.3.4.1 (#19). The tool warns when you convert a user-profile file; recreate profiles
  on the target instead.
- `.show.gz` files are a **binary** format, not XML, so they can't be converted. Export the show to
  XML on the newer version, convert the files, and import them into the older one.

See [`SPEC.md`](./SPEC.md) for the full specification and
[`docs/grandma2-versions.md`](./docs/grandma2-versions.md) for the version reference.
Development status and milestones live in [`docs/progress.md`](./docs/progress.md).

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Vitest. The conversion core
(`src/lib/convert.ts`) is a pure, framework-free module with unit tests.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # run the core unit tests
```

Branches: feature work goes into **`dev`** via PR; `dev` is merged into **`main`** (production,
auto-deployed to Vercel) only for a tagged release.

## Roadmap (not in V1)

- Content-aware downgrade (transform elements an older schema can't handle).
