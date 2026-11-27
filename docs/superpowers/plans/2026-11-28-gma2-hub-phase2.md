# gma2 tools hub — Phase 2 (guides, about, privacy, analytics) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `https://gma2.chienchuanw.com` real content: five guides, an About page, a Privacy page, a sitemap, and site-wide page-view analytics. This gets the site ready for the AdSense application in Phase 3 and brings in search traffic.

**Architecture:** Guides are MDX files in the hub (`@next/mdx`), listed in one `GUIDES` registry. The registry drives the guide routes, the guides index, the home page and the sitemap. Vercel Web Analytics is enabled on the **hub** project only, and all three apps point their `<Analytics>` at the hub's same-origin endpoint, so the whole site reports to one dashboard and the tools' `connect-src 'self'` CSP still holds.

**Tech Stack:** Next.js 16.2.9 + `@next/mdx` (hub), `@vercel/analytics` 2.x (all three apps), Vitest, Playwright for screenshots and checks.

**Spec:** `docs/superpowers/specs/2026-11-27-gma2-hub-adsense-design.md` (§4 Content, §6 Measuring, Phase 2). Phase 1 plan: `docs/superpowers/plans/2026-11-27-gma2-hub-phase1.md`.

## Global Constraints

- Site URL `https://gma2.chienchuanw.com`. English only in this phase.
- Operator shown on About and Privacy: the owner personally. Display name `chienchuanw` (owner-confirmed 2026-11-28). Contact: `chienchuanwww@gmail.com`. Do not mention Spot On or Take Two Studio.
- Guide accuracy: every factual claim must trace to a source doc listed in Task 3. If a source doesn't support a claim, leave it out. The owner reviews all guide text in the PR before merge; this is a hard gate.
- No ads, no AdSense script, no cookies in this phase. Analytics = Vercel Web Analytics only (cookieless).
- Tool CSPs stay `connect-src 'self'`; analytics must use same-origin URLs (`/_vercel/insights/...` on the hub domain).
- Next.js code: read the relevant page in `node_modules/next/dist/docs/` first (`01-app/02-guides/mdx.md`, the `sitemap.md` and `robots.md` metadata files).
- Git: one issue and one `issues/N` branch per repo, PRs into `dev`, release PRs `dev` → `main` with merge commits (converter, hub). form-helper is released with `vercel deploy --prod` from a temp worktree of `origin/dev`; never touch the owner's main checkout. No `Co-Authored-By` lines and no generated-by footers.
- Production steps (Task 7) need the owner's go-ahead.

## Review Focus

1. **Analytics on proxied tool pages must reach the hub's endpoint.** If a tool page loads `/_vercel/insights/script.js` from its own origin, or one prefixed with the basePath, it 404s or splits the stats. Fixed by passing `scriptSrc`/`endpoint` explicitly in Task 6 and checking the network requests in production in Task 7.
2. **Guide claims beyond the sources.** Handled by the owner's review gate in Task 3 and a source line under each guide.
3. **Unknown guide slug.** `/guides/nope` must return 404, not a blank page. Test in Task 2 (`dynamicParams = false`) plus a curl check in Task 7.
4. **Guide canonical URLs.** Each guide's canonical must be its own `/guides/<slug>`. Test in Task 2.
5. **Converter copy that becomes untrue.** The footer says "No uploads, no analytics." Fixed and tested in Task 6.

---

## Repo: gma2-hub (issue "feat: Guides, about, privacy, sitemap and analytics")

### Task 1: Site shell: navigation and site constants

**Files:** Create `src/lib/site.ts`. Modify `src/components/site-header.tsx` and `src/components/site-footer.tsx`. Test: `src/components/site-chrome.test.tsx`.

**Interfaces:** Produces `SITE_URL = "https://gma2.chienchuanw.com"`, `OWNER_NAME = "chienchuanw"` and `CONTACT_EMAIL = "chienchuanwww@gmail.com"`, all from `src/lib/site.ts`.

