// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { buildPopup, toSafeHref } from "./build-popup";

describe("buildPopup", () => {
  it("shows a malicious title as plain text, without creating elements", () => {
    const popup = buildPopup(document, {
      title: "<img src=x onerror=alert(1)>",
      lines: ["<script>alert(1)</script>"],
      link: { href: "/e/concierto", label: "Ver" },
    });

    expect(popup.querySelector("img")).toBeNull();
    expect(popup.querySelector("script")).toBeNull();
    expect(popup.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(popup.textContent).toContain("<script>alert(1)</script>");
  });

  it("renders title, lines and the Ver link", () => {
    const popup = buildPopup(document, {
      title: "Concierto",
      lines: ["Hoy, 19:00–21:00", "Gratis"],
      link: { href: "/e/concierto", label: "Ver" },
    });

    expect([...popup.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "Concierto",
      "Hoy, 19:00–21:00",
      "Gratis",
    ]);
    const link = popup.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/e/concierto");
    expect(link?.textContent).toBe("Ver");
  });

  it("drops a link that is not http(s) or a same-site path", () => {
    const popup = buildPopup(document, {
      title: "X",
      lines: [],
      link: { href: "javascript:alert(1)", label: "Ver" },
    });
    expect(popup.querySelector("a")).toBeNull();
  });
});

describe("toSafeHref", () => {
  it("accepts same-site paths and http(s) URLs", () => {
    expect(toSafeHref("/a/asociacion")).toBe("/a/asociacion");
    expect(toSafeHref("https://example.org/x")).toBe("https://example.org/x");
    expect(toSafeHref("http://example.org/")).toBe("http://example.org/");
  });

  it("rejects other schemes and protocol-relative URLs", () => {
    expect(toSafeHref("javascript:alert(1)")).toBeNull();
    expect(toSafeHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(toSafeHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(toSafeHref("//evil.example")).toBeNull();
    expect(toSafeHref("/\\evil.example")).toBeNull();
    expect(toSafeHref("ftp://example.org")).toBeNull();
    expect(toSafeHref("not a url")).toBeNull();
  });
});
