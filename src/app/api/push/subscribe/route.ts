import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tarayıcının PushManager aboneliğini kaydeder. Ayarlar'da "Telefon
 * Bildirimleri" açıldığında çağrılır. Aynı endpoint tekrar gelirse günceller
 * (upsert) — böylece tablo çoğalmaz.
 *
 * Aynı cihazda hesap değiştiğinde endpoint hâlâ eski kullanıcıya bağlıdır.
 * RLS, başka bir kullanıcının satırını güncellemeye izin vermediği için
 * upsert service-role ile yapılır: endpoint fiziksel cihaza ait bir kimliktir,
 * bu yüzden satırı o an oturum açmış kullanıcıya taşımak güvenlidir. Aksi
 * halde eski hesabın bildirimleri bu cihaza gelmeye devam ederdi.
 *
 *   POST /api/push/subscribe  { endpoint, keys: { p256dh, auth } }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    const endpoint = body.endpoint;
    const p256dh = body.keys?.p256dh;
    const auth = body.keys?.auth;

    if (
      typeof endpoint !== "string" ||
      !endpoint.startsWith("https://") ||
      typeof p256dh !== "string" ||
      typeof auth !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "Geçersiz abonelik" }, { status: 400 });
    }

    // Kullanıcının şirketini belirle (push hedeflemesi company_id ile yapılır)
    const fromMeta = user.user_metadata?.company_id as string | undefined;
    let companyId = fromMeta ?? null;
    if (!companyId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      companyId = (prof?.company_id as string) ?? null;
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          company_id: companyId,
          endpoint,
          p256dh,
          auth,
          user_agent: req.headers.get("user-agent") ?? null,
        },
        { onConflict: "endpoint" },
      );

    if (error) {
      console.error("[push/subscribe] upsert error:", error);
      return NextResponse.json({ ok: false, error: "Kaydedilemedi" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/push/subscribe error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * Aboneliği siler ("Telefon Bildirimleri" kapatıldığında).
 *
 *   DELETE /api/push/subscribe  { endpoint }
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
    if (typeof body.endpoint !== "string") {
      return NextResponse.json({ ok: false, error: "endpoint gerekli" }, { status: 400 });
    }

    // Endpoint cihaza ait olduğu için, önceki bir hesaptan kalmış satır da
    // temizlenmeli. RLS başka kullanıcının satırını silemeyeceğinden
    // service-role kullanılır.
    const admin = createAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", body.endpoint);

    if (error) {
      console.error("[push/subscribe] delete error:", error);
      return NextResponse.json({ ok: false, error: "Silinemedi" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/push/subscribe error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
