import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export type CrawlerConfig = {
  contact: string;
  concurrency: number;
  delayMs: number;
  timeoutMs: number;
  maxRetries: number;
  maxPages: number;
  userAgent: string;
};

function integer(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} は${min}〜${max}の整数で指定してください。`);
  }
  return value;
}

export function getCrawlerConfig(requireContact = true): CrawlerConfig {
  const contact = (process.env.CRAWLER_CONTACT ?? "").trim();
  if (requireContact && !contact) {
    throw new Error("CRAWLER_CONTACT が未設定です。運営者の連絡先メールアドレスを設定してください。");
  }
  return {
    contact,
    concurrency: integer("CRAWLER_CONCURRENCY", 2, 1, 8),
    delayMs: integer("CRAWLER_DELAY_MS", 2000, 500, 60_000),
    timeoutMs: integer("CRAWLER_TIMEOUT_MS", 15_000, 1000, 120_000),
    maxRetries: integer("CRAWLER_MAX_RETRIES", 3, 0, 3),
    maxPages: integer("CRAWLER_MAX_PAGES", 20, 1, 100),
    userAgent: `FukushiPortalCrawler/1.0 (+${contact || "contact-not-configured"})`,
  };
}
