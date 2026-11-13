// Importa l'elenco delle associazioni del Comune di Madrid in public.municipal_associations, per riconoscerle dal NIF.
//
// Fonte: Ayuntamiento de Madrid, datos.madrid.es, "Entidades de participación ciudadana. Asociaciones (Sección 1ª)",
// dataset 206117, CSV con `;`, UTF-8 con BOM, licenza CC BY 4.0 (attribuzione in /legal).
// Il nome del file cambia a ogni aggiornamento del Comune: passa l'URL nuovo (o un file scaricato) come argomento.
//
// Si tengono SOLO 6 colonne: CIF, Razon_Social, Num_Inscripcion, Distrito, Barrio, Categoria. Mai telefono, email,
// indirizzo, web o numero di soci (docs/PRIVACY_AND_OWNERSHIP.md). Righe con lo stesso CIF unite in una.
// La categoria "Comerciantes, empresarios, profesionales y autónomos" non si importa (decisione del 29 ottobre).
//
// Uso (lo lancia il fondatore):
//   node scripts/import-municipal-associations.ts [URL o file]            → prova a secco: solo conteggi, nessuna scrittura
//   node --env-file=<file con le chiavi di PRODUZIONE> scripts/import-municipal-associations.ts [URL o file] --write
//   ... --write --prune   → cancella anche le righe che non sono più nell'elenco
// Variabili per --write: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY. Su mapa-dev si rifiuta: lì solo i NIF fittizi della seed.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

export const SOURCE_URL =
  "https://datos.madrid.es/dataset/206117-0-entidades-participa-asociaciones/resource/206117-8-entidades-participa-asociaciones/download/206117_20261024_054430.csv";

// Progetto Supabase di sviluppo (lo stesso di `npm run db:types`).
const DEV_PROJECT_REF = "jvthbqxmequhgliofnpb";
const BATCH_SIZE = 500;

export type MunicipalAssociation = {
  cif: string;
  name: string;
  registry_number: string | null;
  district: string | null;
  neighborhood: string | null;
  category: string | null;
};

export type ImportReport = {
  rows: number;
  imported: number;
  merged: number;
  skippedCategory: number;
  skippedNoCif: number;
  skippedInvalidCif: number;
  skippedNoName: number;
};

/** Lettore CSV per file separati da `;`, con campi tra virgolette, virgolette doppie e a capo dentro le virgolette. */
export function parseCsv(text: string, separator = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/^﻿/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

/** Come private.normalize_nif. */
export function normalizeNif(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Come private.is_entity_nif (il vincolo sulla colonna): mai un DNI/NIE. */
export function isEntityNif(nif: string): boolean {
  return /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(nif);
}

function simplify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const EXCLUDED_CATEGORY = simplify("Comerciantes, empresarios, profesionales y autónomos");

export function isExcludedCategory(category: string): boolean {
  return simplify(category) === EXCLUDED_CATEGORY;
}

const clean = (value: string | undefined, max: number): string | null => {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

/** Testo CSV → righe per municipal_associations, più ciò che si è saltato e perché. */
export function buildAssociations(csv: string): { associations: MunicipalAssociation[]; report: ImportReport } {
  const [header, ...records] = parseCsv(csv);
  if (!header) throw new Error("Empty CSV");
  const column = (name: string) => {
    const index = header.findIndex((value) => value.trim() === name);
    if (index < 0) throw new Error(`Missing column ${name}`);
    return index;
  };
  const cifIndex = column("CIF");
  const nameIndex = column("Razon_Social");
  const numberIndex = column("Num_Inscripcion");
  const districtIndex = column("Distrito");
  const neighborhoodIndex = column("Barrio");
  const categoryIndex = column("Categoria");

  const report: ImportReport = {
    rows: records.length,
    imported: 0,
    merged: 0,
    skippedCategory: 0,
    skippedNoCif: 0,
    skippedInvalidCif: 0,
    skippedNoName: 0,
  };
  const byCif = new Map<string, MunicipalAssociation>();

  for (const record of records) {
    const category = clean(record[categoryIndex], 200);
    if (category && isExcludedCategory(category)) {
      report.skippedCategory++;
      continue;
    }
    const cif = normalizeNif(record[cifIndex] ?? "");
    if (!cif) {
      report.skippedNoCif++;
      continue;
    }
    if (!isEntityNif(cif)) {
      report.skippedInvalidCif++;
      continue;
    }
    const name = clean(record[nameIndex], 300);
    if (!name) {
      report.skippedNoName++;
      continue;
    }
    const existing = byCif.get(cif);
    if (existing) {
      // Lo stesso CIF due volte (nuove iscrizioni): si tengono il primo nome e i primi dati, si aggiunge l'eventuale categoria nuova.
      report.merged++;
      if (category && !existing.category?.split(" | ").includes(category)) {
        existing.category = existing.category ? `${existing.category} | ${category}`.slice(0, 500) : category;
      }
      continue;
    }
    byCif.set(cif, {
      cif,
      name,
      registry_number: clean(record[numberIndex], 50),
      district: clean(record[districtIndex], 100),
      neighborhood: clean(record[neighborhoodIndex], 100),
      category,
    });
  }

  const associations = [...byCif.values()];
  report.imported = associations.length;
  return { associations, report };
}

async function readSource(source: string): Promise<string> {
  if (/^https:\/\//.test(source)) {
    const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
    return new TextDecoder("utf-8").decode(await response.arrayBuffer());
  }
  return readFileSync(resolve(source), "utf8");
}

async function writeAssociations(associations: MunicipalAssociation[], prune: boolean): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required with --write");
  if (url.includes(DEV_PROJECT_REF)) {
    throw new Error("Refusing to write to mapa-dev: there the registry holds only the fictitious NIFs of the seed.");
  }
  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const importedAt = new Date().toISOString();

  for (let start = 0; start < associations.length; start += BATCH_SIZE) {
    const batch = associations.slice(start, start + BATCH_SIZE).map((row) => ({ ...row, imported_at: importedAt }));
    const { error } = await supabase.from("municipal_associations").upsert(batch, { onConflict: "cif" });
    if (error) throw new Error(`Upsert failed: ${error.message}`);
    console.log(`Written ${Math.min(start + BATCH_SIZE, associations.length)}/${associations.length}`);
  }

  if (prune) {
    // Le righe che non sono in questo file hanno tenuto il vecchio imported_at: sono uscite dall'elenco.
    const { error, count } = await supabase
      .from("municipal_associations")
      .delete({ count: "exact" })
      .lt("imported_at", importedAt);
    if (error) throw new Error(`Prune failed: ${error.message}`);
    console.log(`Removed ${count ?? 0} rows no longer in the registry`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const prune = args.includes("--prune");
  const source = args.find((arg) => !arg.startsWith("--")) ?? SOURCE_URL;
  if (prune && !write) throw new Error("--prune needs --write");

  const { associations, report } = buildAssociations(await readSource(source));
  console.log(report);
  if (!write) {
    console.log("Dry run: nothing written. Add --write to import.");
    return;
  }
  await writeAssociations(associations, prune);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