- [ ] Write a failing test. The header renders links `href="/"` (site name), `href="/#tools"` ("Tools") and `href="/guides"` ("Guides"). The footer renders `href="/about"`, `href="/privacy"` and `mailto:chienchuanwww@gmail.com`.
- [ ] Run it and see it fail. Implement with `<Link>` for in-zone links. Give the tool list on the home page `id="tools"`. Run `npm test`, see it pass, then commit.

### Task 2: Guide infrastructure

**Files:**
- Create `mdx-components.tsx` (styles h2/h3/p/ul/ol/table/code/img/a with the site tokens; links to `/convert` or `/form` stay plain `<a>`).
- Create `src/lib/guides.ts`, `src/app/guides/page.tsx` and `src/app/guides/[slug]/page.tsx`.
- Modify `next.config.ts` (wrap with `createMDX`, add `pageExtensions` per the MDX guide).
- Create `src/components/tool-cta.tsx`.
- Tests: `src/lib/guides.test.ts` and `src/app/guides/guides.test.tsx`.

**Interfaces:**
- `type Guide = { slug: string; title: string; description: string; tool: Tool["slug"] }`
- `GUIDES: Guide[]` (order = display order) and `getGuide(slug: string): Guide | undefined`.
- Content lives at `src/content/guides/<slug>.mdx`. The guide page imports it dynamically, per the "Using dynamic imports" section of the MDX guide.
- `generateStaticParams()` returns the slugs from `GUIDES`, and `dynamicParams = false`.
- `generateMetadata({ params })` returns `{ title: guide.title, description: guide.description, alternates: { canonical: "/guides/" + slug } }`.
- `ToolCta({ tool }: { tool: Tool["slug"] })` renders a card with the tool's name and a plain `<a href={"/" + tool}>`. Each guide page renders it after the content.

- [ ] Write failing tests:
  - Every `GUIDES` slug has a matching `.mdx` file and every `.mdx` file has a `GUIDES` entry (use `fs.readdirSync`).
  - Slugs are unique and kebab-case.
  - `generateStaticParams()` equals the slug list.
  - `generateMetadata` gives the right canonical for one slug.
  - The guides index renders a link to every guide.
- [ ] Seed one placeholder guide so the suite can turn green, then replace it in Task 3. Implement, run `npm test`, `npm run lint` and `npm run build`, then commit.

### Task 3: The five guides (owner review gate)

**Files:** Create `src/content/guides/*.mdx`, the five `GUIDES` entries, and `public/guides/forms/*.png`.

| slug | title | tool | Source docs (the only allowed sources) |
|---|---|---|---|
| `future-software-version-error` | "File is from a future software version": what it means and how to fix it | convert | converter `docs/grandma2-versions.md` (header encoding, which field gates loading, onPC verification), `SPEC.md` (Background, V1 scope, never-inject rule), README |
| `version-in-grandma2-xml` | How grandMA2 records the software version in an XML export | convert | `docs/grandma2-versions.md` (§ How the `<MA>` header encodes version, § Which field gates loading, § Text encoding, § Parser edge cases) |
| `grandma2-version-reference` | grandMA2 software versions and the XML header each one writes | convert | `docs/grandma2-versions.md` (§ Distinct header triples, § priority targets, § Verified on onPC); mark inferred and confirmed versions exactly as the doc does |
| `how-grandma2-draws-forms` | How grandMA2 draws effect Form curves: Linear, Spline, Break and Step | form | form-helper `docs/ma2-form-modes.md` (Rules, Accuracy, Cases MA does not draw sensibly) |
| `custom-form-table-mode` | Entering a custom Form in grandMA2's Graph Editor (Table Mode) or importing it as XML | form | form-helper `README.md` (§ Getting a Form into grandMA2, § Features) |

- [ ] For each guide, write 600–1,200 words with H2 sections, a short intro that answers the search question in the first paragraph, and a closing `<ToolCta>`. End with a "Sources and testing" line, e.g. "Based on exports from grandMA2 onPC 3.3.4 to 3.9.63".
- [ ] Form diagrams: take Playwright screenshots of the live Form Helper (`https://gma2.chienchuanw.com/form`). Show one graph per mode and one per "draws wrong" case. Save as PNG, 1x and ≤ 200 KB each, with meaningful `alt` text.
- [ ] Self-check: list every factual sentence next to the source line that supports it in the PR description, under a "Claims → sources" table.
- [ ] Run `npm test` and `npm run build`, commit, and get the **owner to read and approve all guide text in the PR** before merging.

