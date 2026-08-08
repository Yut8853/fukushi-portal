import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const feedbackSchema = z.object({
  pageId: z.string().regex(/^[a-z0-9-]{1,120}$/),
  categoryId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  helpful: z.boolean(),
});

function getRateLimitToken(request: Request, secret: string) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientAddress =
    request.headers.get("x-vercel-forwarded-for") ??
    forwardedFor?.split(",")[0]?.trim() ??
    "unknown";
  const windowId = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS);

  return createHmac("sha256", secret).update(`${windowId}:${clientAddress}`).digest("hex");
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    (fetchSite && fetchSite !== "same-origin")
  ) {
    return NextResponse.json({ error: "このサイト以外からは送信できません。" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_024) {
    return NextResponse.json({ error: "送信内容が大きすぎます。" }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 1_024) {
      return NextResponse.json({ error: "送信内容が大きすぎます。" }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "送信内容を確認できません。" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "送信内容が正しくありません。" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const rateLimitSecret = process.env.FEEDBACK_RATE_LIMIT_SECRET ?? "";
  if (!supabaseUrl || !serviceRoleKey || !rateLimitSecret) {
    return NextResponse.json({ error: "集計機能は現在利用できません。" }, { status: 503 });
  }

  const rateLimitResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/check_feedback_rate_limit`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      p_token: getRateLimitToken(request, rateLimitSecret),
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
    }),
    cache: "no-store",
  });

  if (!rateLimitResponse.ok) {
    return NextResponse.json({ error: "送信回数を確認できませんでした。" }, { status: 503 });
  }

  const rateLimitAllowed: unknown = await rateLimitResponse.json();
  if (rateLimitAllowed !== true) {
    return NextResponse.json(
      { error: "短時間に送信できる回数を超えました。1分ほど待ってからお試しください。" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/feedback_events`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      page_id: parsed.data.pageId,
      category_id: parsed.data.categoryId,
      helpful: parsed.data.helpful,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "回答を保存できませんでした。" }, { status: 502 });
  }

  return new NextResponse(null, { status: 204 });
}
