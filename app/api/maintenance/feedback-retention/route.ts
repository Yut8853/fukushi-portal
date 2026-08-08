import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function authorized(request: Request, secret: string): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const actualBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET ?? "";
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const rateLimitSecret = process.env.FEEDBACK_RATE_LIMIT_SECRET ?? "";
  if (!cronSecret || !supabaseUrl || !serviceRoleKey || !rateLimitSecret) {
    return NextResponse.json({ error: "定期削除の設定がありません。" }, { status: 503 });
  }
  if (!authorized(request, cronSecret)) {
    return NextResponse.json({ error: "認証できません。" }, { status: 401 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const token = createHmac("sha256", rateLimitSecret)
    .update(`feedback-retention:${date}`)
    .digest("hex");
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/check_feedback_rate_limit`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_token: token, p_max_requests: 1 }),
    cache: "no-store",
  });
  if (!response.ok) {
    return NextResponse.json({ error: "定期削除を実行できませんでした。" }, { status: 502 });
  }
  const rateLimitAllowed: unknown = await response.json();
  if (rateLimitAllowed !== true) return NextResponse.json({ ok: true, skipped: true });

  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const deleteResponse = await fetch(
    `${supabaseUrl}/rest/v1/feedback_events?created_at=lt.${encodeURIComponent(cutoff.toISOString())}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        prefer: "return=minimal",
      },
      cache: "no-store",
    },
  );
  if (!deleteResponse.ok) {
    return NextResponse.json(
      { error: "保存期限を過ぎた回答を削除できませんでした。" },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, cutoff: cutoff.toISOString() });
}