### Task 4: About and Privacy pages

**Files:** Create `src/app/about/page.tsx` and `src/app/privacy/page.tsx`. Test: `src/app/static-pages.test.tsx`.

- About covers: who runs the site (`OWNER_NAME`), what the tools are for (grandMA2 programmers), that they're free and run in the browser, links to the two public repos, and contact `CONTACT_EMAIL`.
- Privacy states:
  - (a) Show files you open in the tools are processed in your browser and never uploaded.
  - (b) The site uses Vercel Web Analytics: cookieless, aggregated page views, no personal profiles.
  - (c) Hosting (Vercel) keeps standard server logs.
  - (d) No advertising cookies are used at present; this page will be updated before any are.
  - (e) Contact `CONTACT_EMAIL`.
  - (f) "Last updated" date.
- Each page sets `alternates.canonical`.
- [ ] Write a failing test (Privacy contains the email and the phrases "never uploaded" and "Vercel Web Analytics"; About links both GitHub repos), then implement, run `npm test`, and commit.

### Task 5: Sitemap and robots

**Files:** Create `src/app/sitemap.ts`, `src/app/robots.ts` and `src/app/seo.test.ts`.

- [ ] Write a failing test. `sitemap()` URLs equal `SITE_URL` + [`/`, `/guides`, each guide, `/about`, `/privacy`, `/convert`, `/form`]. `robots()` allows `/` and has `sitemap: SITE_URL + "/sitemap.xml"`.
- [ ] Implement, run `npm test`, and commit.

### Task 6: Analytics in all three apps

- **Hub:** `npm i @vercel/analytics`. In `layout.tsx` add `<Analytics />` from `@vercel/analytics/next` with `scriptSrc="/_vercel/insights/script.js"` and `endpoint="/_vercel/insights"`. Commit, push, open a PR, run the review loop (`/dev:feature`), and merge into `dev`.
- **Converter** (own issue and branch):
  - Same component and props in `src/app/layout.tsx`. The explicit props stop the basePath from being prepended, so the requests reach the hub's endpoint through the shared domain.
  - Change the footer in `src/components/ui.tsx` to: "Runs entirely in your browser. Your files are never uploaded." plus a "Privacy" link to `https://gma2.chienchuanw.com/privacy`.
  - In the README privacy paragraph, add that the site counts anonymous page views with Vercel Web Analytics, which is same-origin and so allowed by the CSP.
  - Test: a render test of `Footer()` asserting the new text and the absence of "no analytics".
- **form-helper** (own issue and branch): `npm i @vercel/analytics` in `web/`, render `<Analytics scriptSrc="/_vercel/insights/script.js" endpoint="/_vercel/insights" />` from `@vercel/analytics/react` in `App.tsx`. Test: App renders without error, with the analytics component mocked only if it touches the network in jsdom.

### Task 7: Rollout (owner go-ahead)

1. Enable Web Analytics on the **hub** Vercel project only (dashboard or API).
2. Release the hub `v0.2.0` (`dev` → `main`, merge commit, automatic deploy), the converter `v1.4.0` (release PR and tag) and form-helper `v0.3.0` (`vercel deploy --prod` from a temp worktree, then tag). Update the converter's `docs/progress.md`.
3. Verify in production:
   - `/guides`, each guide, `/about`, `/privacy`, `/sitemap.xml` and `/robots.txt` return 200. `/guides/nope` returns 404.
   - In a browser on `/`, `/convert` and `/form`, the network panel shows `GET /_vercel/insights/script.js` (200) and a page-view POST to `gma2.chienchuanw.com/_vercel/insights/...` (2xx). There are no CSP errors in the console.
   - The visits appear in the hub's Web Analytics dashboard.
4. Then tell the owner Phase 3 can start: apply for AdSense with this site.
