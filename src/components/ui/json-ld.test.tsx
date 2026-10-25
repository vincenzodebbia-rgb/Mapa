import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildBreadcrumbList, type JsonLdObject } from "@/lib/seo/json-ld";
import { JsonLd } from "./json-ld";

// Text that tries everything: quotes, ampersands, apostrophes, a closing script tag and an HTML payload.
const hostile = `Concierto "en el patio" & más 'raro' </script><img src=x onerror=alert(1)> <!-- fin`;

function renderScriptText(data: JsonLdObject): string {
  const html = renderToStaticMarkup(<JsonLd data={data} />);
  const match = /^<script type="application\/ld\+json">([\s\S]*)<\/script>$/.exec(html);
  if (!match?.[1]) throw new Error(`Unexpected markup: ${html}`);
  return match[1];
}

describe("JsonLd", () => {
  it("renders valid JSON that parses back to the same data, quotes untouched", () => {
    const data: JsonLdObject = { "@context": "https://schema.org", "@type": "Event", name: hostile };
    const text = renderScriptText(data);
    expect(JSON.parse(text)).toEqual(data);
    expect(text).toContain('\\"en el patio\\"');
    expect(text).not.toContain("&quot;");
    expect(text).not.toContain("&amp;");
  });

  it("never lets database text close the script or open a tag", () => {
    const text = renderScriptText({ name: hostile });
    expect(text).not.toContain("<");
    expect(text.toLowerCase()).not.toContain("</script");
  });
});

describe("buildBreadcrumbList", () => {
  it("numbers the items from 1", () => {
    expect(
      buildBreadcrumbList([
        { name: "Inicio", url: "https://mapa.example.org/" },
        { name: "Opañel", url: "https://mapa.example.org/barrio/opanel" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://mapa.example.org/" },
        { "@type": "ListItem", position: 2, name: "Opañel", item: "https://mapa.example.org/barrio/opanel" },
      ],
    });
  });
});
