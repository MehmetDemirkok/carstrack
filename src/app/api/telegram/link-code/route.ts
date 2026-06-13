import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Telegram bağlama için TEK-KULLANIMLIK, tahmin edilemez bir kod üretir ve
 * çağıran kullanıcının profiline yazar. Sürücü/yönetici bu kodu Telegram derin
 * bağlantısı (t.me/Bot?start=<code>) ile gönderir; webhook kodu doğrulayıp
 * sohbeti yalnızca kodu üreten hesaba bağlar.
 *
 * GÜVENLİK: Eskiden derin bağlantı doğrudan user.id içeriyordu — bir başkasının
 * UUID'sini bilen herkes onun bildirimlerini ele geçirebiliyordu (C-3). Artık
 * bağlama, oturum açmış kullanıcının ürettiği rastgele koda dayanır.
 *
 *   POST /api/telegram/link-code  →  { url, code }
 */
const BOT_USERNAME = "Carstrack_APP_Bot";
const CODE_TTL_MINUTES = 15;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Kod üretimini sınırla (kullanıcı başına 10 / 15 dk)
    const rl = rateLimit(`tglink:${user.id}:${clientIp(req)}`, 10, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const code = randomBytes(24).toString("base64url"); // ~32 karakter, URL-güvenli
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({ telegram_link_code: code, telegram_link_expires_at: expiresAt })
      .eq("id", user.id);

    if (error) {
      console.error("[telegram/link-code] update error:", error);
      return NextResponse.json({ error: "Kod oluşturulamadı" }, { status: 500 });
    }

    const url = `https://t.me/${BOT_USERNAME}?start=${code}`;
    return NextResponse.json({ url, code });
  } catch (err) {
    console.error("[telegram/link-code] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
