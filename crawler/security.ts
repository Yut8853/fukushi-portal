import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIp(address: string): boolean {
  if (address === "0.0.0.0" || address === "::" || address === "::1") return true;
  if (address.startsWith("127.") || address.startsWith("10.") || address.startsWith("192.168.")) return true;
  if (address.startsWith("169.254.") || address === "169.254.169.254") return true;
  const parts = address.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  const lower = address.toLowerCase();
  return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
}

export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`不正なURLです: ${raw}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`許可されていないスキームです: ${url.protocol}`);
  if (url.username || url.password) throw new Error("認証情報を含むURLにはアクセスできません。");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (["localhost", "localhost.localdomain"].includes(hostname) || hostname.endsWith(".local")) {
    throw new Error("ローカルホストへのアクセスを拒否しました。");
  }
  if (isIP(hostname) && isPrivateIp(hostname)) throw new Error("プライベートIPへのアクセスを拒否しました。");
  const addresses = await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("安全でないIPアドレスへのアクセスを拒否しました。");
  }
  url.hash = "";
  return url;
}

export function sameOfficialSite(candidate: URL, official: URL): boolean {
  const root = official.hostname.replace(/^www\./, "");
  const host = candidate.hostname.replace(/^www\./, "");
  return host === root || host.endsWith(`.${root}`);
}
