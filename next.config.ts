import type { NextConfig } from "next";

/**
 * Privacy guard: the page may only connect back to its own origin, so even a
 * future dependency cannot send a user's file anywhere. No script-src on purpose —
 * a nonce-based script policy would force dynamic rendering of an otherwise static page.
 */
const CSP = [
  "connect-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

/**
 * The tools hub (gma2.chienchuanw.com) proxies /convert to this project, so the app lives
 * under that path. The old hostname sends visitors to the hub; it is matched by host so
 * requests arriving through the hub's origin hostname are served normally.
 */
const LEGACY_HOST = "gma2-converter.vercel.app";
const HUB_CONVERT = "https://gma2.chienchuanw.com/convert/:path*";

const nextConfig: NextConfig = {
  basePath: "/convert",
  async redirects() {
    const has = [{ type: "host" as const, value: LEGACY_HOST }];
    // `/convert/...` first, so an old link that already carries the prefix is not doubled.
    return ["/convert/:path*", "/:path*"].map((source) => ({
      source,
      has,
      basePath: false as const,
      permanent: true,
      destination: HUB_CONVERT,
    }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: CSP }],
      },
    ];
  },
};

export default nextConfig;
