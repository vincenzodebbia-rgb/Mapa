import { describe, expect, it } from "vitest";
import { buildAssociations, isExcludedCategory, parseCsv } from "./import-municipal-associations";

// Invented rows only (never real associations in tests or seed). Same columns as the Comune file.
const HEADER =
  '"Num_Inscripcion";"Razon_Social";"Tipo_Via";"Calle";"Numero";"Aproximacion";"Cod_Postal";"Poblacion";"Barrio";"Distrito";"CIF";"Fecha_Registro";"Fecha_IPM";"Primer_Tlfn";"Email";"Internet";"Categoria";"Ambito";"Num_Socios";"NumInscripcion_Fed_Vinculada";"RazonSocial_Fed_Vinculada";"FX_Carga"';

function row(values: { number: string; name: string; cif: string; category: string; barrio?: string; distrito?: string }) {
  return [
    values.number,
    values.name,
    "CALLE",
    "FICTICIA",
    "1",
    "",
    "28000",
    "MADRID",
    values.barrio ?? "Barrio Imaginario",
    values.distrito ?? "Distrito Imaginario",
    values.cif,
    "01/01/2020",
    "",
    "600000000",
    "contacto@example.org",
    "https://example.org",
    values.category,
    "MUNICIPAL",
    "25",
    "",
    "",
    "2026-10-24",
  ]
    .map((value) => `"${value.replace(/"/g, '""')}"`)
    .join(";");
}

function csv(...rows: string[]) {
  return `﻿${[HEADER, ...rows].join("\r\n")}\r\n`;
}

describe("parseCsv", () => {
  it("handles BOM, quotes, doubled quotes, separators and line breaks inside quotes", () => {
    expect(parseCsv('﻿"a";"b"\r\n"x ""y"";z";"1\n2"\r\n')).toEqual([
      ["a", "b"],
      ['x "y";z', "1\n2"],
    ]);
  });
});

describe("buildAssociations", () => {
  it("keeps only the six allowed columns, never phone, email, address or members", () => {
    const { associations } = buildAssociations(
      csv(row({ number: "90001", name: 'ASOCIACION "LA COLMENA" (FICTICIA)', cif: "g-99000011", category: "VECINALES" })),
    );
    expect(associations).toEqual([
      {
        cif: "G99000011",
        name: 'ASOCIACION "LA COLMENA" (FICTICIA)',
        registry_number: "90001",
        district: "Distrito Imaginario",
        neighborhood: "Barrio Imaginario",
        category: "VECINALES",
      },
    ]);
    const serialized = JSON.stringify(associations);
    expect(serialized).not.toContain("600000000");
    expect(serialized).not.toContain("example.org");
    expect(serialized).not.toContain("FICTICIA\",\"1");
  });

  it("merges rows with the same CIF, keeping the first name and adding new categories", () => {
    const { associations, report } = buildAssociations(
      csv(
        row({ number: "90001", name: "PRIMERA (FICTICIA)", cif: "G99000011", category: "VECINALES" }),
        row({ number: "90002", name: "SEGUNDA (FICTICIA)", cif: "G99000011", category: "CULTURALES Y CASAS REGIONALES" }),
        row({ number: "90003", name: "TERCERA (FICTICIA)", cif: "G99000011", category: "VECINALES" }),
      ),
    );
    expect(associations).toHaveLength(1);
    expect(associations[0]?.name).toBe("PRIMERA (FICTICIA)");
    expect(associations[0]?.category).toBe("VECINALES | CULTURALES Y CASAS REGIONALES");
    expect(report.merged).toBe(2);
  });

  it("skips the Comerciantes category, empty and personal or malformed CIFs", () => {
    const { associations, report } = buildAssociations(
      csv(
        row({ number: "1", name: "COMERCIO (FICTICIA)", cif: "G99000022", category: "COMERCIANTES,EMPRESARIOS,PROFESIONALES Y AUTONOMOS" }),
        row({ number: "2", name: "SIN CIF (FICTICIA)", cif: "", category: "VECINALES" }),
        row({ number: "3", name: "DNI (FICTICIA)", cif: "12345678Z", category: "VECINALES" }),
        row({ number: "4", name: "NIE (FICTICIA)", cif: "X1234567L", category: "VECINALES" }),
        row({ number: "5", name: "BUENA (FICTICIA)", cif: "G99000033", category: "JUVENILES" }),
      ),
    );
    expect(associations.map((association) => association.cif)).toEqual(["G99000033"]);
    expect(report).toMatchObject({ rows: 5, imported: 1, skippedCategory: 1, skippedNoCif: 1, skippedInvalidCif: 2 });
  });

  it("fails loudly when a required column is missing", () => {
    expect(() => buildAssociations('"CIF";"Razon_Social"\r\n"G99000011";"X"\r\n')).toThrow(/Missing column/);
  });
});

describe("isExcludedCategory", () => {
  it("ignores accents, spaces, commas and case", () => {
    expect(isExcludedCategory("Comerciantes, empresarios, profesionales y autónomos")).toBe(true);
    expect(isExcludedCategory("COMERCIANTES,EMPRESARIOS,PROFESIONALES Y AUTONOMOS")).toBe(true);
    expect(isExcludedCategory("VECINALES")).toBe(false);
  });
});
