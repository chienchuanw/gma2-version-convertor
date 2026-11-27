# gma2 tools hub — Phase 1 (hub + re-based tools) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve both tools under one site, `https://gma2.chienchuanw.com` (`/convert`, `/form`), with a hub home page, and 308-redirect the old `*.vercel.app` URLs there. No ads, no guides (Phases 2–3 get their own plans).

**Architecture:** A new private Next.js app (`gma2-hub`) owns the domain and proxies `/convert*` and `/form*` with `rewrites` to each tool's Vercel project via a dedicated public origin hostname (Next.js multi-zones pattern). The convertor gets `basePath: '/convert'`; form-helper gets Vite `base: '/form/'` and the hub strips the prefix. Each tool redirects requests whose Host is its legacy hostname.

**Tech Stack:** Next.js 16.2.9 + React 19.2.4 + Tailwind 4 + Vitest (hub, convertor); Vite 8 + React 19 + Vitest (form-helper); Vercel (team Take Two Studio); Cloudflare DNS.

**Spec:** `docs/superpowers/specs/2026-11-27-gma2-hub-adsense-design.md` (sections 1–3, "Who does what", Phase 1).

## Global Constraints

- Hub URL: `https://gma2.chienchuanw.com`. Tool paths: `/convert`, `/form`.
- Origin hostnames: `gma2-converter-origin.vercel.app` (project `gma2-converter`), `gma2-form-helper-origin.vercel.app` (project `gma2-form-helper`). If a name is taken, pick the closest free `*-origin.vercel.app` and use it everywhere below.
- Legacy hostnames: `gma2-converter.vercel.app`, `gma2-form-helper.vercel.app` → 308 to the hub path, path preserved.
- Hub repo is **private** (`chienchuanw/gma2-hub`), `dev` default branch, `main` production — same git flow as the tools.
- Next.js code: read the matching page in `node_modules/next/dist/docs/` before writing (AGENTS.md rule). Pin `next@16.2.9`, `react@19.2.4`, `react-dom@19.2.4` in the hub.
- Conversion core (`src/lib/convert.ts`) and form-helper `src/core/` are not touched.
- Commits: no `Co-Authored-By` trailer, no generated-by line (user rule). Branches/PRs: feature branch → PR into `dev`; release PR `dev` → `main`. Never `--force`; ask before creating a branch whose name is not in this plan.
- Every outward step in Task 5 (repo creation, Vercel/DNS changes, merges, releases) needs the owner's go-ahead at that moment.

## Review Focus

1. **Legacy URL with the new prefix already in it** (`gma2-converter.vercel.app/convert/x`) must land on `…/convert/x`, not `…/convert/convert/x`. → tests in Task 1 and Task 2.
2. **`/form` without trailing slash and deep paths** (`/form`, `/form/`, `/form/assets/<hash>.js`, `/form/favicon.svg`) must all resolve through the hub. → Task 4 checks.
3. **Static assets of both tools** (Next `_next/static`, `icon.svg`, Vite `assets/`, `favicon.svg`) must load under the prefix with no 404 in the browser console. → Task 1/2 build checks, Task 4.
4. **Hub CSP must not apply to tool paths** (it would later block AdSense on tool pages and today doubles the header). → test in Task 3, curl in Task 4.
5. **Origin hostnames must not redirect** (otherwise hub → origin → hub loop) and must not be SSO-protected. → Task 1/2 tests (rules are host-scoped), Task 5 curls.

---

## Repo A — `gma2-version-convertor` (branch `feat/serve-under-convert`, cut from `dev`)

### Task 1: Serve the convertor under `/convert`

**Files:**
- Modify: `next.config.ts` (add `basePath`, `redirects()`; keep CSP and its comment)
- Modify: `src/app/layout.tsx` (metadata `metadataBase`, `alternates.canonical`)
- Modify: `src/components/ui.tsx` `Header()` (add hub link)
- Modify: `README.md` (web app URL → `https://gma2.chienchuanw.com/convert`; note old URL redirects)
- Create: `src/next-config.test.ts`

**Interfaces:**
- Produces: production app answers at `/convert` on any host; Host `gma2-converter.vercel.app` → 308 to hub.

- [ ] **Step 1: Write the failing test** `src/next-config.test.ts` (imports `../next.config`):

