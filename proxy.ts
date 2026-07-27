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
      ...(authenticate ? { "www-authenticate": 'Basic realm="Fukushi Portal Admin", charset="UTF-8"' } : {}),
    },
  });
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
  const hostname = (request.headers.get("x-forwarded-host")
    || request.headers.get("host")
    || request.nextUrl.hostname)
    .split(":")[0]
    .toLowerCase();
  if (VERCEL_FALLBACK_HOSTS.has(hostname)) {
    const destination = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      SITE_URL,
    );
    return NextResponse.redirect(destination, 301);
  }

  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const configured = configuredCredentials();
  if (!configured.length) {
    return response(503, "管理画面は無効です。管理者認証を設定してください。");
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return response(401, "認証が必要です。", true);
  }

  let credentials = "";
  try {
    credentials = atob(authorization.slice(6));
  } catch {
    return response(401, "認証情報を確認できません。", true);
  }
  const separator = credentials.indexOf(":");
  if (separator < 0) return response(401, "認証情報を確認できません。", true);
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
  if (!authenticated) return response(401, "認証情報が正しくありません。", true);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-user", authenticated.username);
  requestHeaders.set("x-admin-role", authenticated.role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
