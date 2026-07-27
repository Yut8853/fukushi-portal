import { createHash } from "node:crypto";
import path from "node:path";
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { escapeCsv, type CsvRow } from "../lib/csv";
import { getPortalData } from "../lib/data/repository";
import { officeSchema, programSchema, sourceSchema } from "../lib/data/schemas";
import { sameOfficialSite } from "./security";
import { readResultByCode, reviewCandidate } from "./store";
import type { CrawlCandidate, PublicationTarget } from "./types";

const defaultDataDirectory = path.join(process.cwd(), "data");

export type PublishPreview = {
  municipalityCode: string;
  municipalityName: string;
  candidateId: string;
  target: Exclude<PublicationTarget, "">;
  entityId: string;
  sourceId: string;
  sourceReused: boolean;
  entity: CsvRow;
  source: CsvRow;
};

function dateInJapan(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function stableId(prefix: string, value: string): string {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 12);
  return `${prefix}-${hash}`;
}

function bool(value: boolean | null): string {
  return value === null ? "" : String(value);
}

function requirePublishable(candidate: CrawlCandidate): asserts candidate is CrawlCandidate & {
  publicationTarget: Exclude<PublicationTarget, "">;
} {
  if (candidate.status !== "verified") {
    throw new Error(`候補はverifiedである必要があります（現在: ${candidate.status}）。`);
  }
  if (!candidate.publicationTarget) throw new Error("公開先（窓口または制度）を選択してください。");
  if (!candidate.categoryId) throw new Error("困りごとの分類を選択してください。");
  if (!candidate.title.trim()) throw new Error("公式名称を入力してください。");
  if (!candidate.description.trim()) throw new Error("説明を入力してください。");
  if (!candidate.sourceUrl.trim()) throw new Error("出典URLがありません。");
  const sourceUrl = new URL(candidate.sourceUrl);
  if (!["http:", "https:"].includes(sourceUrl.protocol)) throw new Error("出典URLはHTTP(S)で指定してください。");
  if (candidate.publicationTarget === "office") {
    if (!candidate.phone && !candidate.officialUrl && !candidate.contactFormUrl && !candidate.email) {
      throw new Error("公開窓口には電話・公式URL・フォーム・メールのいずれかが必要です。");
    }
    return;
  }
  if (!candidate.plainTitle.trim()) throw new Error("制度の分かりやすい名称を入力してください。");
  if (!candidate.targetPeople.trim()) throw new Error("制度の対象者を入力してください。");
  if (!candidate.supportType.trim()) throw new Error("制度の支援種別を選択してください。");
  if (candidate.repaymentRequired === null) throw new Error("返済の要否を選択してください。");
}

async function loadCandidate(municipalityCode: string, candidateId: string) {
  const result = await readResultByCode(municipalityCode);
  if (!result) throw new Error(`自治体コード ${municipalityCode} のクロール結果がありません。`);
  const candidate = result.candidates.find((item) => item.id === candidateId);
  if (!candidate) throw new Error(`候補 ${candidateId} が見つかりません。`);
  return { result, candidate };
}

