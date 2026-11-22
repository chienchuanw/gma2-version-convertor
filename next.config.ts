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

const nextConfig: NextConfig = {
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
