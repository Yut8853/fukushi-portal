import path from "node:path";
import { writeFile } from "node:fs/promises";
import { escapeCsv, readCsvFile } from "../lib/csv";

const officesPath = path.join(process.cwd(), "data", "offices.csv");

async function main() {
  const offices = await readCsvFile(officesPath);
  const headers = Object.keys(offices[0] ?? {});
  const groups = new Map<string, typeof offices>();

  offices
    .filter((office) => office.status === "published" && office.contactType === "direct")
    .forEach((office) => {
      const key = `${office.municipalityId}:${office.categoryId}`;
      const group = groups.get(key) ?? [];
      group.push(office);
      groups.set(key, group);
    });

  const ambiguousKeys = new Set(
    [...groups.entries()]
      .filter(([, group]) => group.length > 1 && group.some((office) => !office.serviceArea))
      .map(([key]) => key),
  );
  let quarantined = 0;
  const lines = offices.map((office) => {
    const key = `${office.municipalityId}:${office.categoryId}`;
    const shouldQuarantine =
      office.status === "published" &&
      office.contactType === "direct" &&
      ambiguousKeys.has(key) &&
      !office.serviceArea;
    if (shouldQuarantine) quarantined += 1;
    return headers
      .map((header) =>
        escapeCsv(header === "status" && shouldQuarantine ? "review_required" : office[header]),
      )
      .join(",");
  });

  await writeFile(officesPath, `${headers.join(",")}\n${lines.join("\n")}\n`, "utf8");
  console.log(`${ambiguousKeys.size}組の管轄未確認窓口${quarantined}件をreview_requiredへ変更しました。`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