```ts
const LEGACY = [{ type: "host", value: "gma2-converter.vercel.app" }];
it("serves under /convert", () => expect(config.basePath).toBe("/convert"));
it("redirects the legacy host, prefixed paths first", async () => {
  expect(await config.redirects!()).toEqual([
    { source: "/convert/:path*", has: LEGACY, basePath: false, permanent: true,
      destination: "https://gma2.chienchuanw.com/convert/:path*" },
    { source: "/:path*", has: LEGACY, basePath: false, permanent: true,
      destination: "https://gma2.chienchuanw.com/convert/:path*" },
  ]);
});
it("keeps the CSP", async () => {
  const [rule] = await config.headers!();
  expect(rule.headers[0].value).toContain("connect-src 'self'");
});
```

- [ ] **Step 2: Run** `npx vitest run src/next-config.test.ts` → FAIL (`basePath` undefined).
- [ ] **Step 3: Implement** in `next.config.ts`: `basePath: "/convert"` and `redirects()` returning exactly the two rules above (order matters: first match wins). Read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md` ("Redirects with basePath support", `has` host).
- [ ] **Step 4: Run** `npm test` → all PASS.
- [ ] **Step 5: Canonical + hub link.** `layout.tsx` metadata: `metadataBase: new URL("https://gma2.chienchuanw.com")`, `alternates: { canonical: "/convert" }`. `Header()`: add a small text link `gma2 tools` → `https://gma2.chienchuanw.com/` (absolute plain `<a>`, same style as the GitHub link, left of it).
- [ ] **Step 6: Build check.** `npm run build && npx next start -p 3001`, then:
  - `curl -s -o /dev/null -w '%{http_code}' localhost:3001/convert` → `200`
  - `curl -s localhost:3001/convert | grep -o '<link rel="canonical" href="[^"]*"'` → `href="https://gma2.chienchuanw.com/convert"` (if Next prefixed it twice or not at all, fix the metadata value, not the test)
  - `curl -s localhost:3001/convert | grep -c '/convert/_next/static'` → ≥ 1
  - `curl -sI -H 'Host: gma2-converter.vercel.app' localhost:3001/foo | grep -iE '^(HTTP|location)'` → `308`, `location: https://gma2.chienchuanw.com/convert/foo`
  - same with path `/convert/foo` → `location: https://gma2.chienchuanw.com/convert/foo`
  - `curl -s -o /dev/null -w '%{http_code}' -H 'Host: gma2-converter-origin.vercel.app' localhost:3001/convert` → `200`
- [ ] **Step 7: Lint + commit.** `npm run lint` clean. `git commit -m "Serve the converter under /convert and redirect the old URL"`. Push, open PR into `dev` (do not merge until Task 5).

---

## Repo B — `gma2-form-helper` (branch `feat/serve-under-form`, cut from `dev`; Vercel Root Directory is `web/`)

### Task 2: Serve form-helper under `/form`

**Files:**
- Modify: `web/vite.config.ts` (`base: '/form/'`)
- Create: `web/vercel.json` (legacy redirects)
- Modify: `web/index.html` (canonical link)
- Modify: `web/src/App.tsx` header + `web/src/i18n.ts` (hub link, key `hubLink`: en `gma2 tools`, zh-TW `gma2 工具`)
- Modify: `README.md` (web app URL → `https://gma2.chienchuanw.com/form`)
- Create: `web/src/deploy-config.test.ts`

**Interfaces:**
- Produces: `dist/` whose asset URLs start with `/form/`, served at the origin's root (the hub strips `/form`); Host `gma2-form-helper.vercel.app` → 308 to hub.

- [ ] **Step 1: Write the failing test** `web/src/deploy-config.test.ts` (read `../vercel.json` with `fs`, import `../vite.config`):

```ts
const LEGACY = [{ type: "host", value: "gma2-form-helper.vercel.app" }];
it("builds for /form/", () => expect(viteConfig.base).toBe("/form/"));
it("redirects the legacy host, prefixed paths first", () => {
  expect(vercel.redirects).toEqual([
    { source: "/form/:path*", has: LEGACY, permanent: true,
      destination: "https://gma2.chienchuanw.com/form/:path*" },
    { source: "/:path*", has: LEGACY, permanent: true,
      destination: "https://gma2.chienchuanw.com/form/:path*" },
  ]);
});
it("has a hub link string in both languages", () => {
  expect(STRINGS.en.hubLink).toBe("gma2 tools");
  expect(STRINGS["zh-TW"].hubLink).toBe("gma2 工具");
});
```

