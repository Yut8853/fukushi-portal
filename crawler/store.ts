import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import type {
  CandidateStatus,
  CrawlCandidate,
  CrawlJob,
  CrawlResult,
  VerificationAction,
  VerificationLog,
} from "./types";

const root = path.join(process.cwd(), "data", "crawl");
const queuePath = path.join(root, "queue.json");
const verificationLogPath = path.join(root, "verification-log.json");

export type CandidateReviewUpdate = Partial<Pick<CrawlCandidate,
  | "publicationTarget"
  | "categoryId"
  | "title"
  | "plainTitle"
  | "department"
  | "description"
  | "targetPeople"
  | "supportType"
  | "amountDescription"
  | "repaymentRequired"
  | "applicationDeadline"
  | "requiredDocuments"
  | "documentsOptionalNote"
  | "applicationFlow"
  | "postalCode"
  | "address"
  | "phone"
  | "fax"
  | "email"
  | "contactFormUrl"
  | "openingHours"
  | "closedDays"
  | "reservationRequired"
  | "availableMethods"
  | "accessibility"
  | "languages"
  | "emergencyAlternative"
  | "officialUrl"
  | "publishedEntityId"
  | "publishedAt"
  | "reviewNote"
>>;

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function atomicJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

async function withLock<T>(target: string, operation: () => Promise<T>): Promise<T> {
  const lock = `${target}.lock`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let handle: Awaited<ReturnType<typeof open>>;
    try {
      handle = await open(lock, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const lockAge = await stat(lock)
        .then((item) => Date.now() - item.mtimeMs)
        .catch(() => 0);
      if (lockAge > 30_000) {
        await unlink(lock).catch(async (removeError) => {
          if ((removeError as NodeJS.ErrnoException).code === "EISDIR"
            || (removeError as NodeJS.ErrnoException).code === "EPERM") {
            await rmdir(lock).catch(() => undefined);
          }
        });
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
      continue;
    }
    try {
      await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`, "utf8");
      return await operation();
    } finally {
      await handle.close().catch(() => undefined);
      await unlink(lock).catch(() => undefined);
    }
  }
  throw new Error(`更新ロックを取得できませんでした: ${target}`);
}

function normalizeCandidate(candidate: CrawlCandidate): CrawlCandidate {
  return {
    ...candidate,
    publicationTarget: candidate.publicationTarget ?? "",
    reviewer: candidate.reviewer ?? "",
    reviewNote: candidate.reviewNote ?? "",
    reviewedAt: candidate.reviewedAt ?? "",
    publishedEntityId: candidate.publishedEntityId ?? "",
    publishedAt: candidate.publishedAt ?? "",
    emergencyAlternative: candidate.emergencyAlternative ?? "",
    postalCode: candidate.postalCode ?? "",
  };
}

function normalizeResult(result: CrawlResult): CrawlResult {
  return { ...result, schemaVersion: 2, candidates: result.candidates.map(normalizeCandidate) };
}

function assertVerifiable(candidate: CrawlCandidate): void {
  if (!candidate.publicationTarget) throw new Error("公開先（窓口または制度）を選択してください。");
  if (!candidate.categoryId.trim()) throw new Error("困りごとの分類を選択してください。");
  if (!candidate.title.trim()) throw new Error("公式名称を入力してください。");
  if (!candidate.description.trim()) throw new Error("説明を入力してください。");
  if (!candidate.sourceUrl.trim()) throw new Error("出典URLがありません。");
  if (candidate.publicationTarget === "office") {
    if (!candidate.phone && !candidate.officialUrl && !candidate.contactFormUrl && !candidate.email) {
      throw new Error("窓口には電話・公式URL・フォーム・メールのいずれかが必要です。");
    }
    return;
  }
  if (!candidate.plainTitle.trim()) throw new Error("制度の分かりやすい名称を入力してください。");
  if (!candidate.targetPeople.trim()) throw new Error("制度の対象者を入力してください。");
  if (!candidate.supportType.trim()) throw new Error("制度の支援種別を選択してください。");
  if (candidate.repaymentRequired === null) throw new Error("返済の要否を選択してください。");
}

export async function readQueue(): Promise<CrawlJob[]> {
  return readJson<CrawlJob[]>(queuePath, []);
}

export async function writeQueue(jobs: CrawlJob[]): Promise<void> {
  await atomicJson(queuePath, jobs);
}

export async function updateJob(municipalityId: string, update: Partial<CrawlJob>): Promise<CrawlJob> {
  return withLock(queuePath, async () => {
    const jobs = await readQueue();
    const index = jobs.findIndex((job) => job.municipalityId === municipalityId);
    if (index < 0) throw new Error(`キューに自治体 ${municipalityId} がありません。`);
    jobs[index] = { ...jobs[index], ...update };
    await atomicJson(queuePath, jobs);
    return jobs[index];
  });
}

export async function writeResult(result: CrawlResult): Promise<void> {
  const file = path.join(root, "results", result.job.prefectureCode, `${result.municipalityCode}.json`);
  await atomicJson(file, result);
}

export async function readAllResults(): Promise<CrawlResult[]> {
  const jobs = await readQueue();
  const results: CrawlResult[] = [];
  for (const job of jobs) {
    const file = path.join(root, "results", job.prefectureCode, `${job.municipalityCode}.json`);
    const result = await readJson<CrawlResult | null>(file, null);
    if (result) results.push(normalizeResult(result));
  }
  return results;
}

export async function readResultByCode(municipalityCode: string): Promise<CrawlResult | null> {
  const jobs = await readQueue();
  const job = jobs.find((item) => item.municipalityCode === municipalityCode);
  if (!job) return null;
  const file = path.join(root, "results", job.prefectureCode, `${job.municipalityCode}.json`);
  const result = await readJson<CrawlResult | null>(file, null);
  return result ? normalizeResult(result) : null;
}

export async function readVerificationLogs(): Promise<VerificationLog[]> {
  return readJson<VerificationLog[]>(verificationLogPath, []);
}

async function appendVerificationLog(log: VerificationLog): Promise<void> {
  await withLock(verificationLogPath, async () => {
    const logs = await readVerificationLogs();
    logs.push(log);
    await atomicJson(verificationLogPath, logs);
  });
}

export async function reviewCandidate(
  municipalityCode: string,
  candidateId: string,
  update: CandidateReviewUpdate,
  action: VerificationAction,
  actor: string,
  nextStatus?: CandidateStatus,
): Promise<CrawlCandidate> {
  const reviewer = actor.trim();
  if (!reviewer) throw new Error("確認者名を入力してください。");
  const jobs = await readQueue();
  const job = jobs.find((item) => item.municipalityCode === municipalityCode);
  if (!job) throw new Error("対象のクロールジョブが見つかりません。");
  const file = path.join(root, "results", job.prefectureCode, `${job.municipalityCode}.json`);
  let previousStatus: CandidateStatus = "review_required";
  let allCandidatesClosed = false;
  const candidate = await withLock(file, async () => {
    const stored = await readJson<CrawlResult | null>(file, null);
    if (!stored) throw new Error("対象のクロール結果が見つかりません。");
    const result = normalizeResult(stored);
    const target = result.candidates.find((item) => item.id === candidateId);
    if (!target) throw new Error("対象候補が見つかりません。");
    if (target.status === "published" && action !== "publish") {
      throw new Error("公開済み候補は編集できません。CSV側で訂正してください。");
    }
    previousStatus = target.status;
    Object.assign(target, update);
    if (nextStatus) target.status = nextStatus;
    if (nextStatus === "verified") assertVerifiable(target);
    target.reviewer = reviewer;
    target.reviewedAt = new Date().toISOString();
    target.reviewNote = update.reviewNote?.trim() ?? target.reviewNote;
    allCandidatesClosed = result.candidates.every((item) =>
      item.status === "published" || item.status === "rejected",
    );
    await atomicJson(file, result);
    return target;
  });
  await appendVerificationLog({
    id: randomUUID(),
    municipalityCode,
    candidateId,
    action,
    actor: reviewer,
    note: candidate.reviewNote,
    previousStatus,
    newStatus: candidate.status,
    createdAt: new Date().toISOString(),
    publishedEntityId: candidate.publishedEntityId,
  });
  if (allCandidatesClosed) {
    await updateJob(job.municipalityId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      lastError: "",
    });
  }
  return candidate;
}
