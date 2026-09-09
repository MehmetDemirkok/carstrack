export interface WeeklyAdminReportCompanyStat {
  id: string;
  name: string;
  planLabel: string;
  newUsers: number;
  newVehicles: number;
  serviceRecords: number;
  documents: number;
  tasks: number;
  kmAdjustments: number;
  fuelRecords: number;
  trafficFines: number;
  feedbackCount: number;
  totalActivity: number;
}

export interface WeeklyAdminReportInactiveCompany {
  id: string;
  name: string;
  planLabel: string;
  ageDays: number;
}

export interface WeeklyAdminReportNewCompany {
  id: string;
  name: string;
  planLabel: string;
  createdAtLabel: string;
}

export interface WeeklyAdminReportNewUser {
  name: string;
  roleLabel: string;
  companyName: string;
  createdAtLabel: string;
}

export interface WeeklyAdminReportFeedbackItem {
  companyName: string;
  typeLabel: string;
  message: string;
  createdAtLabel: string;
}

export interface WeeklyAdminReportTotals {
  companies: number;
  activeCompanies: number;
  newCompanies: number;
  newUsers: number;
  newVehicles: number;
  serviceRecords: number;
  documents: number;
  tasks: number;
  kmAdjustments: number;
  fuelRecords: number;
  trafficFines: number;
  feedback: number;
}

