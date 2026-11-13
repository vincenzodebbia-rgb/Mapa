import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { checkTurnstileToken } = await import("./turnstile");

function answer(body: unknown, ok = true) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));
}

describe("checkTurnstileToken", () => {
  it("accepts a token Cloudflare confirms, sending secret and token but no IP", async () => {
    const fetchImpl = answer({ success: true });
    await expect(checkTurnstileToken("token-1", "secret-1", fetchImpl)).resolves.toBe(true);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = new URLSearchParams(String(init.body));
    expect(body.get("secret")).toBe("secret-1");
    expect(body.get("response")).toBe("token-1");
    expect(body.has("remoteip")).toBe(false);
  });

  it("rejects a token Cloudflare refuses", async () => {
    await expect(checkTurnstileToken("token-1", "s", answer({ success: false }))).resolves.toBe(false);
  });

  it("fails closed on a missing, empty or too long token without calling Cloudflare", async () => {
    const fetchImpl = answer({ success: true });
    await expect(checkTurnstileToken(undefined, "s", fetchImpl)).resolves.toBe(false);
    await expect(checkTurnstileToken("", "s", fetchImpl)).resolves.toBe(false);
    await expect(checkTurnstileToken("x".repeat(2049), "s", fetchImpl)).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed on an HTTP error, a malformed answer or a network error", async () => {
    await expect(checkTurnstileToken("t", "s", answer({ success: true }, false))).resolves.toBe(false);
    await expect(checkTurnstileToken("t", "s", answer({ nope: 1 }))).resolves.toBe(false);
    const failing = vi.fn(async () => {
      throw new Error("network");
    });
    await expect(checkTurnstileToken("t", "s", failing)).resolves.toBe(false);
  });
});
