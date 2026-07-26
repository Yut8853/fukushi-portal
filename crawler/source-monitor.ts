import path from "node:path";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { canCrawl, fetchWithRetry } from "./fetcher";
import { getCrawlerConfig } from "./config";
import type { Source } from "../lib/data/schemas";

const statePath = path.join(process.cwd(), "data", "source-monitor.json");
const maxDocumentBytes = 20 * 1024 * 1024;

export type SourceMonitorStatus = "ok" | "changed" | "blocked_by_robots" | "failed";

export type SourceMonitorRecord = {
  sourceId: string;
  url: string;
  status: SourceMonitorStatus;
  checkedAt: string;
  changedAt: string;
  httpStatus: number | null;
  contentType: string;
  contentLength: number;
  contentHash: string;
  previousHash: string;
  error: string;
};

async function atomicJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

export async function readSourceMonitorRecords(): Promise<SourceMonitorRecord[]> {
  try {
    return JSON.parse(await readFile(statePath, "utf8")) as SourceMonitorRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function monitorSources(sources: Source[]): Promise<SourceMonitorRecord[]> {
  const config = getCrawlerConfig();
  const previous = new Map((await readSourceMonitorRecords()).map((record) => [record.sourceId, record]));
  const updates: SourceMonitorRecord[] = [];

  for (const source of sources) {
    const checkedAt = new Date().toISOString();
    const old = previous.get(source.id);
    try {
      if (!await canCrawl(source.url, config)) {
        updates.push({
          sourceId: source.id, url: source.url, status: "blocked_by_robots", checkedAt,
          changedAt: old?.changedAt ?? "", httpStatus: null, contentType: "",
          contentLength: 0, contentHash: old?.contentHash ?? "", previousHash: old?.contentHash ?? "",
          error: "robots.txtにより取得できません。",
        });
        continue;
      }
      const response = await fetchWithRetry(source.url, config);
      const declaredSize = Number(response.headers.get("content-length") ?? "0");
      if (declaredSize > maxDocumentBytes) {
        throw new Error(`文書サイズが上限20MBを超えています（${declaredSize} bytes）。`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > maxDocumentBytes) {
        throw new Error(`文書サイズが上限20MBを超えています（${bytes.byteLength} bytes）。`);
      }
      const contentHash = createHash("sha256").update(bytes).digest("hex");
      const changed = Boolean(old?.contentHash && old.contentHash !== contentHash);
      updates.push({
        sourceId: source.id,
        url: source.url,
        status: changed ? "changed" : "ok",
        checkedAt,
        changedAt: changed ? checkedAt : old?.changedAt ?? "",
        httpStatus: response.status,
        contentType: response.headers.get("content-type") ?? "",
        contentLength: bytes.byteLength,
        contentHash,
        previousHash: old?.contentHash ?? "",
        error: "",
      });
    } catch (error) {
      updates.push({
        sourceId: source.id, url: source.url, status: "failed", checkedAt,
        changedAt: old?.changedAt ?? "", httpStatus: null, contentType: "",
        contentLength: 0, contentHash: old?.contentHash ?? "", previousHash: old?.contentHash ?? "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const record of updates) previous.set(record.sourceId, record);
  const records = [...previous.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  await atomicJson(statePath, records);
  return updates;
}
