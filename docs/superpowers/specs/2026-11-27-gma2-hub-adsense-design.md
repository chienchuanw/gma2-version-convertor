# gma2 tools hub + Google AdSense — design

Date: 2026-11-27 · Status: awaiting owner approval

## Intent and why

The owner builds free, client-side grandMA2 tools (today: **gma2-version-convertor** and
**gma2-form-helper**). They want the tools to earn money through Google AdSense, with the
minimum goal of covering the Vercel **Pro** plan (~US$20/month). To get there the tools are
gathered under one site, `gma2.chienchuanw.com`, so that content pages and tools share one
domain for search traffic and for AdSense review.

Rough reality check (the owner has seen this): niche-tool RPM is roughly US$1–5 per 1,000
page views, so break-even needs on the order of 5,000–20,000 page views/month. Traffic growth
(guides, more tools) matters as much as ad placement.

## Goals

- One site at `https://gma2.chienchuanw.com` with a home page that lists all tools.
- Tools served under paths: `/convert` (version-convertor) and `/form` (form-helper).
- Content pages (guides) under `/guides/...` to support AdSense approval and search traffic.
- Google AdSense ads on the home page, guide pages **and tool pages** (owner chose this
  explicitly, accepting the privacy trade-off below).
- EU/EEA/UK consent handled, AdSense policy met (privacy policy page, ads.txt).
- Old URLs (`gma2-converter.vercel.app`, `gma2-form-helper.vercel.app`) permanently
  redirect (308) to the new paths, keeping existing traffic and search ranking.
- Some way to see page views, so the owner can tell whether the goal is being met.

## Non-goals

- No backend, accounts, or server-side processing. Files are still processed only in the
  browser; the conversion core (`src/lib/convert.ts`) and form-helper logic are untouched.
- No merging of the repos, no porting form-helper from Vite to Next.js.
- Ads on `spot-on.tw` or on the root `chienchuanw.com` personal site (except the ads.txt
  file, see below).

## Anti-goals (would be a failure even if it "works")

- Ads that could be mistaken for the tool's own controls — especially next to the
  **Download** / **Upload** buttons — or that cause accidental clicks. This also violates
  AdSense policy and risks the account.
- Silently keeping the old privacy claim ("the page cannot make network requests to any other
  origin") once ads load. The claim must be rewritten to stay true.
- Ads that push the tool itself below the fold or break the tool's layout/usability.
- Breaking either tool's existing behaviour while re-basing it to a sub-path.

## Constraints

- Owner is on Vercel **Pro** (team "Take Two Studio"), so commercial use on Vercel is allowed.
- DNS for `chienchuanw.com` is on Cloudflare; the root site is already a Vercel project
  (`www.chienchuanw.com`).
- convertor: Next.js 16.2.9 App Router, static page, strict CSP in `next.config.ts`
  (`connect-src 'self'`, `form-action 'none'`, `frame-ancestors 'none'`, …; deliberately no
  `script-src` to keep the page static). Read `node_modules/next/dist/docs/` before changing
  Next config (project rule, see AGENTS.md).
- form-helper: Vite + React 19 SPA in `web/` of its repo; supports zh-TW UI.
- Both repos use the git flow in their AGENTS.md (feature branch → PR into `dev` → release PR
  `dev` → `main`). Each repo's changes ship through its own PRs.
- AdSense is reviewed per root domain; approval and ad serving are not instant, so the work is
  phased so nothing waits on it unnecessarily.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (picked)** | New hub app owns the domain; tools served under paths via rewrites (Next.js multi-zones pattern, `node_modules/next/dist/docs/01-app/02-guides/multi-zones.md`) | One site for SEO and AdSense; tools stay in their own repos and deploy independently. Cost: each tool must work under a sub-path, and AdSense/header code is duplicated per app. |
| B | One subdomain per tool (`convert.gma2.chienchuanw.com`, …) | Least work, but search engines see several small sites; guides' authority doesn't flow to tools. Weakens the traffic plan the revenue goal depends on. |
| C | Merge everything into one Next.js app | Single layout/CSP/ad config, but requires porting form-helper from Vite and merging repos (form-helper also has `plugin/`, `tools/`), and every future tool needs porting. |

Owner picked A on the recommendation.

## Decisions made with the owner

- Revenue model: Google AdSense, ads on tool pages too (option "B" of the ad-placement
  question), accepting that Google's ad scripts run on the same page as the user's file.
- Domain: `gma2.chienchuanw.com` (personal brand, not Spot On, to keep ads off the company
  brand).
- Architecture: approach A.

## Design

### 1. Hub (new repo, e.g. `gma2-hub`)

- **Private** GitHub repo under the owner's account (owner's choice; the tools stay public MIT).
  Vercel Pro deploys private repos normally, so this has no effect on the plan.

