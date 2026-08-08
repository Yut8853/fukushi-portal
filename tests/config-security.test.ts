import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const source = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

test("robots.txt取得失敗時はクロールを許可しない", async () => {
  const fetcher = await source("crawler/fetcher.ts");
  assert.match(fetcher, /catch \{\s*return false;/);
  assert.doesNotMatch(fetcher, /catch \{\s*rules = robotsParser\(robotsUrl, ""\)/);
});

test("Dispatcherキャッシュに上限とclose処理がある", async () => {
  const fetcher = await source("crawler/fetcher.ts");
  assert.match(fetcher, /MAX_DISPATCHERS/);
  assert.match(fetcher, /oldest\?\.close\(\)/);
});

test("フィードバックのHMAC鍵をService Role鍵と分離する", async () => {
  const route = await source("app/api/feedback/route.ts");
  const retention = await source("app/api/maintenance/feedback-retention/route.ts");
  assert.match(route, /FEEDBACK_RATE_LIMIT_SECRET/);
  assert.match(route, /getRateLimitToken\(request, rateLimitSecret\)/);
  assert.doesNotMatch(route, /getRateLimitToken\(request, serviceRoleKey\)/);
  assert.match(retention, /createHmac\("sha256", rateLimitSecret\)/);
  assert.doesNotMatch(retention, /createHmac\("sha256", serviceRoleKey\)/);
});

test("固定GSCトークンを持たず、未設定時はverificationを出さない", async () => {
  const layout = await source("app/layout.tsx");
  assert.match(layout, /GOOGLE_SITE_VERIFICATION\?\.trim\(\)/);
  assert.doesNotMatch(layout, /LEkZOcAeq4rXooCOsOS3EisHeiHwDTe9Zl7Rka0F0gQ/);
});

test("CSPのscript-srcはnonceを使用しunsafe-inlineを許可しない", async () => {
  const proxy = await source("proxy.ts");
  const config = await source("next.config.ts");
  assert.match(proxy, /script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  assert.doesNotMatch(`${proxy}\n${config}`, /script-src[^;\n]*'unsafe-inline'/);
  assert.match(await source("components/JsonLd.tsx"), /nonce=\{nonce\}/);
});

test("Basic認証はBase64のバイト列をUTF-8として復号する", async () => {
  const proxy = await source("proxy.ts");
  assert.match(proxy, /new TextDecoder\("utf-8", \{ fatal: true \}\)/);
  assert.match(proxy, /decodeBasicCredentials\(authorization\.slice\(6\)\)/);
});
