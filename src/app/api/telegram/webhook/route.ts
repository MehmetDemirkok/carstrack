import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";

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

    const { error } = await admin
      .from("profiles")
      .update({ telegram_chat_id: chatId })
      .eq("id", userId);

    if (error) {
      console.error("[telegram/webhook] update error:", error);
      await sendTelegramMessage(chatId, "Bağlantı sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(chatId,
      `✅ <b>Telegram bağlantısı kuruldu!</b>\n\nArtık CarsTrack filo uyarılarını bu sohbet üzerinden alacaksınız.`
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook] error:", err);
    return NextResponse.json({ ok: true }); // Telegram 200 bekler
  }
}
