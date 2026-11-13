import "server-only";
import sharp from "sharp";

// L'unica immagine della v1 (docs/SPEC.md §7, §12). L'action di caricamento (sessione 7) la chiama prima dello Storage:
// qualunque cosa arrivi (JPEG, PNG, WebP…) esce come un piccolo WebP senza alcun metadato (EXIF, GPS, ICC, XMP).

export const LOGO_MAX_SIDE = 256;

/** Ricodifica un logo caricato: WebP, al massimo 256×256 px, dritto, senza metadati. */
export async function reencodeLogo(input: Buffer): Promise<Buffer> {
  return (
    sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
      // Prima si applica l'orientamento EXIF: il tag dell'orientamento sparisce con il resto dei metadati.
      .rotate()
      .resize(LOGO_MAX_SIDE, LOGO_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
      // sharp non scrive metadati se non glielo si chiede (withMetadata/keepExif): non chiederlo mai.
      .webp({ quality: 85 })
      .toBuffer()
  );
}
