import * as React from "react";
import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EmailButton } from "../components/EmailButton";
import { PALETTE, type ResetPasswordEmailProps } from "@/lib/email/emailTypes";

/**
 * Şifre sıfırlama e-postası. İmzalı `resetUrl` butona ve fallback bağlantıya
 * gömülür; güvenlik notu ve geçerlilik süresi gösterilir.
 */
export function ResetPasswordEmail({
  recipientName,
  resetUrl,
  expiresInHours = 1,
}: ResetPasswordEmailProps) {
  const greetingName = recipientName?.trim();

  return (
    <EmailLayout preview="Şifreni sıfırlamak için bağlantıya tıkla.">
      <Heading as="h2" style={title}>
        Şifre Sıfırlama
      </Heading>
      <Text style={paragraph}>
        Merhaba{greetingName ? ` ${greetingName}` : ""}, hesabın için bir şifre sıfırlama talebi
        aldık. Aşağıdaki butona tıklayarak yeni şifreni belirleyebilirsin.
      </Text>

      <EmailButton href={resetUrl} label="Şifremi Sıfırla" />

      <Section style={securityNote}>
        <Text style={securityText}>
          <strong style={securityStrong}>⚠️ Güvenlik notu:</strong> Bu bağlantı {expiresInHours} saat
          içinde geçerliliğini yitirecektir. Eğer bu talebi sen yapmadıysan bu e-postayı görmezden
          gelebilirsin — şifren değiştirilmeyecektir.
        </Text>
      </Section>

      <Text style={fallback}>
        Buton çalışmıyorsa aşağıdaki bağlantıyı tarayıcına kopyala:
        <br />
        <Link href={resetUrl} style={fallbackLink}>
          {resetUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

ResetPasswordEmail.PreviewProps = {
  recipientName: "Mehmet",
  resetUrl: "https://carstrack.app/auth/callback?token=preview",
  expiresInHours: 1,
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;

// ── Stiller ───────────────────────────────────────────────────────────────────

const title: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "20px",
  fontWeight: 700,
  color: PALETTE.textStrong,
};

const paragraph: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: "14px",
  lineHeight: 1.65,
  color: PALETTE.textMuted,
};

const securityNote: React.CSSProperties = {
  backgroundColor: PALETTE.surfaceMuted,
  borderRadius: "10px",
  padding: "2px 16px",
  margin: "12px 0 0",
};

const securityText: React.CSSProperties = {
  margin: "12px 0",
  fontSize: "12px",
  lineHeight: 1.55,
  color: PALETTE.textFaint,
};

const securityStrong: React.CSSProperties = {
  color: PALETTE.textMuted,
};

const fallback: React.CSSProperties = {
  margin: "20px 0 0",
  fontSize: "11px",
  lineHeight: 1.6,
  color: PALETTE.textFooter,
  wordBreak: "break-all",
};

const fallbackLink: React.CSSProperties = {
  color: PALETTE.brand,
  wordBreak: "break-all",
};