- [ ] **Step 2: Run** `cd web && npx vitest run src/deploy-config.test.ts` → FAIL.
- [ ] **Step 3: Implement** `base: '/form/'`, `web/vercel.json` with exactly those `redirects` (plus `"$schema": "https://openapi.vercel.sh/vercel.json"`), the `hubLink` strings, and in the `app-header` a plain `<a href="https://gma2.chienchuanw.com/">{t.hubLink}</a>` before the language picker. `index.html`: `<link rel="canonical" href="https://gma2.chienchuanw.com/form/" />`. If `test`'s tsconfig rejects importing `vite.config.ts` or `vercel.json`, add it to `tsconfig.test.json` includes rather than changing the test.
- [ ] **Step 4: Run** `npm test && npm run typecheck && npm run lint` → PASS / clean.
- [ ] **Step 5: Build check.** `npm run build`, then:
  - `grep -o 'src="/form/assets/[^"]*"' dist/index.html` → one match
  - `grep -o 'href="/form/favicon.svg"' dist/index.html` → one match
  - `test -f dist/favicon.svg && ls dist/assets` → files at dist root (served at origin root)
- [ ] **Step 6: Commit** `git commit -m "Serve the form helper under /form and redirect the old URL"`. Push, open PR into `dev` (do not merge until Task 5).

---

## Repo C — `gma2-hub` (new, `~/Documents/gma2-hub`)

### Task 3: Hub app with tool rewrites

**Files:**
- Create: Next.js app (App Router, TS, Tailwind 4, ESLint, `src/` dir) pinned as in Global Constraints; add `vitest` (node env, `include: ["src/**/*.test.ts?(x)"]`) and `"test": "vitest run"`.
- Create: `AGENTS.md` + `CLAUDE.md` (`@AGENTS.md`) — copy the convertor's Next.js-docs warning and git-flow section, adapted (no conversion-core section).
- Create: `src/lib/tools.ts`, `src/lib/tools.test.ts`
- Create: `next.config.ts`, `src/next-config.test.ts`

**Interfaces:**
- Produces (`src/lib/tools.ts`):
  - `type Tool = { slug: "convert" | "form"; name: string; description: string; origin: string; keepPrefix: boolean }`
  - `TOOLS: Tool[]` — convert: name `Version Converter`, description `Downgrade grandMA2 XML files so older consoles can load them.`, origin `process.env.CONVERT_ORIGIN ?? "https://gma2-converter-origin.vercel.app"`, `keepPrefix: true`; form: name `Form Helper`, description `Draw an effect Form and get the exact Graph Editor values.`, origin `process.env.FORM_ORIGIN ?? "https://gma2-form-helper-origin.vercel.app"`, `keepPrefix: false`.
  - `toolRewrites(tools: Tool[]): { source: string; destination: string }[]`
  - `HUB_CSP: string` — same directives as the convertor's CSP today.

- [ ] **Step 1: Scaffold + private repo.** Create the app, commit on `main`, `gh repo create chienchuanw/gma2-hub --private --source . --push`, create and push `dev`, set `dev` as default branch (`gh repo edit --default-branch dev`). Then branch `feat/hub-skeleton` from `dev`. *(Owner go-ahead before `gh repo create`.)*
- [ ] **Step 2: Write the failing tests.** `src/lib/tools.test.ts`:

```ts
const t = (o: Partial<Tool>) => ({ name: "", description: "", ...o }) as Tool;
expect(toolRewrites([t({ slug: "convert", origin: "https://c", keepPrefix: true })])).toEqual([
  { source: "/convert", destination: "https://c/convert" },
  { source: "/convert/:path+", destination: "https://c/convert/:path+" },
]);
expect(toolRewrites([t({ slug: "form", origin: "https://f", keepPrefix: false })])).toEqual([
  { source: "/form", destination: "https://f/" },
  { source: "/form/:path+", destination: "https://f/:path+" },
]);
// defaults when env is unset
expect(TOOLS.map((x) => x.origin)).toEqual([
  "https://gma2-converter-origin.vercel.app", "https://gma2-form-helper-origin.vercel.app"]);
```

  `src/next-config.test.ts`: `rewrites()` equals `toolRewrites(TOOLS)`; `headers()` is one rule with `source === "/((?!convert(?:/|$)|form(?:/|$)).*)"` (every path except the tool paths) and a `Content-Security-Policy` header equal to `HUB_CSP`. Whether Next actually matches it that way is checked by curl in Task 4.
- [ ] **Step 3: Run** `npm test` → FAIL.
- [ ] **Step 4: Implement** `tools.ts` and `next.config.ts` (`rewrites: async () => toolRewrites(TOOLS)`, `headers` as above). Read `node_modules/next/dist/docs/01-app/02-guides/multi-zones.md` and the `rewrites.md` / `headers.md` config pages first. If Next rejects the header `source` pattern, choose the nearest form it accepts and update the test — the Task 4 curl is the real check.
- [ ] **Step 5: Run** `npm test && npm run lint && npm run build` → PASS.
- [ ] **Step 6: Commit** `git commit -m "Proxy /convert and /form to the tool projects"`.

