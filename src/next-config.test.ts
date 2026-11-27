import { describe, expect, it } from "vitest";
import config from "../next.config";

const LEGACY_HOST = [{ type: "host" as const, value: "gma2-converter.vercel.app" }];
const HUB_CONVERT = "https://gma2.chienchuanw.com/convert/:path*";

describe("next.config", () => {
  it("serves the app under /convert so the hub can proxy it", () => {
    expect(config.basePath).toBe("/convert");
  });

  it("redirects the legacy host to the hub, matching /convert paths first so the prefix is not doubled", async () => {
    expect(await config.redirects!()).toEqual([
      { source: "/convert/:path*", has: LEGACY_HOST, basePath: false, permanent: true, destination: HUB_CONVERT },
      { source: "/:path*", has: LEGACY_HOST, basePath: false, permanent: true, destination: HUB_CONVERT },
    ]);
  });

  it("keeps the privacy CSP", async () => {
    const [rule] = await config.headers!();
    const csp = rule.headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp?.value).toContain("connect-src 'self'");
  });
});
