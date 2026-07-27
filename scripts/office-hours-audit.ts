import path from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { getPublicPortalData } from "../lib/data/repository";
import { officeContactType } from "../lib/support-routing";

type ScanReport = {
  generatedAt: string;
  sourceCount: number;
  scannedSourceCount: number;
  sourceOffset: number;
  requestedType: string;
  discoverRelatedPages: boolean;
  retryReportErrors: boolean;
  candidates: { officeId: string; sourceUrl: string }[];
  errors: { sourceUrl: string; message: string }[];
};

type AuditReason =
  | "verified_full"
  | "verified_hours_only"
  | "no_phone"
  | "no_official_source"
  | "source_unreachable"
  | "manual_review_required"
  | "rejected_cross_office_match"
  | "primary_source_scanned_no_safe_hours";

const rejectedCrossOfficeMatches = new Set([
  "jp-26100-public-assistance",
  "aomori-02343-money",
  "aomori-02361-money",
  "aomori-02362-money",
  "aomori-02367-money",
  "aomori-02381-money",
]);

async function main() {
  const data = await getPublicPortalData();
  const scanPath = path.join(process.cwd(), "data", "crawl", "office-hours-candidates.json");
  const scan = JSON.parse(await readFile(scanPath, "utf8")) as ScanReport;

  if (
    scan.sourceOffset !== 0
    || scan.requestedType !== "all"
    || scan.discoverRelatedPages
    || scan.retryReportErrors
    || scan.sourceCount !== scan.scannedSourceCount
  ) {
    throw new Error("監査レポートには offset=0 / type=all の完了済み通常走査が必要です。");
  }

  const sourceUrls = new Map(data.sources.map((source) => [source.id, source.url]));
  const errors = new Map(scan.errors.map((error) => [error.sourceUrl, error.message]));
  const candidates = new Map(scan.candidates.map((candidate) => [candidate.officeId, candidate.sourceUrl]));
  const counts: Record<AuditReason, number> = {
    verified_full: 0,
    verified_hours_only: 0,
    no_phone: 0,
    no_official_source: 0,
    source_unreachable: 0,
    manual_review_required: 0,
    rejected_cross_office_match: 0,
    primary_source_scanned_no_safe_hours: 0,
  };
  const byContactType: Record<string, Record<AuditReason, number>> = {};

  const offices = data.offices.map((office) => {
    const sourceUrl = office.officialUrl || sourceUrls.get(office.sourceId) || "";
    let reason: AuditReason;
    let detail = "";
    if (office.openingHours && office.closedDays) {
      reason = "verified_full";
    } else if (office.openingHours) {
      reason = "verified_hours_only";
    } else if (!office.phone) {
      reason = "no_phone";
    } else if (!sourceUrl) {
      reason = "no_official_source";
    } else if (errors.has(sourceUrl)) {
      reason = "source_unreachable";
      detail = errors.get(sourceUrl) ?? "";
    } else if (rejectedCrossOfficeMatches.has(office.id) && candidates.has(office.id)) {
      reason = "rejected_cross_office_match";
      detail = "目視審査で、同じページ内の別庁舎・別窓口の受付時間と判定して不採用";
    } else if (candidates.has(office.id)) {
      reason = "manual_review_required";
      detail = `候補取得元: ${candidates.get(office.id)}`;
    } else {
      reason = "primary_source_scanned_no_safe_hours";
    }

    counts[reason] += 1;
    const contactType = officeContactType(office);
    byContactType[contactType] ??= {
      verified_full: 0,
      verified_hours_only: 0,
      no_phone: 0,
      no_official_source: 0,
      source_unreachable: 0,
      manual_review_required: 0,
      rejected_cross_office_match: 0,
      primary_source_scanned_no_safe_hours: 0,
    };
    byContactType[contactType][reason] += 1;

    return {
      officeId: office.id,
      municipalityId: office.municipalityId,
      contactType,
      sourceUrl,
      reason,
      ...(detail ? { detail } : {}),
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    sourceScanGeneratedAt: scan.generatedAt,
    methodology: {
      scope: "公開対象窓口の登録済み公式一次情報URLを全件走査",
      safety:
        "電話番号の周辺250文字以内にある単一の受付時間表現だけを候補化し、別部署・庁舎全体の時間を誤適用しない",
      limitation:
        "「掲載なし」は登録済み一次情報ページ上で安全に特定できなかったことを示し、ウェブ上の不存在を意味しない",
    },
    scan: {
      officialSourceUrls: scan.sourceCount,
      scannedSourceUrls: scan.scannedSourceCount,
      unreachableSourceUrls: scan.errors.length,
      residualCandidates: scan.candidates.length,
    },
    totals: {
      publicOffices: offices.length,
      ...counts,
    },
    byContactType,
    offices,
  };

  const output = path.join(process.cwd(), "reports", "office-hours-audit.json");
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rename(temporary, output);
  console.log(`受付時間監査: ${offices.length}窓口 / ${scan.scannedSourceCount}公式URL`);
  console.log(JSON.stringify(counts, null, 2));
  console.log(`出力: ${output}`);
}

void main();
