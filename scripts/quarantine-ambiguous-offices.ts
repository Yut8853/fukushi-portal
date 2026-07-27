import path from "node:path";
import { writeFile } from "node:fs/promises";
import { escapeCsv, readCsvFile } from "../lib/csv";

const officesPath = path.join(process.cwd(), "data", "offices.csv");

function ambiguityKey(office: Record<string, string>): string | null {
  if (office.contactType === "self-reliance") {
    return `${office.municipalityId}:self-reliance`;
  }
  if (office.contactType === "direct") {
    return `${office.municipalityId}:direct:${office.categoryId}`;
  }
  return null;
}

async function main() {
  const offices = await readCsvFile(officesPath);
  const headers = Object.keys(offices[0] ?? {});
  const groups = new Map<string, typeof offices>();

  offices
    .filter((office) => office.status === "published" && ambiguityKey(office))
    .forEach((office) => {
      const key = ambiguityKey(office)!;
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
    const key = ambiguityKey(office);
    const shouldQuarantine =
      office.status === "published" &&
      key !== null &&
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