export interface WeeklyAdminReportParams {
  recipientName: string;
  periodLabel: string;
  generatedAtLabel: string;
  appUrl: string;
  totals: WeeklyAdminReportTotals;
  topCompanies: WeeklyAdminReportCompanyStat[];
  inactiveCompanies: WeeklyAdminReportInactiveCompany[];
  newCompanies: WeeklyAdminReportNewCompany[];
  newUsers: WeeklyAdminReportNewUser[];
  feedbackItems: WeeklyAdminReportFeedbackItem[];
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function kpiCell(value: number, label: string): string {
  return `
    <td align="center" style="padding:12px 6px;">
      <p style="margin:0;font-size:20px;font-weight:800;color:#fafafa;">${value}</p>
      <p style="margin:2px 0 0;font-size:10px;color:#71717a;font-weight:600;letter-spacing:0.3px;">${label}</p>
    </td>`;
}

function companyRow(c: WeeklyAdminReportCompanyStat): string {
  const chips: { label: string; value: number }[] = [
    { label: "yeni kullanıcı", value: c.newUsers },
    { label: "yeni araç", value: c.newVehicles },
    { label: "servis", value: c.serviceRecords },
    { label: "belge", value: c.documents },
    { label: "görev", value: c.tasks },
    { label: "km düzeltme", value: c.kmAdjustments },
    { label: "yakıt", value: c.fuelRecords },
    { label: "ceza", value: c.trafficFines },
    { label: "geri bildirim", value: c.feedbackCount },
  ].filter((chip) => chip.value > 0);

  const chipsHtml = chips
    .map(
      (chip) => `
        <span style="display:inline-block;background-color:#1c1c1f;color:#a1a1aa;
                     font-size:11px;font-weight:600;padding:3px 9px;border-radius:6px;
                     margin:0 6px 6px 0;">
          ${chip.value} ${esc(chip.label)}
        </span>`,
    )
    .join("");

  return `
    <tr>
      <td style="padding:0 0 18px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="border-left:3px solid #2563eb;border-radius:6px;background-color:#18181b;overflow:hidden;">
          <tr>
            <td style="padding:12px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;font-weight:700;color:#f4f4f5;">${esc(c.name)}</td>
                  <td align="right" style="white-space:nowrap;">
                    <span style="display:inline-block;background-color:#1e293b;color:#93c5fd;
                                 font-size:9px;font-weight:700;letter-spacing:0.6px;
                                 padding:2px 7px;border-radius:4px;">${esc(c.planLabel.toUpperCase())}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:8px;">${chipsHtml}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function inactiveRow(c: WeeklyAdminReportInactiveCompany): string {
  return `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #27272a;">
        <span style="font-size:12px;font-weight:600;color:#e4e4e7;">${esc(c.name)}</span>
        <span style="font-size:10px;color:#71717a;"> — ${esc(c.planLabel)}</span>
      </td>
      <td align="right" style="padding:8px 14px;border-bottom:1px solid #27272a;">
        <span style="font-size:11px;color:#f59e0b;">${c.ageDays} gündür kayıtlı</span>
      </td>
    </tr>`;
}

function newCompanyRow(c: WeeklyAdminReportNewCompany): string {
  return `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #27272a;">
        <span style="font-size:12px;font-weight:600;color:#e4e4e7;">${esc(c.name)}</span>
        <span style="font-size:10px;color:#71717a;"> — ${esc(c.planLabel)}</span>
      </td>
      <td align="right" style="padding:8px 14px;border-bottom:1px solid #27272a;">
        <span style="font-size:11px;color:#71717a;">${esc(c.createdAtLabel)}</span>
      </td>
    </tr>`;
}

function newUserRow(u: WeeklyAdminReportNewUser): string {
  return `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #27272a;">
        <span style="font-size:12px;font-weight:600;color:#e4e4e7;">${esc(u.name)}</span>
        <span style="font-size:10px;color:#71717a;"> — ${esc(u.roleLabel)} · ${esc(u.companyName)}</span>
      </td>
      <td align="right" style="padding:8px 14px;border-bottom:1px solid #27272a;">
        <span style="font-size:11px;color:#71717a;">${esc(u.createdAtLabel)}</span>
      </td>
    </tr>`;
}

function feedbackRow(f: WeeklyAdminReportFeedbackItem): string {
  return `
    <tr>
      <td style="padding:0 0 12px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="border-left:3px solid #a855f7;border-radius:6px;background-color:#18181b;overflow:hidden;">
          <tr>
            <td style="padding:10px 14px;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#d8b4fe;">
                ${esc(f.typeLabel)} — ${esc(f.companyName)}
              </p>
              <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#d4d4d8;">${esc(f.message)}</p>
              <p style="margin:6px 0 0;font-size:10px;color:#52525b;">${esc(f.createdAtLabel)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function sectionTitle(text: string): string {
  return `
    <tr>
      <td style="padding:24px 0 10px;">
        <p style="margin:0;font-size:12px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.6px;">
          ${esc(text)}
        </p>
      </td>
    </tr>`;
}

export function getWeeklyAdminReportHtml(params: WeeklyAdminReportParams): string {
  const { recipientName, periodLabel, generatedAtLabel, appUrl, totals } = params;
  const year = new Date().getFullYear();

  const topCompaniesHtml = params.topCompanies.length
    ? params.topCompanies.map(companyRow).join("")
    : `<tr><td style="padding:8px 0;font-size:12px;color:#71717a;">Bu hafta hiçbir şirkette aktivite kaydedilmedi.</td></tr>`;

  const inactiveHtml = params.inactiveCompanies.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#18181b;border-radius:10px;overflow:hidden;">
         ${params.inactiveCompanies.map(inactiveRow).join("")}
       </table>`
    : `<p style="margin:0;font-size:12px;color:#71717a;">Tüm mevcut şirketlerde bu hafta bir hareket var.</p>`;

  const newCompaniesHtml = params.newCompanies.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#18181b;border-radius:10px;overflow:hidden;">
         ${params.newCompanies.map(newCompanyRow).join("")}
       </table>`
    : `<p style="margin:0;font-size:12px;color:#71717a;">Bu hafta yeni şirket kaydı olmadı.</p>`;

  const newUsersHtml = params.newUsers.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#18181b;border-radius:10px;overflow:hidden;">
         ${params.newUsers.map(newUserRow).join("")}
       </table>`
    : `<p style="margin:0;font-size:12px;color:#71717a;">Bu hafta yeni kullanıcı kaydı olmadı.</p>`;

  const feedbackHtml = params.feedbackItems.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
         ${params.feedbackItems.map(feedbackRow).join("")}
       </table>`
    : `<p style="margin:0;font-size:12px;color:#71717a;">Bu hafta geri bildirim gelmedi.</p>`;

  return `<!DOCTYPE html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>CarsTrack — Haftalık Kullanıcı Aktivite Raporu</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background-color:#18181b;border-radius:16px;
                      border:1px solid #27272a;overflow:hidden;">

          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#2563eb,#0ea5e9,#6366f1);"></td>
          </tr>

          <tr>
            <td align="center" style="padding:32px 40px 24px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#2563eb,#0ea5e9);
                          border-radius:14px;padding:14px 16px;margin-bottom:12px;">
                <span style="font-size:28px;line-height:1;">&#x1F4CA;</span>
              </div>
              <p style="margin:0;font-size:24px;font-weight:800;color:#fafafa;letter-spacing:-0.5px;">CarsTrack</p>
              <p style="margin:4px 0 0;font-size:11px;color:#71717a;font-weight:500;letter-spacing:0.5px;">
                HAFTALIK KULLANICI AKTİVİTE RAPORU
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#27272a;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 4px;">
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#fafafa;">
                Merhaba ${esc(recipientName)},
              </p>
              <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#a1a1aa;">
                <strong style="color:#e4e4e7;">${esc(periodLabel)}</strong> döneminde tüm şirketlerdeki kullanıcı aktivitesinin özeti aşağıdadır.
              </p>
              <p style="margin:0 0 20px;font-size:11px;color:#52525b;">Oluşturulma: ${esc(generatedAtLabel)}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#1c1c1f;border-radius:10px;">
                <tr>
                  ${kpiCell(totals.activeCompanies, "AKTİF ŞİRKET")}
                  ${kpiCell(totals.newCompanies, "YENİ ŞİRKET")}
                  ${kpiCell(totals.newUsers, "YENİ KULLANICI")}
                  ${kpiCell(totals.newVehicles, "YENİ ARAÇ")}
                </tr>
              </table>

              ${sectionTitle(`Şirket Bazlı Aktivite (${params.topCompanies.length})`)}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${topCompaniesHtml}
              </table>

              ${sectionTitle(`Dikkat Gerekebilir — Bu Hafta Hareketsiz (${params.inactiveCompanies.length})`)}
              ${inactiveHtml}

              ${sectionTitle(`Yeni Şirket Kayıtları (${params.newCompanies.length})`)}
              ${newCompaniesHtml}

              ${sectionTitle(`Yeni Kullanıcı Kayıtları (${params.newUsers.length})`)}
              ${newUsersHtml}

              ${sectionTitle(`Geri Bildirimler (${params.feedbackItems.length})`)}
              ${feedbackHtml}

            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 40px 28px;">
              <a href="${appUrl}" target="_blank"
                 style="display:inline-block;background:linear-gradient(135deg,#2563eb,#0ea5e9);
                        color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;
                        padding:13px 32px;border-radius:10px;letter-spacing:0.2px;">
                Panele Git &rarr;
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#27272a;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 28px;">
              <p style="margin:0;font-size:11px;color:#52525b;text-align:center;line-height:1.6;">
                &copy; ${year} CarsTrack. Tüm hakları saklıdır.<br/>
                Bu rapor yalnızca ${esc(recipientName)}'e, her Cuma otomatik olarak gönderilir.
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
