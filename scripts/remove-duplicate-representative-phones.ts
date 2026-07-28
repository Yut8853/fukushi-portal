import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { escapeCsv, parseCsv } from "../lib/csv";

const normalizePhone = (value: string) => value.replace(/\D/g, "");

async function rewriteCsv(
  filePath: string,
  update: (rows: Record<string, string>[]) => number,
): Promise<number> {
  const text = (await readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
  const headers = text.slice(0, text.indexOf("\n")).replace(/\r$/, "").split(",");
  const rows = parseCsv(text);
  const changed = update(rows);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(",")),
  ];
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  return changed;
}

async function main() {
  const dataDirectory = path.join(process.cwd(), "data");
  const officesPath = path.join(dataDirectory, "offices.csv");
  const municipalitiesPath = path.join(dataDirectory, "municipalities.csv");
  const offices = parseCsv((await readFile(officesPath, "utf8")).replace(/^\uFEFF/, ""));
  const municipalities = parseCsv(
    (await readFile(municipalitiesPath, "utf8")).replace(/^\uFEFF/, ""),
  );

  const groups = new Map<string, Record<string, string>[]>();
  offices
    .filter((office) => office.id.endsWith("-city-general") && Boolean(office.phone))
    .forEach((office) => {
      const phone = normalizePhone(office.phone);
      const group = groups.get(phone) ?? [];
      group.push(office);
      groups.set(phone, group);
    });
  const duplicatedOfficePhones = new Set(
    [...groups]
      .filter(([, group]) => new Set(group.map((office) => office.municipalityId)).size > 1)
      .map(([phone]) => phone),
  );
  const municipalityPhoneGroups = new Map<string, Record<string, string>[]>();
  municipalities
    .filter((municipality) => Boolean(municipality.representativePhone))
    .forEach((municipality) => {
      const phone = normalizePhone(municipality.representativePhone);
      const group = municipalityPhoneGroups.get(phone) ?? [];
      group.push(municipality);
      municipalityPhoneGroups.set(phone, group);
    });
  const duplicatedMunicipalityPhones = new Set(
    [...municipalityPhoneGroups].filter(([, group]) => group.length > 1).map(([phone]) => phone),
  );
  const duplicatedPhones = new Set([...duplicatedOfficePhones, ...duplicatedMunicipalityPhones]);

  const changedOffices = await rewriteCsv(officesPath, (rows) => {
    let changed = 0;
    rows.forEach((office) => {
      if (
        office.id.endsWith("-city-general") &&
        duplicatedPhones.has(normalizePhone(office.phone))
      ) {
        office.phone = "";
        changed += 1;
      }
    });
    return changed;
  });
  const changedMunicipalities = await rewriteCsv(municipalitiesPath, (rows) => {
    let changed = 0;
    rows.forEach((municipality) => {
      if (duplicatedPhones.has(normalizePhone(municipality.representativePhone))) {
        municipality.representativePhone = "";
        changed += 1;
      }
    });
    return changed;
  });

  console.log(
    `重複代表電話${duplicatedPhones.size}番号を除外: offices ${changedOffices}件 / municipalities ${changedMunicipalities}件`,
  );
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
