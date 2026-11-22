import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Kullanıcının anlık bildirim (Web Push) aldığı cihazlar — Ayarlar'daki
 * "Bildirim alan cihazlar" listesi. RLS yalnızca kendi satırlarını okuyup
 * silmeye izin verir, bu yüzden service-role gerekmez.
 *
 *   GET    /api/push/devices          → { devices: [{ id, endpoint, userAgent, createdAt }] }
 *   DELETE /api/push/devices?id=<id>  → kendi aboneliklerinden birini kaldırır
 *
 * `endpoint` istemcinin "bu cihaz" satırını ayırt edebilmesi için döner; zaten
 * kullanıcının kendi tarayıcısının bildiği bir değerdir.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // select("*"): created_at gibi sütunlar her ortamda olmayabilir.
  const { data, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", user.id);
  if (error) {
    console.error("[push/devices] list error:", error);
    return NextResponse.json({ error: "Cihazlar alınamadı" }, { status: 500 });
  }

  const devices = (data ?? [])
    .map((row: Record<string, unknown>) => ({
      id: String(row.id),
      endpoint: String(row.endpoint ?? ""),
      userAgent: (row.user_agent as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? (row.updated_at as string | null) ?? null,
    }))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  return NextResponse.json({ devices });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[push/devices] delete error:", error);
    return NextResponse.json({ error: "Cihaz kaldırılamadı" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
