export interface EventEmailRow {
  /** Satır etiketi (örn. "Sürücü", "Plaka"). */
  label: string;
  /** Satır değeri. */
  value: string;
}

export interface EventEmailParams {
  recipientName: string;
  /** Kart üst başlığı (örn. "Görev Başladı"). */
  title: string;
  /** Başlık yanındaki emoji (örn. "🟢"). */
  emoji: string;
  /** Selamlamanın altındaki açıklama cümlesi. */
  intro: string;
  /** Detay satırları (etiket → değer). */
  rows: EventEmailRow[];
  /** İsteğe bağlı serbest metin (örn. açıklama notu). */
  note?: string;
  /** Vurgu rengi (kart üst çizgisi + buton). Varsayılan mor. */
  accent?: string;
  appUrl: string;
  /** CTA butonunun hedefi (varsayılan appUrl). */
  ctaUrl?: string;
  /** CTA buton metni. */
  ctaLabel?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Tek bir olay (görev başladı/bitti, yeni arıza vb.) için fleet-alerts ile
 * görsel olarak tutarlı, etiket→değer satırlarından oluşan bir e-posta üretir.
 */
export function getEventEmailHtml(params: EventEmailParams): string {
  const {
    recipientName, title, emoji, intro, rows, note,
    accent = "#7c3aed", appUrl, ctaUrl, ctaLabel = "Uygulamada Görüntüle",
  } = params;
  const year = new Date().getFullYear();

  const rowsHtml = rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #27272a;">
            <span style="font-size:11px;color:#71717a;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;">${escapeHtml(label)}</span>
          </td>
          <td align="right" style="padding:8px 0;border-bottom:1px solid #27272a;">
            <span style="font-size:13px;color:#f4f4f5;font-weight:600;">${escapeHtml(value)}</span>
          </td>
        </tr>`,
    )
    .join("");

  const noteHtml = note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:#1c1c1f;border-radius:10px;">
         <tr><td style="padding:12px 14px;font-size:12px;color:#a1a1aa;line-height:1.5;">📝 ${escapeHtml(note)}</td></tr>
       </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>CarsTrack — ${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:540px;background-color:#18181b;border-radius:16px;border:1px solid #27272a;overflow:hidden;">

          <tr><td style="height:3px;background:linear-gradient(90deg,${accent},#a855f7,#6366f1);"></td></tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:32px 40px 20px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);border-radius:14px;padding:14px 16px;margin-bottom:12px;">
                <span style="font-size:28px;line-height:1;">&#x1F697;</span>
              </div>
              <p style="margin:0;font-size:24px;font-weight:800;color:#fafafa;letter-spacing:-0.5px;">CarsTrack</p>
              <p style="margin:4px 0 0;font-size:11px;color:#71717a;font-weight:500;letter-spacing:0.5px;">FİLO YÖNETİM SİSTEMİ</p>
            </td>
          </tr>

          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#27272a;"></div></td></tr>

          <!-- Gövde -->
          <tr>
            <td style="padding:28px 40px 8px;">
              <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#fafafa;">${emoji}&nbsp; ${escapeHtml(title)}</p>
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#fafafa;">Merhaba ${escapeHtml(recipientName)},</p>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#a1a1aa;">${escapeHtml(intro)}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#1c1c1f;border-radius:10px;padding:4px 16px;">
                ${rowsHtml}
              </table>
              ${noteHtml}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:24px 40px 28px;">
              <a href="${ctaUrl ?? appUrl}" target="_blank"
                 style="display:inline-block;background:linear-gradient(135deg,${accent},#6366f1);color:#ffffff;
                        font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;letter-spacing:0.2px;">
                ${escapeHtml(ctaLabel)} &rarr;
              </a>
            </td>
          </tr>

          <tr><td style="padding:0 40px;"><div style="height:1px;background-color:#27272a;"></div></td></tr>

          <tr>
            <td style="padding:20px 40px 28px;">
              <p style="margin:0;font-size:11px;color:#52525b;text-align:center;line-height:1.6;">
                &copy; ${year} CarsTrack. Tüm hakları saklıdır.<br/>
                Bu e-posta filo bildirimleri için otomatik olarak gönderilmiştir.<br/>
                E-posta bildirimlerini durdurmak için
                <a href="${appUrl}/settings" style="color:#7c3aed;text-decoration:none;">ayarlar</a> sayfasını ziyaret edin.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
