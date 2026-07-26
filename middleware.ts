import { NextRequest, NextResponse } from "next/server";

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

export async function middleware(request: NextRequest) {
  const expectedUser = process.env.ADMIN_BASIC_USER?.trim() ?? "";
  const expectedPassword = process.env.ADMIN_BASIC_PASSWORD ?? "";
  if (!expectedUser || !expectedPassword) {
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

  const [validUser, validPassword] = await Promise.all([
    credentialsMatch(user, expectedUser),
    credentialsMatch(password, expectedPassword),
  ]);
  if (!validUser || !validPassword) return response(401, "認証情報が正しくありません。", true);

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
