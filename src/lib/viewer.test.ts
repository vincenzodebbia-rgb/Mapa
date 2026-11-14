import { describe, expect, it } from "vitest";
import { hasSessionCookie, parseViewer } from "./viewer";

describe("hasSessionCookie", () => {
  it("finds the auth cookie, also split in chunks", () => {
    expect(hasSessionCookie("sb-abcdef-auth-token=base64-xyz")).toBe(true);
    expect(hasSessionCookie("theme=dark; sb-abcdef-auth-token.0=part")).toBe(true);
  });

  it("ignores other cookies and look-alikes", () => {
    expect(hasSessionCookie("")).toBe(false);
    expect(hasSessionCookie("theme=dark")).toBe(false);
    expect(hasSessionCookie("sb-abcdef-auth-token-code-verifier=x")).toBe(false);
    expect(hasSessionCookie("xsb-abcdef-auth-token=x")).toBe(false);
  });
});

describe("parseViewer", () => {
  it("accepts only exact true values", () => {
    expect(parseViewer({ signedIn: true, canEditEvent: true })).toEqual({ signedIn: true, canEditEvent: true });
    expect(parseViewer({ signedIn: "true", canEditEvent: 1 })).toEqual({ signedIn: false, canEditEvent: false });
    expect(parseViewer(null)).toEqual({ signedIn: false, canEditEvent: false });
  });
});
