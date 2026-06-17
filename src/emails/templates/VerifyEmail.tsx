import * as React from "react";
import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EmailButton } from "../components/EmailButton";
import { PALETTE, type VerifyEmailProps } from "@/lib/email/emailTypes";

/**
 * E-posta doğrulama e-postası. Kullanıcının adresinin gerçek olduğunu
 * teyit etmek için imzalı `verifyUrl` bağlantısını içerir.
 */
export function VerifyEmail({ recipientName, verifyUrl, expiresInHours = 24 }: VerifyEmailProps) {
  const greetingName = recipientName?.trim();

  return (
    <EmailLayout preview="E-posta adresini doğrulamak için bağlantıya tıkla.">
      <Heading as="h2" style={title}>
        E-posta Adresini Doğrula
      </Heading>
      <Text style={paragraph}>
        Merhaba{greetingName ? ` ${greetingName}` : ""}, hesabını güvende tutmak için e-posta
        adresinin sana ait olduğunu doğrulamamız gerekiyor. Aşağıdaki butona tıklaman yeterli.
      </Text>

      <EmailButton href={verifyUrl} label="E-postamı Doğrula" />

      <Section style={note}>
        <Text style={noteText}>
          Bu bağlantı {expiresInHours} saat boyunca geçerlidir. Bu hesabı sen oluşturmadıysan bu
          e-postayı görmezden gelebilirsin.
        </Text>
      </Section>

      <Text style={fallback}>
        Buton çalışmıyorsa aşağıdaki bağlantıyı tarayıcına kopyala:
        <br />
        <Link href={verifyUrl} style={fallbackLink}>
          {verifyUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  recipientName: "Mehmet",
  verifyUrl: "https://carstrack.app/auth/callback?token=preview",
  expiresInHours: 24,
} satisfies VerifyEmailProps;

export default VerifyEmail;

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

const note: React.CSSProperties = {
  backgroundColor: PALETTE.surfaceMuted,
  borderRadius: "10px",
  padding: "2px 16px",
  margin: "12px 0 0",
};

const noteText: React.CSSProperties = {
  margin: "12px 0",
  fontSize: "12px",
  lineHeight: 1.55,
  color: PALETTE.textFaint,
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
