import robotsParser from "robots-parser";
import type { CrawlerConfig } from "./config";
import { assertSafeUrl } from "./security";

const lastRequest = new Map<string, number>();
const robotsCache = new Map<string, ReturnType<typeof robotsParser>>();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function politeDelay(host: string, delayMs: number): Promise<void> {
  const remaining = (lastRequest.get(host) ?? 0) + delayMs - Date.now();
  if (remaining > 0) await wait(remaining);
  lastRequest.set(host, Date.now());
}

async function fetchOnce(rawUrl: string, config: CrawlerConfig): Promise<Response> {
  let current = await assertSafeUrl(rawUrl);
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    await politeDelay(current.hostname, config.delayMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": config.userAgent, accept: "text/html,application/pdf,text/plain;q=0.8,*/*;q=0.5" },
        signal: controller.signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error(`リダイレクト先がありません (${response.status})`);
        current = await assertSafeUrl(new URL(location, current).href);
        continue;
      }
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("リダイレクト回数が上限を超えました。");
}

export async function canCrawl(rawUrl: string, config: CrawlerConfig): Promise<boolean> {
  const url = await assertSafeUrl(rawUrl);
  const origin = url.origin;
  let rules = robotsCache.get(origin);
  if (!rules) {
    const robotsUrl = `${origin}/robots.txt`;
    try {
      const response = await fetchOnce(robotsUrl, config);
      const text = response.ok ? await response.text() : "";
      rules = robotsParser(robotsUrl, text);
    } catch {
      rules = robotsParser(robotsUrl, "");
    }
    robotsCache.set(origin, rules);
  }
  return rules.isAllowed(url.href, config.userAgent) !== false;
}

export async function fetchWithRetry(rawUrl: string, config: CrawlerConfig): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    try {
      const response = await fetchOnce(rawUrl, config);
      if (response.status === 403) throw new Error("HTTP 403（回避せず停止）");
      if (response.status === 429 || response.status >= 500) {
        if (attempt === config.maxRetries) throw new Error(`HTTP ${response.status}`);
        const retryAfter = Number(response.headers.get("retry-after"));
        await wait(Number.isFinite(retryAfter) ? retryAfter * 1000 : 1000 * 2 ** attempt);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.includes("403")) throw error;
      if (attempt < config.maxRetries) await wait(1000 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
