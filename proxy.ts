import { NextRequest, NextResponse } from "next/server";
import { SITE_URL, VERCEL_FALLBACK_HOSTS } from "@/lib/site";

type AdminRole = "admin" | "reviewer";
type AdminCredential = { username: string; password: string; role: AdminRole };

async function digest(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function credentialsMatch(actual: string, expected: string): Promise<boolean> {
  const [actualDigest, expectedDigest] = await Promise.all([digest(actual), digest(expected)]);
  return actualDigest === expectedDigest;
}

function response(status: number, message: string, authenticate = false): NextResponse {
  return new NextResponse(message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      ...(authenticate
        ? { "www-authenticate": 'Basic realm="Fukushi Portal Admin", charset="UTF-8"' }
        : {}),
    },
  });
}

function decodeBasicCredentials(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function requestNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function secureResponse(result: NextResponse, nonce: string): NextResponse {
  result.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
  return result;
}

function configuredCredentials(): AdminCredential[] {
  const raw = process.env.ADMIN_BASIC_USERS_JSON?.trim() ?? "";
  if (raw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): AdminCredential[] => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const username = typeof record.username === "string" ? record.username.trim() : "";
      const password = typeof record.password === "string" ? record.password : "";
      const role = record.role === "reviewer" ? "reviewer" : record.role === "admin" ? "admin" : "";
      return username && password && role ? [{ username, password, role }] : [];
    });
  }
  const username = process.env.ADMIN_BASIC_USER?.trim() ?? "";
  const password = process.env.ADMIN_BASIC_PASSWORD ?? "";
  return username && password ? [{ username, password, role: "admin" }] : [];
}

export async function proxy(request: NextRequest) {
  const nonce = requestNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const hostname = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname
  )
    .split(":")[0]
    .toLowerCase();
  if (VERCEL_FALLBACK_HOSTS.has(hostname)) {
    const destination = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, SITE_URL);
    return secureResponse(NextResponse.redirect(destination, 301), nonce);
  }

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
  }

  const configured = configuredCredentials();
  if (!configured.length) {
    return secureResponse(
      response(503, "管理画面は無効です。管理者認証を設定してください。"),
      nonce,
    );
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return secureResponse(response(401, "認証が必要です。", true), nonce);
  }

  let credentials = "";
  try {
    credentials = decodeBasicCredentials(authorization.slice(6));
  } catch {
    return secureResponse(response(401, "認証情報を確認できません。", true), nonce);
  }
  const separator = credentials.indexOf(":");
  if (separator < 0) {
    return secureResponse(response(401, "認証情報を確認できません。", true), nonce);
  }
  const user = credentials.slice(0, separator);
  const password = credentials.slice(separator + 1);

  let authenticated: AdminCredential | undefined;
  for (const candidate of configured) {
    const [validUser, validPassword] = await Promise.all([
      credentialsMatch(user, candidate.username),
      credentialsMatch(password, candidate.password),
    ]);
    if (validUser && validPassword) authenticated = candidate;
  }
  if (!authenticated) {
    return secureResponse(response(401, "認証情報が正しくありません。", true), nonce);
  }

  requestHeaders.set("x-admin-user", authenticated.username);
  requestHeaders.set("x-admin-role", authenticated.role);
  return secureResponse(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
