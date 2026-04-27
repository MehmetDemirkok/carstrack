import type { FleetAlert } from "@/lib/types";

interface Params {
  recipientName: string;
  alerts: FleetAlert[];
  appUrl: string;
  date: string;
}

const categoryEmoji: Record<FleetAlert["category"], string> = {
  insurance: "🛡️",
  inspection: "📋",
  maintenance: "🔧",
  tire: "🔄",
};

export function getFleetAlertsHtml({ recipientName, alerts, appUrl, date }: Params): string {
  const year = new Date().getFullYear();
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  // Uyarıları araç bazında grupla
  const vehicleMap = new Map<string, { name: string; plate: string; alerts: FleetAlert[] }>();
  for (const alert of alerts) {
    if (!vehicleMap.has(alert.vehicleId)) {
      vehicleMap.set(alert.vehicleId, {
        name: alert.vehicleName,
        plate: alert.vehiclePlate,
        alerts: [],
      });
    }
    vehicleMap.get(alert.vehicleId)!.alerts.push(alert);
  }

  const vehicleRows = Array.from(vehicleMap.values())
    .map(({ name, plate, alerts: vAlerts }) => {
      const alertRows = vAlerts
        .map((alert) => {
          const borderColor = alert.severity === "critical" ? "#ef4444" : "#f97316";
          const badgeBg = alert.severity === "critical" ? "#450a0a" : "#431407";
          const badgeColor = alert.severity === "critical" ? "#fca5a5" : "#fdba74";
          const badgeLabel = alert.severity === "critical" ? "KRİTİK" : "UYARI";
          const emoji = categoryEmoji[alert.category] ?? "⚠️";

          return `
            <tr>
              <td style="padding:0 0 8px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="border-left:3px solid ${borderColor};border-radius:6px;background-color:#1c1c1f;overflow:hidden;">
                  <tr>
                    <td style="padding:10px 14px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:13px;font-weight:600;color:#f4f4f5;">
                            ${emoji}&nbsp; ${alert.title}
                          </td>
                          <td align="right" style="white-space:nowrap;">
                            <span style="display:inline-block;background-color:${badgeBg};color:${badgeColor};
                                         font-size:9px;font-weight:700;letter-spacing:0.8px;
                                         padding:2px 7px;border-radius:4px;">
                              ${badgeLabel}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top:3px;font-size:12px;color:#a1a1aa;line-height:1.4;">
                            ${alert.description}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
        })
        .join("");

      return `
        <tr>
          <td style="padding:0 0 20px 0;">
            <!-- Araç başlığı -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="margin-bottom:8px;">
              <tr>
                <td>
                  <a href="${appUrl}/vehicles/${vAlerts[0].vehicleId}"
                     style="text-decoration:none;display:inline-flex;align-items:center;gap:8px;">
                    <span style="font-size:13px;font-weight:700;color:#e4e4e7;">${name}</span>
                    <span style="font-size:11px;font-family:monospace;background-color:#27272a;
                                 color:#a1a1aa;padding:2px 8px;border-radius:4px;">${plate}</span>
                  </a>
                </td>
              </tr>
            </table>
            <!-- Uyarı satırları -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${alertRows}
            </table>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>CarsTrack — Filo Uyarıları</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Kart -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:540px;background-color:#18181b;border-radius:16px;
                      border:1px solid #27272a;overflow:hidden;">

          <!-- Üst gradient çizgi -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#7c3aed,#a855f7,#6366f1);"></td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);
                                border-radius:14px;padding:14px 16px;margin-bottom:12px;">
                      <span style="font-size:28px;line-height:1;">&#x1F697;</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:24px;font-weight:800;color:#fafafa;letter-spacing:-0.5px;">CarsTrack</p>
                    <p style="margin:4px 0 0;font-size:11px;color:#71717a;font-weight:500;letter-spacing:0.5px;">
                      FİLO YÖNETİM SİSTEMİ
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ayırıcı -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#27272a;"></div>
            </td>
          </tr>

          <!-- Gövde -->
          <tr>
            <td style="padding:28px 40px 8px;">

              <!-- Selamlama -->
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#fafafa;">
                Merhaba ${recipientName},
              </p>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#a1a1aa;">
                Filo durumunuzda dikkat gerektiren uyarılar var. Aşağıda günlük özeti bulabilirsiniz.
              </p>

              <!-- Özet badge satırı -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#1c1c1f;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        ${criticalCount > 0 ? `
                        <td style="padding-right:12px;">
                          <span style="display:inline-block;background-color:#450a0a;color:#fca5a5;
                                       font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;">
                            ${criticalCount} KRİTİK
                          </span>
                        </td>` : ""}
                        ${warningCount > 0 ? `
                        <td style="padding-right:12px;">
                          <span style="display:inline-block;background-color:#431407;color:#fdba74;
                                       font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;">
                            ${warningCount} UYARI
                          </span>
                        </td>` : ""}
                        <td>
                          <span style="font-size:11px;color:#52525b;">${date}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Araç bazlı uyarılar -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${vehicleRows}
              </table>

            </td>
          </tr>

          <!-- CTA Butonu -->
          <tr>
            <td align="center" style="padding:4px 40px 28px;">
              <a href="${appUrl}" target="_blank"
                 style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6366f1);
                        color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;
                        padding:13px 32px;border-radius:10px;letter-spacing:0.2px;">
                Filo Paneline Git &rarr;
              </a>
            </td>
          </tr>

          <!-- Ayırıcı -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#27272a;"></div>
            </td>
          </tr>

          <!-- Alt bilgi -->
          <tr>
            <td style="padding:20px 40px 28px;">
              <p style="margin:0;font-size:11px;color:#52525b;text-align:center;line-height:1.6;">
                &copy; ${year} CarsTrack. Tüm hakları saklıdır.<br/>
                Bu e-posta filo uyarıları için otomatik olarak gönderilmiştir.<br/>
                E-posta bildirimlerini durdurmak için
                <a href="${appUrl}/settings" style="color:#7c3aed;text-decoration:none;">ayarlar</a>
                sayfasını ziyaret edin.
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
