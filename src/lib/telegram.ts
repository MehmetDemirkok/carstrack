const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

/** TELEGRAM_BOT_TOKEN tanımlı mı? Çağrılardan önce kontrol için. */
export function isTelegramConfigured(): boolean {
  return !!BOT_TOKEN;
}

/**
 * Telegram'a mesaj gönderir. Başarısızlık durumunda anlamlı bir hata fırlatır
 * ve sunucu loglarına ayrıntı yazar — böylece neden gitmediği teşhis edilebilir.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!API) {
    const msg = "TELEGRAM_BOT_TOKEN ortam değişkeni tanımlı değil — Telegram mesajı gönderilemiyor.";
    console.error("[telegram] " + msg);
    throw new Error(msg);
  }
  if (!chatId) {
    throw new Error("Telegram chat_id boş — mesaj gönderilemiyor.");
  }

  let res: Response;
  try {
    res = await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    // Ağ hatası (DNS, timeout, vb.)
    console.error(`[telegram] sendMessage network error (chat ${chatId}):`, err);
    throw new Error(`Telegram ağ hatası: ${String(err)}`);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[telegram] sendMessage failed (chat ${chatId}, status ${res.status}):`, body);
    throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`);
  }
}

export async function setWebhook(webhookUrl: string): Promise<void> {
  if (!API) throw new Error("TELEGRAM_BOT_TOKEN tanımlı değil.");
  const res = await fetch(`${API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });
  if (!res.ok) throw new Error(`setWebhook failed: ${await res.text()}`);
}

/** Botun kendisi hakkında bilgi — token geçerli mi diye test eder. */
export async function getMe(): Promise<unknown> {
  if (!API) throw new Error("TELEGRAM_BOT_TOKEN tanımlı değil.");
  const res = await fetch(`${API}/getMe`);
  const json = await res.json();
  if (!res.ok) throw new Error(`getMe failed: ${JSON.stringify(json)}`);
  return json;
}

/** Webhook'un doğru kurulup kurulmadığını ve son hataları döndürür. */
export async function getWebhookInfo(): Promise<unknown> {
  if (!API) throw new Error("TELEGRAM_BOT_TOKEN tanımlı değil.");
  const res = await fetch(`${API}/getWebhookInfo`);
  const json = await res.json();
  if (!res.ok) throw new Error(`getWebhookInfo failed: ${JSON.stringify(json)}`);
  return json;
}