### Task 4: Hub home page + local integration check

**Files:**
- Modify: `src/app/globals.css` (copy the convertor's design tokens and Tailwind theme mapping from `gma2-version-convertor/src/app/globals.css`)
- Modify: `src/app/layout.tsx` (Geist fonts as in convertor; metadata title `gma2 tools — free grandMA2 utilities`, description `Free, browser-based tools for grandMA2 programmers.`, `metadataBase: new URL("https://gma2.chienchuanw.com")`, `alternates.canonical: "/"`)
- Create: `src/components/site-header.tsx` (`SiteHeader()`: site name `gma2 tools` linking `/`), `src/components/site-footer.tsx` (`SiteFooter()`: `© <year> chienchuanw` + GitHub profile link `https://github.com/chienchuanw`)
- Modify: `src/app/page.tsx` (heading, one card per `TOOLS` entry: name, description, plain `<a href={"/" + slug}>Open</a>` — not `<Link>`, cross-zone)
- Create: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `TOOLS` from Task 3.

- [ ] **Step 1: Failing test** `page.test.tsx`: `renderToStaticMarkup(<Home />)` contains `href="/convert"`, `href="/form"`, `Version Converter`, `Form Helper`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** page, header, footer, styles (visual language of the convertor: 640–720px column, tokens, cards with `border-line`). **Step 4: Run** `npm test && npm run lint` → PASS.
- [ ] **Step 5: Local integration** (all three on their feature branches):
  - convertor: `npm run build && npx next start -p 3001`
  - form-helper: `cd web && npm run build && npx serve@14 dist -l 4173` (static at root, as in production)
  - hub: `CONVERT_ORIGIN=http://localhost:3001 FORM_ORIGIN=http://localhost:4173 npm run build && npx next start -p 3000`
  - curls on `localhost:3000` — expect `200` for `/`, `/convert`, `/form`, `/form/`, `/form/favicon.svg`, and for the first `/convert/_next/static/...` and `/form/assets/...` URL found in each page's HTML.
  - `curl -sI localhost:3000/ | grep -ci content-security-policy` → `1`; `curl -sI localhost:3000/convert | grep -ci content-security-policy` → `1` (the convertor's own, not doubled); `/form` → `0` (form-helper sets none today).
  - Browser (Playwright): open `localhost:3000/convert`, upload a sample XML from the convertor's test fixtures, download works, no console errors; open `localhost:3000/form`, draw a point, no console errors; hub link in both tools points to `https://gma2.chienchuanw.com/`.
- [ ] **Step 6: Commit** `git commit -m "Add the hub home page"`, push, open PR into `dev`.

---

### Task 5: Rollout (ops — owner go-ahead at each numbered step)

- [ ] **1. Hub to production.** Merge hub PR into `dev`, release PR `dev` → `main`. Create Vercel project `gma2-hub` in team Take Two Studio linked to `chienchuanw/gma2-hub`, production branch `main`. Verify the deployment builds.
- [ ] **2. Domain.** Add `gma2.chienchuanw.com` to `gma2-hub`; read the CNAME target Vercel shows. **Owner** adds the CNAME in Cloudflare, proxy **off** (DNS only). Verify: `curl -sI https://gma2.chienchuanw.com/` → `200`, valid cert.
- [ ] **3. Origin domains.** Add `gma2-converter-origin.vercel.app` to project `gma2-converter` and `gma2-form-helper-origin.vercel.app` to `gma2-form-helper` (production). Verify each: `curl -s -o /dev/null -w '%{http_code}' https://<origin>/` → `200` (not `302` to `vercel.com/sso-api`).
- [ ] **4. Release the tools.** Merge Task 1 and Task 2 PRs into `dev`; release PRs `dev` → `main` in each repo; tag convertor `v1.3.0` and form-helper per its tag history (`v0.2.0`), publish GitHub Releases; update convertor `docs/progress.md`.
- [ ] **5. Production verification.**
  - `https://gma2.chienchuanw.com/convert` and `/form` → `200`, tools work in a browser, no console errors.
  - `curl -sI https://gma2-converter.vercel.app/` → `308`, `location: https://gma2.chienchuanw.com/convert/`; same for `gma2-form-helper.vercel.app` → `/form/`.
  - `curl -sI https://gma2-converter-origin.vercel.app/convert` → `200` (no redirect).
- [ ] **6. Report** to the owner: live URLs, anything that deviated from this plan.
