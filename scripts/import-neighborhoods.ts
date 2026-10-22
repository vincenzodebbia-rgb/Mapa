// Genera la migrazione SQL con i barrios ufficiali di Madrid. Non tocca nessun database:
// la migrazione arriva a mapa-dev (push del fondatore) e a mapa-prod (CI) con il flusso normale.
//
// Uso:
//   npx supabase migration new neighborhoods_official
//   node scripts/import-neighborhoods.ts supabase/migrations/<file creato>.sql
//
// Fonte: Ayuntamiento de Madrid, geoportal, "Barrios municipales" (shapefile, ETRS89 UTM 30N = EPSG:25830),
// licenza CC BY 4.0 (attribuzione in /legal). Solo moduli di Node: niente dipendenze per zip, shapefile o proiezioni
// (la proiezione la fa PostGIS con ST_Transform dentro la migrazione).

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

export const SOURCE_URL =
  "https://geoportal.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/LIMITES_ADMINISTRATIVOS/Barrios/Barrios.zip";
const SOURCE_SRID = 25830;

export type Ring = Array<[number, number]>;
export type DbfRecord = Record<string, string>;
export type Neighborhood = { slug: string; name: string; district: string; polygons: Ring[][] };

/** Stessa forma degli slug del database: minuscolo, senza accenti, trattini. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Legge i file di uno zip (solo "stored" e "deflate", gli unici che usa il geoportale). */
export function readZip(zip: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  // End of central directory: firma 0x06054b50 negli ultimi 22 byte + commento (max 64 KB).
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip: end of central directory not found");
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("zip: bad central directory entry");
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.toString("utf8", offset + 46, offset + 46 + nameLength);
    // L'header locale può avere un "extra" diverso da quello della central directory: si rilegge.
    const dataStart =
      localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
    const data = zip.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) files.set(name, Buffer.from(data));
    else if (method === 8) files.set(name, inflateRawSync(data));
    else throw new Error(`zip: unsupported compression method ${method} for ${name}`);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

/** Record di un file .dbf (dBase III), testo UTF-8 come dichiara il .cpg del geoportale. */
export function readDbf(dbf: Buffer): DbfRecord[] {
  const recordCount = dbf.readUInt32LE(4);
  const headerLength = dbf.readUInt16LE(8);
  const recordLength = dbf.readUInt16LE(10);
  const fields: Array<{ name: string; length: number }> = [];
  for (let offset = 32; dbf[offset] !== 0x0d; offset += 32) {
    const rawName = dbf.toString("latin1", offset, offset + 11);
    fields.push({ name: rawName.split("\0")[0] ?? "", length: dbf[offset + 16] ?? 0 });
  }
  const records: DbfRecord[] = [];
  for (let i = 0; i < recordCount; i++) {
    const start = headerLength + i * recordLength;
    if (dbf[start] === 0x2a) continue; // "*" = record cancellato
    let offset = start + 1;
    const record: DbfRecord = {};
    for (const field of fields) {
      record[field.name] = dbf.toString("utf8", offset, offset + field.length).trim();
      offset += field.length;
    }
    records.push(record);
  }
  return records;
}

/** Anelli di ogni record poligono (tipo 5) di un file .shp, nell'ordine del .dbf. */
export function readShpPolygons(shp: Buffer): Ring[][] {
  const shapes: Ring[][] = [];
  let offset = 100;
  while (offset < shp.length) {
    const contentLength = shp.readInt32BE(offset + 4) * 2;
    const content = offset + 8;
    const shapeType = shp.readInt32LE(content);
    if (shapeType !== 5) throw new Error(`shp: expected polygons (type 5), found type ${shapeType}`);
    const partCount = shp.readInt32LE(content + 36);
    const pointCount = shp.readInt32LE(content + 40);
    const partsStart = content + 44;
    const pointsStart = partsStart + partCount * 4;
    const rings: Ring[] = [];
    for (let p = 0; p < partCount; p++) {
      const from = shp.readInt32LE(partsStart + p * 4);
      const to = p + 1 < partCount ? shp.readInt32LE(partsStart + (p + 1) * 4) : pointCount;
      const ring: Ring = [];
      for (let i = from; i < to; i++) {
        ring.push([shp.readDoubleLE(pointsStart + i * 16), shp.readDoubleLE(pointsStart + i * 16 + 8)]);
      }
      rings.push(ring);
    }
    shapes.push(rings);
    offset = content + contentLength;
  }
  return shapes;
}

/** Area con segno (shoelace): negativa = senso orario. */
function signedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

/** Nello shapefile gli anelli esterni sono in senso orario e i buchi antiorari, dopo il loro esterno. */
export function groupRings(rings: Ring[]): Ring[][] {
  const polygons: Ring[][] = [];
  for (const ring of rings) {
    const last = polygons.at(-1);
    if (signedArea(ring) < 0 || !last) polygons.push([ring]);
    else last.push(ring);
  }
  return polygons;
}

/** WKT MULTIPOLYGON con coordinate al centimetro (metri UTM). */
export function toMultiPolygonWkt(polygons: Ring[][]): string {
  const ringText = (ring: Ring) => `(${ring.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(",")})`;
  return `MULTIPOLYGON(${polygons.map((rings) => `(${rings.map(ringText).join(",")})`).join(",")})`;
}