export async function previewCandidatePublication(
  municipalityCode: string,
  candidateId: string,
): Promise<PublishPreview> {
  const { result, candidate } = await loadCandidate(municipalityCode, candidateId);
  requirePublishable(candidate);
  const data = await getPortalData();
  const municipality = data.municipalities.find((item) => item.id === candidate.municipalityId);
  if (!municipality) throw new Error(`自治体ID ${candidate.municipalityId} がポータルデータにありません。`);
  if (!data.categories.some((item) => item.id === candidate.categoryId)) {
    throw new Error(`分類ID ${candidate.categoryId} がcategories.csvにありません。`);
  }

  const sourceUrl = new URL(candidate.sourceUrl).href;
  if (!sameOfficialSite(new URL(sourceUrl), new URL(result.officialUrl))) {
    throw new Error("出典URLが自治体公式サイトと同一ドメインではありません。別の一次情報として人間が個別登録してください。");
  }
  const existingSource = data.sources.find((item) => item.url === sourceUrl);
  if (existingSource && existingSource.status !== "published") {
    throw new Error(`既存出典 ${existingSource.id} がpublishedではありません。先に出典を確認してください。`);
  }
  const sourceId = existingSource?.id
    ?? stableId(`source-crawl-${municipalityCode}`, sourceUrl);
  const entityId = stableId(
    `crawl-${municipalityCode}-${candidate.publicationTarget}`,
    `${candidate.municipalityId}:${candidate.id}:${candidate.publicationTarget}`,
  );
  const checkedAt = dateInJapan();
  const source: CsvRow = existingSource
    ? {
      id: existingSource.id,
      title: existingSource.title,
      url: existingSource.url,
      publisher: existingSource.publisher,
      sourceType: existingSource.sourceType,
      status: existingSource.status,
      lastVerifiedAt: existingSource.lastVerifiedAt,
    }
    : {
      id: sourceId,
      title: candidate.title,
      url: sourceUrl,
      publisher: result.municipalityName,
      sourceType: "official",
      status: "published",
      lastVerifiedAt: checkedAt,
    };
  const entity: CsvRow = candidate.publicationTarget === "office"
    ? {
      id: entityId,
      municipalityId: candidate.municipalityId,
      categoryId: candidate.categoryId,
      name: candidate.title,
      plainName: candidate.plainTitle,
      department: candidate.department,
      description: candidate.description,
      postalCode: candidate.postalCode,
      address: candidate.address,
      phone: candidate.phone,
      fax: candidate.fax,
      email: candidate.email,
      contactFormUrl: candidate.contactFormUrl,
      officialUrl: candidate.officialUrl,
      openingHours: candidate.openingHours,
      closedDays: candidate.closedDays,
      reservationRequired: bool(candidate.reservationRequired),
      availableMethods: candidate.availableMethods,
      accessibility: candidate.accessibility,
      languages: candidate.languages,
      emergencyAlternative: candidate.emergencyAlternative,
      serviceArea: "",
      eligibilityConditions: "",
      sourceId,
      status: "published",
      lastVerifiedAt: checkedAt,
    }
    : {
      id: entityId,
      name: candidate.title,
      plainName: candidate.plainTitle,
      categoryId: candidate.categoryId,
      scope: "municipality",
      description: candidate.description,
      targetPeople: candidate.targetPeople,
      supportType: candidate.supportType,
      repaymentRequired: bool(candidate.repaymentRequired),
      amountDescription: candidate.amountDescription,
      applicationDeadline: candidate.applicationDeadline,
      requiredDocuments: candidate.requiredDocuments,
      documentsOptionalNote: candidate.documentsOptionalNote,
      applicationFlow: candidate.applicationFlow,
      officeId: "",
      municipalityId: candidate.municipalityId,
      sourceId,
      status: "published",
      lastVerifiedAt: checkedAt,
    };

  const sourceResult = sourceSchema.safeParse(source);
  if (!sourceResult.success) {
    throw new Error(`出典データが不正です: ${sourceResult.error.issues.map((item) => item.message).join(" / ")}`);
  }
  const entityResult = candidate.publicationTarget === "office"
    ? officeSchema.safeParse(entity)
    : programSchema.safeParse(entity);
  if (!entityResult.success) {
    throw new Error(`公開データが不正です: ${entityResult.error.issues.map((item) => `${item.path.join(".")}: ${item.message}`).join(" / ")}`);
  }

  const duplicate = candidate.publicationTarget === "office"
    ? data.offices.find((item) =>
      item.id === entityId
      || (item.municipalityId === candidate.municipalityId
        && item.name === candidate.title
        && Boolean(item.phone)
        && item.phone === candidate.phone),
    )
    : data.programs.find((item) =>
      item.id === entityId
      || (item.municipalityId === candidate.municipalityId && item.name === candidate.title),
    );
  if (duplicate) throw new Error(`同一候補の可能性がある既存データ「${duplicate.id}」があります。先に統合判断してください。`);

  return {
    municipalityCode,
    municipalityName: result.municipalityName,
    candidateId,
    target: candidate.publicationTarget,
    entityId,
    sourceId,
    sourceReused: Boolean(existingSource),
    entity,
    source,
  };
}

async function appendCsvRow(file: string, row: CsvRow): Promise<void> {
  const current = await readFile(file, "utf8");
  const headerLine = current.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0];
  const headers = headerLine.split(",").map((item) => item.trim());
  const missing = headers.filter((header) => !(header in row));
  if (missing.length) throw new Error(`${path.basename(file)}への書き込み項目が不足しています: ${missing.join(", ")}`);
  const rendered = headers.map((header) => escapeCsv(row[header] ?? "")).join(",");
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${current.trimEnd()}\n${rendered}\n`, "utf8");
  await rename(temporary, file);
}

async function restoreFile(backup: string, target: string): Promise<void> {
  const temporary = `${target}.${process.pid}.restore`;
  await copyFile(backup, temporary);
  await rename(temporary, target);
}

export async function applyPublicationPreview(
  preview: PublishPreview,
  dataDirectory: string,
  finalize: () => Promise<void> = async () => undefined,
): Promise<string> {
  const sourceFile = path.join(dataDirectory, "sources.csv");
  const targetFile = path.join(dataDirectory, preview.target === "office" ? "offices.csv" : "programs.csv");
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const backupDirectory = path.join(
    dataDirectory,
    "crawl",
    "backups",
    `${timestamp}-${preview.municipalityCode}-${preview.candidateId.slice(0, 8)}`,
  );
  await mkdir(backupDirectory, { recursive: true });
  const sourceBackup = path.join(backupDirectory, "sources.csv");
  const targetBackup = path.join(backupDirectory, path.basename(targetFile));
  await Promise.all([
    copyFile(sourceFile, sourceBackup),
    copyFile(targetFile, targetBackup),
  ]);
  await writeFile(path.join(backupDirectory, "manifest.json"), `${JSON.stringify(preview, null, 2)}\n`, "utf8");

  try {
    if (!preview.sourceReused) await appendCsvRow(sourceFile, preview.source);
    await appendCsvRow(targetFile, preview.entity);
    await getPortalData(dataDirectory);
    await finalize();
    return backupDirectory;
  } catch (error) {
    await Promise.all([
      restoreFile(sourceBackup, sourceFile),
      restoreFile(targetBackup, targetFile),
    ]);
    throw new Error(`公開に失敗したためCSVを復元しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function publishCandidate(
  municipalityCode: string,
  candidateId: string,
  actor: string,
): Promise<{ preview: PublishPreview; backupDirectory: string }> {
  if (!actor.trim()) throw new Error("公開担当者名を指定してください。");
  const preview = await previewCandidatePublication(municipalityCode, candidateId);
  const backupDirectory = await applyPublicationPreview(
    preview,
    defaultDataDirectory,
    async () => {
    await reviewCandidate(
      municipalityCode,
      candidateId,
      {
        publishedEntityId: preview.entityId,
        publishedAt: new Date().toISOString(),
        reviewNote: `CSVへ公開: ${preview.entityId}`,
      },
      "publish",
      actor,
      "published",
    );
    },
  );
  return { preview, backupDirectory };
}
