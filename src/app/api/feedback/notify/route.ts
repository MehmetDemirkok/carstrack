import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/sendEmail";

const TYPE_LABELS: Record<string, string> = {
  bug: "Hata Bildirimi",
  suggestion: "Öneri",
  other: "Genel Geri Bildirim",
};
const TYPE_EMOJI: Record<string, string> = {
  bug: "🐞",
  suggestion: "💡",
  other: "💬",
};

/**
 * Bir kullanıcı yeni geri bildirim gönderdiğinde uygulama sahibine e-posta atar.
 * Alıcı: FEEDBACK_INBOX_EMAIL (yoksa proje sahibinin adresi).
 *
 * UI tarafında geri bildirim oluşturulduktan SONRA fire-and-forget çağrılır;
 * başarısız olsa bile kayıt akışını etkilemez.
 *
 *   POST /api/feedback/notify  { feedbackId }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { feedbackId?: unknown };
    if (!body.feedbackId || typeof body.feedbackId !== "string") {
      return NextResponse.json({ ok: false, error: "feedbackId gerekli" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: fb, error: fbErr } = await admin
      .from("feedback")
      .select("id, company_id, user_id, type, message, page_url, created_at, profiles(full_name), companies(name)")
      .eq("id", body.feedbackId)
      .single();

    if (fbErr || !fb) {
      return NextResponse.json({ ok: false, error: "Geri bildirim bulunamadı" }, { status: 404 });
    }
    // Yetki: yalnızca gönderen kullanıcı kendi kaydı için tetikleyebilir
    if ((fb.user_id as string) !== user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const inbox =
      process.env.FEEDBACK_INBOX_EMAIL ||
      process.env.EMAIL_SUPPORT_ADDRESS ||
      "mehmetdemirkok@gmail.com";

    const profile = fb.profiles as { full_name?: string } | null;
    const company = fb.companies as { name?: string } | null;
    const senderName = profile?.full_name || "Bir kullanıcı";
    const companyName = company?.name || "—";
    const typeKey = (fb.type as string) || "other";
    const typeLabel = TYPE_LABELS[typeKey] || "Geri Bildirim";
    const emoji = TYPE_EMOJI[typeKey] || "💬";
    const message = (fb.message as string)?.trim() || "(boş)";
    const pageUrl = (fb.page_url as string)?.trim();

    const when = new Date(fb.created_at as string).toLocaleString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });

    const result = await sendNotificationEmail(
      inbox,
      `CarsTrack — Yeni ${typeLabel} (${senderName})`,
      {
        title: `Yeni ${typeLabel}`,
        emoji,
        intro: `${senderName} (${companyName}) bir geri bildirim gönderdi.`,
        rows: [
          { label: "Gönderen", value: senderName },
          { label: "Şirket", value: companyName },
          { label: "Tür", value: typeLabel },
          { label: "Tarih", value: when },
          ...(pageUrl ? [{ label: "Sayfa", value: pageUrl }] : []),
        ],
        note: message,
        severity: typeKey === "bug" ? "warning" : "info",
      },
    );

    return NextResponse.json({ ok: result.success, skipped: result.skipped });
  } catch (err) {
    console.error("POST /api/feedback/notify error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
