import path from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { CrawlJob, CrawlResult } from "./types";

const root = path.join(process.cwd(), "data", "crawl");
const queuePath = path.join(root, "queue.json");

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

export async function readQueue(): Promise<CrawlJob[]> {
  return readJson<CrawlJob[]>(queuePath, []);
}

export async function writeQueue(jobs: CrawlJob[]): Promise<void> {
  await atomicJson(queuePath, jobs);
}

export async function updateJob(municipalityId: string, update: Partial<CrawlJob>): Promise<CrawlJob> {
  const jobs = await readQueue();
  const index = jobs.findIndex((job) => job.municipalityId === municipalityId);
  if (index < 0) throw new Error(`キューに自治体 ${municipalityId} がありません。`);
  jobs[index] = { ...jobs[index], ...update };
  await writeQueue(jobs);
  return jobs[index];
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
    if (result) results.push(result);
  }
  return results;
}

export async function updateCandidate(
  municipalityCode: string,
  candidateId: string,
  status: CrawlResult["candidates"][number]["status"],
): Promise<void> {
  const jobs = await readQueue();
  const job = jobs.find((item) => item.municipalityCode === municipalityCode);
  if (!job) throw new Error("対象のクロールジョブが見つかりません。");
  const file = path.join(root, "results", job.prefectureCode, `${job.municipalityCode}.json`);
  const result = await readJson<CrawlResult | null>(file, null);
  if (!result) throw new Error("対象のクロール結果が見つかりません。");
  const candidate = result.candidates.find((item) => item.id === candidateId);
  if (!candidate) throw new Error("対象候補が見つかりません。");
  candidate.status = status;
  await atomicJson(file, result);
}
