import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage, TELEGRAM_WEBHOOK_SECRET } from "@/lib/telegram";
import { getFleetAlerts } from "@/lib/store";
import { toVehicleFromRow } from "@/lib/vehicle-mapper";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { first_name?: string };
    text?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    // ── GÜVENLİK: İsteğin gerçekten Telegram'dan geldiğini doğrula ──────────
    // Telegram, setWebhook'ta kaydettiğimiz gizli token'ı her istekte bu
    // başlıkta geri gönderir. Eşleşmiyorsa sahte istek → sessizce yok say.
    if (TELEGRAM_WEBHOOK_SECRET) {
      const sig = req.headers.get("x-telegram-bot-api-secret-token");
      if (sig !== TELEGRAM_WEBHOOK_SECRET) {
        return NextResponse.json({ ok: true });
      }
    }

    const update = await req.json() as TelegramUpdate;
    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text ?? "";
    const firstName = message.from?.first_name ?? "Kullanıcı";

    // /start <code>  →  tek-kullanımlık koda göre kullanıcıyı bağla.
    // GÜVENLİK: Artık user.id DEĞİL, /api/telegram/link-code ile üretilen
    // rastgele, kısa ömürlü kod kullanılır (bkz. C-3 düzeltmesi).
    const match = text.match(/^\/start\s+([A-Za-z0-9_-]{20,64})$/);
    if (!match) {
      await sendTelegramMessage(chatId,
        `Merhaba ${firstName}! 👋\n\nBotu bağlamak için CarsTrack Ayarlar sayfasındaki <b>Telegram'ı Bağla</b> butonunu kullanın.`
      );
      return NextResponse.json({ ok: true });
    }

    const code = match[1];
    const admin = createAdminClient();

    // Kodu doğrula: süresi geçmemiş ve mevcut bir profile ait olmalı.
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, company_id, role, full_name, telegram_link_expires_at")
      .eq("telegram_link_code", code)
      .single();

    const expired =
      !profile?.telegram_link_expires_at ||
      new Date(profile.telegram_link_expires_at as string).getTime() < Date.now();

    if (profileErr || !profile || expired) {
      await sendTelegramMessage(chatId,
        "Bağlantı kodu geçersiz veya süresi dolmuş. Ayarlar sayfasından <b>Telegram'ı Bağla</b> ile yeni bir bağlantı oluşturun."
      );
      return NextResponse.json({ ok: true });
    }

    const userId = profile.id as string;

    // Sohbeti bağla ve tek-kullanımlık kodu hemen temizle.
    const { error } = await admin
      .from("profiles")
      .update({
        telegram_chat_id: chatId,
        telegram_link_code: null,
        telegram_link_expires_at: null,
      })
      .eq("id", userId);

    if (error) {
      console.error("[telegram/webhook] update error:", error);
      await sendTelegramMessage(chatId, "Bağlantı sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      return NextResponse.json({ ok: true });
    }

    // Mevcut araçları çek ve anlık uyarıları gönder
    const companyId = profile.company_id as string;
    const role = profile.role as string;

    let vehicleQuery = admin.from("vehicles").select("*").eq("company_id", companyId);
    if (role === "user") {
      const { data: assignments } = await admin
        .from("vehicle_assignments")
        .select("vehicle_id")
        .eq("driver_id", userId);
      const vehicleIds = (assignments ?? []).map((a: { vehicle_id: string }) => a.vehicle_id);
      if (vehicleIds.length > 0) {
        vehicleQuery = vehicleQuery.in("id", vehicleIds);
      } else {
        vehicleQuery = vehicleQuery.eq("id", "");
      }
    }

    const { data: rawVehicles } = await vehicleQuery;
    const vehicles = (rawVehicles ?? []).map((r) => toVehicleFromRow(r as Record<string, unknown>));
    const alerts = getFleetAlerts(vehicles);

    const name = (profile.full_name as string) || firstName;

    if (alerts.length === 0) {
      await sendTelegramMessage(chatId,
        `✅ <b>Bağlantı kuruldu, ${name}!</b>\n\n` +
        `Filo uyarıları her gün sabah 06:00'da size iletilecek.\n\n` +
        `🟢 Şu an aktif uyarı yok — her şey yolunda!`
      );
    } else {
      const severityEmoji: Record<string, string> = { critical: "🔴", warning: "🟡", info: "🔵" };
      const lines = alerts.slice(0, 10).map((a) =>
        `${severityEmoji[a.severity] ?? "⚪"} <b>${a.vehiclePlate}</b> — ${a.title}`
      );
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://carstrack.app";
      await sendTelegramMessage(chatId,
        `✅ <b>Bağlantı kuruldu, ${name}!</b>\n\n` +
        `Filo uyarıları her gün sabah 06:00'da size iletilecek.\n\n` +
        `<b>Şu anki uyarılar (${alerts.length}):</b>\n${lines.join("\n")}\n\n` +
        `<a href="${appUrl}/vehicles">Araçları görüntüle →</a>`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook] error:", err);
    return NextResponse.json({ ok: true }); // Telegram 200 bekler
  }
}