- Next.js App Router, static where possible, deployed as its own Vercel project with the
  domain `gma2.chienchuanw.com` (CNAME in Cloudflare, DNS-only/grey-cloud so Vercel issues the
  certificate).
- Pages: `/` (tool list: name, one-line description, screenshot, link), `/guides` index and
  guide articles, `/privacy` (privacy policy incl. Google advertising cookies disclosure,
  required by AdSense), `/about`.
- `/privacy` and `/about` name the **owner personally** as the site operator (not Spot On, not
  Take Two Studio; owner confirms the exact name spelling) with contact
  **chienchuanwww@gmail.com**.
- Rewrites (in the hub's `next.config.ts`) send `/convert`, `/convert/:path+` to the
  convertor Vercel project and `/form`, `/form/:path+` to the form-helper project. Links from
  the hub to tools are plain `<a>` (cross-zone, hard navigation), per the multi-zones guide.
- Tool destinations come from env vars (e.g. `CONVERT_ORIGIN`, `FORM_ORIGIN`) so preview and
  local dev can point elsewhere.
- **Origin hostnames (my call, avoids a redirect loop; revised while planning):** the rewrites
  must NOT target the old `gma2-converter.vercel.app` / `gma2-form-helper.vercel.app`
  hostnames, because those will redirect to the hub. The team-scoped aliases
  (`<project>-take-two-studio.vercel.app`) can't be used either: the team's Vercel
  Authentication (Standard Protection) puts them behind SSO (verified: they 302 to
  `vercel.com/sso-api`). So each tool project gets one extra, explicitly added `.vercel.app`
  production domain as its origin (e.g. `gma2-converter-origin.vercel.app`,
  `gma2-form-helper-origin.vercel.app`; explicitly added domains are public, like the current
  ones). No DNS records needed. Direct hits on an origin are handled by the canonical URL.
- **Legacy redirects** are host-conditioned redirects in each tool's own config (`has: host`),
  so `gma2-converter.vercel.app/<path>` → `https://gma2.chienchuanw.com/convert/<path>` and
  `gma2-form-helper.vercel.app/<path>` → `https://gma2.chienchuanw.com/form/<path>` (308),
  while requests arriving via the origin hostname are served normally. This keeps the
  `/convert` / `/form` prefix, which Vercel's Domains "Redirect to" setting can't add.
  (Vercel Microfrontends was considered; plain rewrites are enough for two zones.)

### 2. convertor re-based to `/convert`

- `basePath: '/convert'` in `next.config.ts`; verify static assets, `icon.svg`, and
  any absolute URLs work under the prefix.
- The old `gma2-converter.vercel.app` redirects 308 to
  `https://gma2.chienchuanw.com/convert` (path preserved; see Legacy redirects).
- Requests reaching the convertor project directly (not via the hub) should not be indexed as
  a duplicate site: canonical URL points at `gma2.chienchuanw.com/convert`.

### 3. form-helper re-based to `/form`

- Vite `base: '/form/'`. The hub rewrite can either keep or strip the `/form` prefix; the
  builder picks whichever makes the deployed asset paths resolve (stripping the prefix lets
  Vite's default `dist/` layout work unchanged).
- Old `gma2-form-helper.vercel.app` redirects 308 to `https://gma2.chienchuanw.com/form`
  (see Legacy redirects).
- Canonical URL as for convertor.

### 4. Content

- Initial set of roughly 5–8 genuinely useful guides before applying to AdSense (e.g. "File is
  from a future software version — what it means and how to fix it", grandMA2 version history,
  how effect Forms / Graph Editor modes work, exporting/importing XML on MA2). The owner has
  the domain knowledge; drafts can be written with Claude and reviewed by the owner.
- Language: **English first** (my call: both tools' main UI is English and the audience is
  international); zh-TW versions can come later.

### 5. AdSense integration (after the site is live with content)

- Owner applies for AdSense with the site. ads.txt: Google checks the root domain, so
  `https://chienchuanw.com/ads.txt` (served by the existing personal-site project; the apex
  currently 307s to `www`, so make sure the file resolves, likely repo `~/Documents/chienchuanw`
  — confirm) holds the
  publisher line; confirm against AdSense's instructions at application time.
- Consent: use AdSense's built-in **Privacy & messaging** CMP (Google-certified, free) for
  EEA/UK/CH. No third-party CMP.
- Ad loading: the AdSense script is added in each app's root layout/`index.html`.
- Placement (my call):
  - Hub home and guides: manual responsive units (in-article / below content). Auto ads may be
    tried on these pages only.
  - Tool pages: **manual units only, no Auto ads.** One unit per tool page, clearly separated
    and labelled "Advertisement". convertor: the Download button is the last element of the
    step 3 card, so the unit goes **after the footer / below the whole tool with a clear
    divider and generous gap** (my call), not directly under step 3. form-helper: outside the
    editor area. Never adjacent to Upload/Download/Export buttons. Reserve the
    unit's height to avoid layout shift.
- CSP (my call): don't drop the CSP; widen it to an allowlist of the origins AdSense and its
  CMP need (script, connect, frame, img), keeping `form-action 'none'`, `object-src 'none'`,
  `base-uri 'self'`. The hub must also allow `frame-ancestors` only as before (`'none'`).
  Risk: AdSense uses many Google domains including country TLDs; the builder verifies in the
  browser (console CSP violations, ads actually filling, consent message showing) and, if an
  allowlist proves unworkable, falls back to removing `connect-src`/`frame-src` restrictions
  while keeping the rest — and notes that in the PR.
- Privacy wording: README and the convertor page ("Your file never leaves this page") are
  rewritten to something true, e.g. "Your file is processed in your browser and never uploaded
  by this tool. This site shows ads from Google; see Privacy." The README's CSP paragraph is
  updated to match the new policy. Same review for form-helper's README/UI.

### 6. Measuring

- Enable Vercel Web Analytics on the hub and both tools (same-origin `/_vercel/insights`, fits
  the CSP) so the owner sees page views per path and can compare with AdSense revenue.

## Who does what outside the repos

- Builder (with the owner's go-ahead at each step): create the hub GitHub repo with `gh`;
  create the Vercel project in team Take Two Studio and attach `gma2.chienchuanw.com`; set
  the origin `.vercel.app` domains on both tool projects; open a PR on the personal-site repo for
  `ads.txt`.
- Owner: add the Cloudflare CNAME (builder supplies the exact value); apply for AdSense and
  configure the Privacy & messaging consent message (needs the owner's Google account); hand
  the builder the publisher ID (`ca-pub-…`) and ad unit slot IDs.

## Phases / order

1. Hub skeleton + domain + rewrites; convertor and form-helper re-based; old URLs redirect.
   (No ads yet. Each repo: its own PR into `dev`, then release.)
   **Order matters (my call):** the hub goes live on `gma2.chienchuanw.com` (DNS + cert) and
   the origin domains are added *before* the re-based tools are released to production; the
   tools' releases (which also turn on their legacy redirects) go last. The hub + re-based
   tools are verified together locally first (preview deployments are behind SSO).
   Otherwise the current URLs break.
2. Content: home, about, privacy policy, first guides. Analytics on.
3. Owner applies for AdSense. On approval: ads.txt, CMP, script + ad units, CSP and privacy
   wording updates, in each repo.

## Left to the builder

- Hub repo name, styling (reuse the convertor's visual language), header markup.
- Prefix keep-vs-strip for the form-helper rewrite.
- Exact CSP allowlist entries (verified in browser).
- Exact ad unit sizes/positions within the rules above.
- Guide outlines (owner reviews content before publishing).
