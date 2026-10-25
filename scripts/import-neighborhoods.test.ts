import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  buildMigration,
  groupRings,
  readDbf,
  readShpPolygons,
  readZip,
  slugify,
  toMultiPolygonWkt,
  toNeighborhoods,
  type Ring,
} from "./import-neighborhoods";

// Tiny binary fixtures built in memory: the tests never download anything.

function zipOf(files: Record<string, Buffer>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = deflateRawSync(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const centralSize = centrals.reduce((size, part) => size + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function dbfOf(fields: { name: string; length: number }[], rows: string[][]): Buffer {
  const headerLength = 32 + fields.length * 32 + 1;
  const recordLength = 1 + fields.reduce((sum, field) => sum + field.length, 0);
  const header = Buffer.alloc(headerLength);
  header.writeUInt32LE(rows.length, 4);
  header.writeUInt16LE(headerLength, 8);
  header.writeUInt16LE(recordLength, 10);
  fields.forEach((field, i) => {
    header.write(field.name, 32 + i * 32, "latin1");
    header[32 + i * 32 + 11] = 0x43; // "C"
    header[32 + i * 32 + 16] = field.length;
  });
  header[headerLength - 1] = 0x0d;
  const records = rows.map((row) => {
    const record = Buffer.alloc(recordLength, 0x20);
    let offset = 1;
    fields.forEach((field, i) => {
      record.write(row[i] ?? "", offset, "utf8");
      offset += field.length;
    });
    return record;
  });
  return Buffer.concat([header, ...records]);
}

function shpOf(shapes: Ring[][]): Buffer {
  const header = Buffer.alloc(100);
  const records = shapes.map((rings, index) => {
    const points = rings.flat();
    const content = Buffer.alloc(44 + rings.length * 4 + points.length * 16);
    content.writeInt32LE(5, 0);
    content.writeInt32LE(rings.length, 36);
    content.writeInt32LE(points.length, 40);
    let start = 0;
    rings.forEach((ring, r) => {
      content.writeInt32LE(start, 44 + r * 4);
      start += ring.length;
    });
    points.forEach(([x, y], p) => {
      content.writeDoubleLE(x, 44 + rings.length * 4 + p * 16);
      content.writeDoubleLE(y, 44 + rings.length * 4 + p * 16 + 8);
    });
    const recordHeader = Buffer.alloc(8);
    recordHeader.writeInt32BE(index + 1, 0);
    recordHeader.writeInt32BE(content.length / 2, 4);
    return Buffer.concat([recordHeader, content]);
  });
  return Buffer.concat([header, ...records]);
}

// Clockwise square (outer ring in a shapefile) and a counter-clockwise hole inside it.
const outer: Ring = [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]];
const hole: Ring = [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]];
const otherOuter: Ring = [[20, 0], [20, 5], [25, 5], [25, 0], [20, 0]];

describe("slugify", () => {
  it("matches the slugs of the database", () => {
    expect(slugify("Opañel")).toBe("opanel");
    expect(slugify("Villaverde Alto - Casco Histórico de Villaverde")).toBe("villaverde-alto-casco-historico-de-villaverde");
    expect(slugify("  Sol ")).toBe("sol");
  });
});

describe("readZip", () => {
  it("extracts deflated files", () => {
    const files = readZip(zipOf({ "BARRIOS.cpg": Buffer.from("UTF-8"), "a/b.txt": Buffer.from("hola hola hola") }));
    expect(files.get("BARRIOS.cpg")?.toString()).toBe("UTF-8");
    expect(files.get("a/b.txt")?.toString()).toBe("hola hola hola");
  });

  it("rejects something that is not a zip", () => {
    expect(() => readZip(Buffer.from("<html>not found</html>"))).toThrow(/end of central directory/);
  });
});

describe("readDbf", () => {
  it("reads UTF-8 text fields and trims padding", () => {
    const dbf = dbfOf(
      [
        { name: "NOMDIS", length: 20 },
        { name: "NOMBRE", length: 20 },
      ],
      [["Carabanchel", "Opañel"]],
    );
    expect(readDbf(dbf)).toEqual([{ NOMDIS: "Carabanchel", NOMBRE: "Opañel" }]);
  });
});

describe("readShpPolygons and groupRings", () => {
  it("reads rings and puts holes inside their outer ring", () => {
    const [first, second] = readShpPolygons(shpOf([[outer, hole, otherOuter], [otherOuter]]));
    expect(first).toEqual([outer, hole, otherOuter]);
    expect(second).toEqual([otherOuter]);
    expect(groupRings(first ?? [])).toEqual([[outer, hole], [otherOuter]]);
  });

  it("writes a MULTIPOLYGON at centimetre precision", () => {
    expect(toMultiPolygonWkt([[[[1.234, 2.345], [3, 4], [1.234, 2.345]]]])).toBe(
      "MULTIPOLYGON(((1.23 2.35,3.00 4.00,1.23 2.35)))",
    );
  });
});

describe("toNeighborhoods and buildMigration", () => {
  it("refuses two neighborhoods with the same slug", () => {
    expect(() =>
      toNeighborhoods(
        [
          { NOMBRE: "Sol", NOMDIS: "Centro" },
          { NOMBRE: "Sól", NOMDIS: "Centro" },
        ],
        [[outer], [outer]],
      ),
    ).toThrow(/duplicate slug: sol/);
  });

  it("escapes quotes in names and transforms from EPSG:25830", () => {
    const sql = buildMigration(toNeighborhoods([{ NOMBRE: "L'Ejemplo", NOMDIS: "Centro" }], [[outer]]), "2026-10-25");
    expect(sql).toContain("('l-ejemplo', 'L''Ejemplo', 'Centro', 'MULTIPOLYGON(((0.00 0.00,");
    expect(sql).toContain("st_geomfromtext(i.boundary_wkt, 25830)");
    expect(sql).toContain("on conflict (slug) do update");
  });
});
