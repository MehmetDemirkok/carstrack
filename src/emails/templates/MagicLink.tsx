import * as React from "react";
import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EmailButton } from "../components/EmailButton";
import { PALETTE, type MagicLinkEmailProps } from "@/lib/email/emailTypes";

/**
 * Parolasız giriş (magic link) e-postası. Tek seferlik `loginUrl` bağlantısı
 * ile kullanıcı doğrudan oturum açar.
 */
export function MagicLinkEmail({
  recipientName,
  loginUrl,
  expiresInMinutes = 15,
}: MagicLinkEmailProps) {
  const greetingName = recipientName?.trim();

  return (
    <EmailLayout preview="Giriş yapmak için tek seferlik bağlantın hazır.">
      <Heading as="h2" style={title}>
        Giriş Bağlantın Hazır
      </Heading>
      <Text style={paragraph}>
        Merhaba{greetingName ? ` ${greetingName}` : ""}, parolaya ihtiyacın yok. Aşağıdaki butona
        tıklayarak hesabına güvenle giriş yapabilirsin.
      </Text>

      <EmailButton href={loginUrl} label="Giriş Yap" />

      <Section style={note}>
        <Text style={noteText}>
          🔒 Bu bağlantı tek kullanımlıktır ve {expiresInMinutes} dakika içinde geçerliliğini
          yitirir. Bu girişi sen talep etmediysen herhangi bir işlem yapmana gerek yok.
        </Text>
      </Section>

      <Text style={fallback}>
        Buton çalışmıyorsa aşağıdaki bağlantıyı tarayıcına kopyala:
        <br />
        <Link href={loginUrl} style={fallbackLink}>
          {loginUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

MagicLinkEmail.PreviewProps = {
  recipientName: "Mehmet",
  loginUrl: "https://carstrack.app/auth/callback?token=preview",
  expiresInMinutes: 15,
} satisfies MagicLinkEmailProps;

export default MagicLinkEmail;

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
