import { describe, expect, it } from "vitest";
import { parseEwkbPoint } from "./geo";

function ewkbPoint(lng: number, lat: number, { srid = true, littleEndian = true } = {}): string {
  const buffer = new ArrayBuffer(srid ? 25 : 21);
  const view = new DataView(buffer);
  view.setUint8(0, littleEndian ? 1 : 0);
  view.setUint32(1, srid ? 0x20000001 : 1, littleEndian);
  let offset = 5;
  if (srid) {
    view.setUint32(5, 4326, littleEndian);
    offset = 9;
  }
  view.setFloat64(offset, lng, littleEndian);
  view.setFloat64(offset + 8, lat, littleEndian);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

describe("parseEwkbPoint", () => {
  it("reads the EWKB that PostgREST returns for geography(Point, 4326)", () => {
    // SRID=4326;POINT(-3.7038 40.4168), as printed by PostGIS.
    expect(parseEwkbPoint("0101000020E6100000FE65F7E461A10DC0857CD0B359354440")).toEqual([-3.7038, 40.4168]);
  });

  it("reads plain WKB and big-endian points", () => {
    expect(parseEwkbPoint(ewkbPoint(-3.7, 40.4, { srid: false }))).toEqual([-3.7, 40.4]);
    expect(parseEwkbPoint(ewkbPoint(-3.7, 40.4, { littleEndian: false }))).toEqual([-3.7, 40.4]);
  });

  it("returns null for anything that is not a point", () => {
    expect(parseEwkbPoint(null)).toBeNull();
    expect(parseEwkbPoint("not hex")).toBeNull();
    expect(parseEwkbPoint("0103000020E6100000")).toBeNull();
    expect(parseEwkbPoint({ type: "Point", coordinates: [1, 2] })).toBeNull();
  });
});
