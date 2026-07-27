import { NextResponse } from "next/server";
import { z } from "zod";

const feedbackSchema = z.object({
  pageId: z.string().regex(/^[a-z0-9-]{1,120}$/),
  categoryId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  helpful: z.boolean(),
});

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_024) {
    return NextResponse.json({ error: "送信内容が大きすぎます。" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "送信内容を確認できません。" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "送信内容が正しくありません。" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "") ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "集計機能は現在利用できません。" }, { status: 503 });
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
