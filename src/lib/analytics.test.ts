import { describe, expect, it } from "vitest";
import { ANALYTICS_PROPS } from "./analytics";

describe("ANALYTICS_PROPS", () => {
  it("uses the hub's same-origin endpoint, not one under the /convert basePath", () => {
    expect(ANALYTICS_PROPS).toEqual({
      scriptSrc: "/_vercel/insights/script.js",
      endpoint: "/_vercel/insights",
    });
  });
});

describe("layout analytics import", () => {
  it("uses the React component, which reports the real path (/convert) instead of the basePath-stripped one", async () => {
    const { readFileSync } = await import("node:fs");
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    // @vercel/analytics/next reads usePathname(), which drops the basePath, so every visit to
    // /convert would be counted as "/" in the hub's dashboard (seen in a browser: window.vaq).
    expect(layout).toContain('from "@vercel/analytics/react"');
    expect(layout).not.toContain("@vercel/analytics/next");
  });
});
