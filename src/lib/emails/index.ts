import { resend } from "@/lib/resend";
import { getResetPasswordHtml } from "./reset-password";

const FROM = process.env.RESEND_FROM_EMAIL ?? "CarsTrack <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "CarsTrack — Şifre Sıfırlama Bağlantısı",
    html: getResetPasswordHtml(resetLink),
  });
}

// Future emails can be added here following the same pattern:
// export async function sendWelcomeEmail(to: string, name: string) { ... }
// export async function sendVerificationEmail(to: string, verifyLink: string) { ... }
// export async function sendMaintenanceAlertEmail(to: string, vehicleName: string) { ... }
