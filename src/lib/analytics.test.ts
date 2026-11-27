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
