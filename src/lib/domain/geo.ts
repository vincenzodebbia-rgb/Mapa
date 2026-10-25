// PostgREST returns PostGIS geography columns as hex EWKB ("0101000020E6100000…").
// The views compute lng/lat in SQL; tables (events.location) need this small decoder.

const WKB_POINT = 1;
const EWKB_SRID_FLAG = 0x20000000;

/** [lng, lat] of a hex (E)WKB Point, or null for anything else. */
export function parseEwkbPoint(hex: unknown): [lng: number, lat: number] | null {
  if (typeof hex !== "string" || !/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = Uint8Array.from(hex.match(/../g) ?? [], (byte) => parseInt(byte, 16));
  if (bytes.length < 21) return null;
  const view = new DataView(bytes.buffer);
  const littleEndian = bytes[0] === 1;
  const type = view.getUint32(1, littleEndian);
  if ((type & 0xff) !== WKB_POINT) return null;
  const offset = type & EWKB_SRID_FLAG ? 9 : 5;
  if (bytes.length < offset + 16) return null;
  const lng = view.getFloat64(offset, littleEndian);
  const lat = view.getFloat64(offset + 8, littleEndian);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}
