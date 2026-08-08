import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

const PUBLIC_RANGES = new Set(["unicast"]);

export function isPrivateIp(address: string): boolean {
  try {
    let parsed = ipaddr.parse(address.replace(/^\[|\]$/g, ""));
    if (parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()) {
      parsed = parsed.toIPv4Address();
    }
    return !PUBLIC_RANGES.has(parsed.range());
  } catch {
    return true;
  }
}

export type SafeUrl = {
  url: URL;
  addresses: ReadonlyArray<{ address: string; family: 4 | 6 }>;
};

export async function resolveSafeUrl(raw: string): Promise<SafeUrl> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`不正なURLです: ${raw}`);
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error(`許可されていないスキームです: ${url.protocol}`);
  if (url.username || url.password) throw new Error("認証情報を含むURLにはアクセスできません。");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (["localhost", "localhost.localdomain"].includes(hostname) || hostname.endsWith(".local")) {
    throw new Error("ローカルホストへのアクセスを拒否しました。");
  }
  const literal = hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal) && isPrivateIp(literal)) {
    throw new Error("安全でないIPアドレスへのアクセスを拒否しました。");
  }
  const addresses = isIP(literal)
    ? [{ address: literal, family: isIP(literal) as 4 | 6 }]
    : (await lookup(hostname, { all: true, verbatim: true })).map(({ address, family }) => ({
        address,
        family: (family === 6 ? 6 : 4) as 4 | 6,
      }));
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("安全でないIPアドレスへのアクセスを拒否しました。");
  }
  url.hash = "";
  return { url, addresses };
}

export async function assertSafeUrl(raw: string): Promise<URL> {
  return (await resolveSafeUrl(raw)).url;
}

export function sameOfficialSite(candidate: URL, official: URL): boolean {
  const root = official.hostname.replace(/^www\./, "");
  const host = candidate.hostname.replace(/^www\./, "");
  return host === root || host.endsWith(`.${root}`);
}
