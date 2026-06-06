import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
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
    const update = await req.json() as TelegramUpdate;
    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text ?? "";
    const firstName = message.from?.first_name ?? "Kullanıcı";

    // /start <userId>  →  kullanıcıyı bağla
    const match = text.match(/^\/start\s+([a-f0-9-]{36})$/i);
    if (!match) {
      await sendTelegramMessage(chatId,
        `Merhaba ${firstName}! 👋\n\nBotu bağlamak için CarsTrack Ayarlar sayfasındaki <b>Telegram'ı Bağla</b> butonunu kullanın.`
      );
      return NextResponse.json({ ok: true });
    }

    const userId = match[1];
    const admin = createAdminClient();

    // Profil + şirket bilgisini çek
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("company_id, role, full_name")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      await sendTelegramMessage(chatId, "Hesap bulunamadı. Lütfen tekrar deneyin.");
      return NextResponse.json({ ok: true });
    }

    const { error } = await admin
      .from("profiles")
      .update({ telegram_chat_id: chatId })
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
    if (role === "driver") {
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