export function toNeighborhoods(records: DbfRecord[], shapes: Ring[][]): Neighborhood[] {
  if (records.length !== shapes.length) {
    throw new Error(`dbf has ${records.length} records but shp has ${shapes.length} shapes`);
  }
  const neighborhoods = records.map((record, i) => {
    const name = record.NOMBRE ?? "";
    const district = record.NOMDIS ?? "";
    if (!name || !district) throw new Error(`record ${i}: missing NOMBRE or NOMDIS`);
    return { slug: slugify(name), name, district, polygons: groupRings(shapes[i]!) };
  });
  const slugs = neighborhoods.map((n) => n.slug);
  const duplicate = slugs.find((slug, i) => slugs.indexOf(slug) !== i);
  if (duplicate) throw new Error(`duplicate slug: ${duplicate}`);
  return neighborhoods.sort((a, b) => a.slug.localeCompare(b.slug));
}

function sqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildMigration(neighborhoods: Neighborhood[], downloadedOn: string): string {
  const rows = neighborhoods
    .map((n) => `  (${sqlText(n.slug)}, ${sqlText(n.name)}, ${sqlText(n.district)}, ${sqlText(toMultiPolygonWkt(n.polygons))})`)
    .join(",\n");
  return `-- GENERATA da scripts/import-neighborhoods.ts il ${downloadedOn}: non modificare a mano, rigenerare.
-- Barrios ufficiali di Madrid (${neighborhoods.length}). Fonte: Ayuntamiento de Madrid, geoportal, "Barrios municipales",
-- ${SOURCE_URL}
-- Licenza CC BY 4.0 (attribuzione in /legal). Coordinate originali in ETRS89 UTM 30N (EPSG:${SOURCE_SRID}):
-- le trasforma PostGIS in WGS84.
-- Upsert per slug: i barrios già presenti (seed) restano con lo stesso id e prendono i confini veri.

create temporary table neighborhoods_import (
  slug text primary key,
  name text not null,
  district text not null,
  boundary_wkt text not null
);

insert into neighborhoods_import (slug, name, district, boundary_wkt) values
${rows};

-- make_valid + collection_extract: un confine con un'autointersezione resta comunque un MultiPolygon valido.
with official as (
  select
    i.slug,
    i.name,
    i.district,
    extensions.st_multi(
      extensions.st_collectionextract(
        extensions.st_makevalid(extensions.st_geomfromtext(i.boundary_wkt, ${SOURCE_SRID})),
        3
      )
    ) as boundary
  from neighborhoods_import i
)
insert into public.neighborhoods (slug, name, district, boundary, centroid)
select
  o.slug,
  o.name,
  o.district,
  extensions.st_transform(o.boundary, 4326)::extensions.geography,
  -- point on surface, non centroide: cade sempre dentro il barrio (anche se ha una forma a "C").
  extensions.st_transform(extensions.st_pointonsurface(o.boundary), 4326)::extensions.geography
from official o
on conflict (slug) do update
set name = excluded.name,
    district = excluded.district,
    boundary = excluded.boundary,
    centroid = excluded.centroid;

-- Barrios che non sono nell'elenco ufficiale (es. segnaposto): i riferimenti diventano null (on delete set null).
delete from public.neighborhoods n
where not exists (select 1 from neighborhoods_import i where i.slug = n.slug);

drop table neighborhoods_import;

-- I confini sono cambiati: si ricalcola il barrio di organizzazioni ed eventi.
-- Il trigger di organizations non tocca last_activity_at per neighborhood_id.
update public.organizations o
set neighborhood_id = private.neighborhood_for(o.location)
where o.location is not null
  and o.neighborhood_id is distinct from private.neighborhood_for(o.location);

-- events_after_write aggiornerebbe last_activity_at degli organizzatori: qui non è un'attività.
alter table public.events disable trigger events_after_write;

update public.events e
set neighborhood_id = private.neighborhood_for(e.location)
where e.neighborhood_id is distinct from private.neighborhood_for(e.location);

alter table public.events enable trigger events_after_write;
`;
}

async function main(): Promise<void> {
  const target = process.argv[2];
  if (!target || !target.endsWith(".sql")) {
    console.error("Uso: node scripts/import-neighborhoods.ts supabase/migrations/<file>.sql");
    process.exit(1);
  }
  const response = await fetch(SOURCE_URL);
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("zip")) {
    throw new Error(
      `Download fallito (${response.status} ${contentType}). Scarica a mano ${SOURCE_URL} e avvisa il fondatore.`,
    );
  }
  const files = readZip(Buffer.from(await response.arrayBuffer()));
  const pick = (extension: string) => {
    const entry = [...files.entries()].find(([name]) => name.toLowerCase().endsWith(extension));
    if (!entry) throw new Error(`Lo zip non contiene un file ${extension}`);
    return entry[1];
  };
  const projection = pick(".prj").toString("utf8");
  if (!projection.includes("UTM_Zone_30N") || !projection.includes("ETRS_1989")) {
    throw new Error(`Proiezione inattesa (serve ETRS89 UTM 30N): ${projection}`);
  }
  const neighborhoods = toNeighborhoods(readDbf(pick(".dbf")), readShpPolygons(pick(".shp")));
  const downloadedOn = new Date().toISOString().slice(0, 10);
  writeFileSync(resolve(target), buildMigration(neighborhoods, downloadedOn), "utf8");
  console.log(`Scritti ${neighborhoods.length} barrios in ${target}`);
}

// Eseguito solo da riga di comando, non quando i test importano le funzioni.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
