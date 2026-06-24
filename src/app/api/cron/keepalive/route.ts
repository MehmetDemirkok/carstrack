export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Supabase free tier projeyi ~7 gün hareketsizlikte askıya alır. Bu uç nokta
// 2 günde bir (Vercel cron) çağrılır: bir satır ekler ve eskileri siler, böylece
// her çalışmada garanti bir yazma işlemi olur ve proje aktif kalır.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // 1) Ekleme — garanti yazma
  const { error: insertErr } = await admin
    .from("keepalive")
    .insert({ pinged_at: now.toISOString() });
  if (insertErr) {
    console.error("[cron/keepalive] insert error:", insertErr);
    return NextResponse.json({ error: "keepalive insert failed" }, { status: 500 });
  }

  // 2) Silme — 7 günden eski kayıtları temizle (tablo şişmesin)
  const cutoff = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const { error: deleteErr } = await admin
    .from("keepalive")
    .delete()
    .lt("pinged_at", cutoff);
  if (deleteErr) {
    console.error("[cron/keepalive] delete error:", deleteErr);
    // Silme başarısızsa da ekleme yapıldı; yine de OK dönüyoruz.
  }

  console.log(`[cron/keepalive] ok — pinged_at:${now.toISOString()}`);
  return NextResponse.json({ ok: true, pingedAt: now.toISOString() });
}
