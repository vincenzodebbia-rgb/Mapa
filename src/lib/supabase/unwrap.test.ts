import { describe, expect, it } from "vitest";
import { SupabaseQueryError, unwrap } from "./unwrap";

describe("unwrap", () => {
  it("returns data when there is no error", () => {
    expect(unwrap({ data: [{ id: 1 }], error: null })).toEqual([{ id: 1 }]);
  });

  it("returns an empty list as is (an RLS-denied SELECT is not an error)", () => {
    expect(unwrap({ data: [], error: null })).toEqual([]);
  });

  it("throws a SupabaseQueryError with the code when there is an error", () => {
    const run = () => unwrap({ data: null, error: { message: "permission denied", code: "42501" } });
    expect(run).toThrow(SupabaseQueryError);
    expect(run).toThrow("permission denied");
    try {
      run();
    } catch (error) {
      expect((error as SupabaseQueryError).code).toBe("42501");
    }
  });
});
