import { resend } from "@/lib/resend";
import { getResetPasswordHtml } from "./reset-password";
import { getFleetAlertsHtml } from "./fleet-alerts";
import type { FleetAlert } from "@/lib/types";

const FROM = process.env.RESEND_FROM_EMAIL ?? "CarsTrack <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "CarsTrack — Şifre Sıfırlama Bağlantısı",
    html: getResetPasswordHtml(resetLink),
  });
}

export async function sendFleetAlertDigest(params: {
  to: string;
  recipientName: string;
  alerts: FleetAlert[];
  appUrl: string;
  date: string;
}) {
  const criticalCount = params.alerts.filter((a) => a.severity === "critical").length;
  const subject =
    criticalCount > 0
      ? `CarsTrack — ${criticalCount} Kritik Filo Uyarısı`
      : `CarsTrack — Filo Uyarıları (${params.alerts.length})`;

  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject,
    html: getFleetAlertsHtml({
      recipientName: params.recipientName,
      alerts: params.alerts,
      appUrl: params.appUrl,
      date: params.date,
    }),
  });
}
