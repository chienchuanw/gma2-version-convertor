/**
 * Page views are counted by the gma2 tools hub's Vercel Web Analytics (enabled on the hub
 * project only). These root-absolute URLs resolve on gma2.chienchuanw.com, which the hub serves,
 * so they stay within this app's `connect-src 'self'` and are not prefixed with the basePath.
 * Keep in sync with gma2-hub `src/lib/analytics.ts`.
 */
export const ANALYTICS_PROPS = {
  scriptSrc: "/_vercel/insights/script.js",
  endpoint: "/_vercel/insights",
} as const;
