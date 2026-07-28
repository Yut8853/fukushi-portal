import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { escapeCsv, parseCsv, readCsvFile } from "../lib/csv";

const dataDirectory = path.join(process.cwd(), "data");
const officesPath = path.join(dataDirectory, "offices.csv");

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

async function main() {
  const officeText = (await readFile(officesPath, "utf8")).replace(/^\uFEFF/, "");
  const [headerLine] = officeText.split(/\r?\n/, 1);
  const headers = parseCsv(`${headerLine}\n`)[0]
    ? Object.keys(parseCsv(`${headerLine}\n`)[0])
    : headerLine.split(",");
  const offices = await readCsvFile(officesPath);
  const municipalities = await readCsvFile(path.join(dataDirectory, "municipalities.csv"));
  const representativePhones = new Map(
    municipalities.map((item) => [item.id, normalizePhone(item.representativePhone)]),
  );
  const nextHeaders = [
    ...headers.filter((item) => !["contactType", "verificationLevel"].includes(item)),
    "contactType",
    "verificationLevel",
  ];
  const lines = offices.map((office) => {
    const sameAsRepresentative =
      Boolean(office.phone) &&
      normalizePhone(office.phone) === representativePhones.get(office.municipalityId);
    const contactType =
      sameAsRepresentative || office.categoryId === "unknown" || office.id.includes("city-general")
        ? "representative"
        : office.id.includes("self-reliance") || office.plainName.includes("自立相談")
          ? "self-reliance"
          : "direct";
    return nextHeaders
      .map((header) =>
        escapeCsv(
          header === "contactType"
            ? contactType
            : header === "verificationLevel"
              ? "primary_source_import"
              : (office[header] ?? ""),
        ),
      )
      .join(",");
  });
  await writeFile(officesPath, `${nextHeaders.join(",")}\n${lines.join("\n")}\n`, "utf8");
  console.log(`offices.csv: ${lines.length}件へcontactTypeとverificationLevelを追加しました。`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
