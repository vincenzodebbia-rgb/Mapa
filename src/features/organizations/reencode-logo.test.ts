import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { LOGO_MAX_SIDE, reencodeLogo } = await import("./reencode-logo");

// A JPEG like a phone photo: large, with GPS coordinates (Puerta del Sol) and the camera in EXIF.
async function createJpegWithGps(): Promise<Buffer> {
  return sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 200, g: 120, b: 40 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: "CamaraFicticia", Model: "Prueba 1" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "40/1 25/1 1012/100",
        GPSLongitudeRef: "W",
        GPSLongitude: "3/1 42/1 1956/100",
      },
    })
    .toBuffer();
}

describe("reencodeLogo", () => {
  it("turns a JPEG with GPS into a WebP of at most 256×256 px without any metadata", async () => {
    const input = await createJpegWithGps();
    const inputMeta = await sharp(input).metadata();
    expect(inputMeta.exif).toBeDefined();
    expect(inputMeta.exif?.includes("CamaraFicticia")).toBe(true);
    // Tag 0x8825 (GPS IFD pointer, little-endian TIFF): the input really carries GPS data.
    expect(inputMeta.exif?.includes(Buffer.from([0x25, 0x88]))).toBe(true);

    const output = await reencodeLogo(input);
    const meta = await sharp(output).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width).toBeLessThanOrEqual(LOGO_MAX_SIDE);
    expect(meta.height).toBeLessThanOrEqual(LOGO_MAX_SIDE);
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    // Belt and braces: no EXIF chunk and no trace of the camera or GPS tags in the file bytes.
    expect(output.includes("EXIF")).toBe(false);
    expect(output.includes("Exif")).toBe(false);
    expect(output.includes("CamaraFicticia")).toBe(false);
  });

  it("does not enlarge a small logo", async () => {
    const small = await sharp({ create: { width: 64, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .png()
      .toBuffer();
    const meta = await sharp(await reencodeLogo(small)).metadata();
    expect([meta.width, meta.height]).toEqual([64, 32]);
  });

  it("rejects a file that is not an image", async () => {
    await expect(reencodeLogo(Buffer.from("<svg onload=alert(1)>"))).rejects.toThrow();
  });
});
