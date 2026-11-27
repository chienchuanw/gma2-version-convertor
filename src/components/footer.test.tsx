import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Footer } from "./ui";

describe("Footer", () => {
  const html = renderToStaticMarkup(<Footer />);

  it("keeps the upload promise but no longer claims there is no analytics", () => {
    expect(html).toContain("Runs entirely in your browser. Your files are never uploaded.");
    expect(html).not.toMatch(/no analytics/i);
  });

  it("links the site's privacy page", () => {
    expect(html).toMatch(/href="https:\/\/gma2\.chienchuanw\.com\/privacy"[^>]*>Privacy</);
  });
});
