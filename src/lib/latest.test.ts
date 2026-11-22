import { describe, it, expect } from "vitest";
import { createLatestGuard } from "./latest";

describe("createLatestGuard", () => {
  it("reports only the most recently started request as current", () => {
    const guard = createLatestGuard();
    const first = guard.start();
    const second = guard.start();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it("keeps a lone request current until another starts", () => {
    const guard = createLatestGuard();
    const only = guard.start();
    expect(only()).toBe(true);
    guard.start();
    expect(only()).toBe(false);
  });

  it("keeps separate guards independent", () => {
    const a = createLatestGuard();
    const b = createLatestGuard();
    const aReq = a.start();
    b.start();
    expect(aReq()).toBe(true);
  });
});
