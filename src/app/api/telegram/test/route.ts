import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum açık değil" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.telegram_chat_id) {
    return NextResponse.json({ error: "Telegram bağlı değil" }, { status: 400 });
  }

  const name = (profile.full_name as string) || "Kullanıcı";

  await sendTelegramMessage(
    profile.telegram_chat_id as string,
    `✅ <b>Test başarılı, ${name}!</b>\n\nCarsTrack Telegram bildirimleri aktif. Sigorta, muayene ve bakım uyarıları her gün sabah 06:00'da size iletilecek.`
  );

  return NextResponse.json({ ok: true });
}
