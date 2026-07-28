import path from "node:path";
import { readFile, rename, writeFile } from "node:fs/promises";
import { escapeCsv, parseCsv } from "../lib/csv";
import { getPublicPortalData } from "../lib/data/repository";
import { officeContactType } from "../lib/support-routing";

type VerifiedHours = { openingHours: string; closedDays: string };

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

function addressKey(address: string): string {
  return address.replace(/[\s　]+/g, "").replace(/[‐－ー]/g, "-");
}

function addVerified(
  values: Map<string, VerifiedHours>,
  conflicts: Set<string>,
  key: string,
  hours: VerifiedHours,
) {
  if (!key || conflicts.has(key)) return;
  const current = values.get(key);
  if (
    current &&
    (current.openingHours !== hours.openingHours || current.closedDays !== hours.closedDays)
  ) {
    values.delete(key);
    conflicts.add(key);
    return;
  }
  values.set(key, hours);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const data = await getPublicPortalData();
  const verifiedByPhone = new Map<string, VerifiedHours>();
  const verifiedByAddress = new Map<string, VerifiedHours>();
  const phoneConflicts = new Set<string>();
  const addressConflicts = new Set<string>();
  for (const office of data.offices) {
    if (!office.openingHours) continue;
    const verified = {
      openingHours: office.openingHours,
      closedDays: office.closedDays,
    };
    if (office.phone)
      addVerified(verifiedByPhone, phoneConflicts, phoneKey(office.phone), verified);
    if (office.address)
      addVerified(verifiedByAddress, addressConflicts, addressKey(office.address), verified);
  }
  const updates = new Map<string, { openingHours: string; closedDays: string }>();
  const byType = new Map<string, number>();
  for (const office of data.offices) {
    if (office.openingHours) continue;
    const verified =
      (office.phone ? verifiedByPhone.get(phoneKey(office.phone)) : undefined) ??
      (office.address ? verifiedByAddress.get(addressKey(office.address)) : undefined);
    if (!verified) continue;
    updates.set(office.id, verified);
    const type = officeContactType(office);
    byType.set(type, (byType.get(type) ?? 0) + 1);
  }
  console.log(`同一電話番号から反映可能: ${updates.size}件`);
  for (const [type, count] of [...byType].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}件`);
  }
  if (!apply || updates.size === 0) {
    if (!apply) console.log("反映するには --apply を指定してください。");
    return;
  }

  const officesPath = path.join(process.cwd(), "data", "offices.csv");
  const text = await readFile(officesPath, "utf8");
  const [headerLine, ...lines] = text.trimEnd().split(/\r?\n/);
  const headers = headerLine.split(",");
  let updated = 0;
  const outputLines = lines.map((line) => {
    const officeId = line.slice(0, line.indexOf(","));
    const update = updates.get(officeId);
    if (!update) return line;
    const row = parseCsv(`${headerLine}\n${line}\n`)[0];
    if (!row || row.openingHours) return line;
    row.openingHours = update.openingHours;
    row.closedDays = update.closedDays;
    row.lastVerifiedAt = new Date().toISOString().slice(0, 10);
    updated += 1;
    return headers.map((header) => escapeCsv(row[header] ?? "")).join(",");
  });
  const temporary = `${officesPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${headerLine}\n${outputLines.join("\n")}\n`, "utf8");
  await rename(temporary, officesPath);
  console.log(`受付時間を反映: ${updated}件`);
}

void main();
