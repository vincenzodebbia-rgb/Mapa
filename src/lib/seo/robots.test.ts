import { describe, expect, it } from "vitest";
import { getPageRobots } from "./robots";

describe("getPageRobots", () => {
  it("on the real site leaves indexable pages alone and keeps the others out, following their links", () => {
    expect(getPageRobots(true, false)).toBeUndefined();
    expect(getPageRobots(false, false)).toEqual({ index: false, follow: true });
  });

  it("on the demo site is noindex for every page, indexable or not", () => {
    expect(getPageRobots(true, true)).toEqual({ index: false, follow: false });
    expect(getPageRobots(false, true)).toEqual({ index: false, follow: false });
  });
});
