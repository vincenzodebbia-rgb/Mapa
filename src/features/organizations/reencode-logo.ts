import "server-only";
import sharp from "sharp";

// The only image of v1 (docs/SPEC.md §7, §12). The upload action (session 7) calls this before Storage:
// whatever arrives (JPEG, PNG, WebP…) leaves as a small WebP with no metadata at all (EXIF, GPS, ICC, XMP).

export const LOGO_MAX_SIDE = 256;

/** Re-encodes an uploaded logo: WebP, at most 256×256 px, upright, metadata stripped. */
export async function reencodeLogo(input: Buffer): Promise<Buffer> {
  return (
    sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
      // Apply the EXIF orientation first: the orientation tag is dropped with the rest of the metadata.
      .rotate()
      .resize(LOGO_MAX_SIDE, LOGO_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
      // sharp writes no metadata unless asked (withMetadata/keepExif): never ask.
      .webp({ quality: 85 })
      .toBuffer()
  );
}
