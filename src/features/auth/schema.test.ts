import { describe, expect, it } from "vitest";
import { emailLinkSchema, signInSchema } from "./schema";

describe("signInSchema", () => {
  it("normalizes the email", () => {
    expect(signInSchema.parse({ email: "  Ana@Example.ORG " }).email).toBe("ana@example.org");
  });

  it("rejects what is not an email", () => {
    expect(signInSchema.safeParse({ email: "ana" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: null }).success).toBe(false);
  });
});

describe("emailLinkSchema", () => {
  it("accepts a token_hash with a known type, or a PKCE code", () => {
    expect(emailLinkSchema.safeParse({ tokenHash: "abc", type: "email", code: null }).success).toBe(true);
    expect(emailLinkSchema.safeParse({ tokenHash: null, type: null, code: "xyz" }).success).toBe(true);
  });

  it("rejects unknown types and empty links", () => {
    expect(emailLinkSchema.safeParse({ tokenHash: "abc", type: "recovery", code: null }).success).toBe(false);
    expect(emailLinkSchema.safeParse({ tokenHash: null, type: null, code: null }).success).toBe(false);
  });
});
