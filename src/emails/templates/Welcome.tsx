import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EmailButton } from "../components/EmailButton";
import { BRAND, PALETTE, getAppUrl, type WelcomeEmailProps } from "@/lib/email/emailTypes";

/** Sisteme nasıl başlanacağını anlatan adımlar. */
const ONBOARDING_STEPS: string[] = [
  "Hesabına giriş yap.",
  "Profil bilgilerini tamamla.",
  "İlk işlemini oluştur.",
  "Bildirimlerini takip et.",
  "Destek ekibimize istediğin zaman ulaşabilirsin.",
];

/**
 * Yeni üye olan kullanıcıya gönderilen hoş geldin e-postası.
 * Sade, kurumsal, koyu temalı; tek CTA ile kullanıcıyı uygulamaya yönlendirir.
 */
export function WelcomeEmail({ recipientName, appUrl = getAppUrl(), ctaUrl }: WelcomeEmailProps) {
  const greetingName = recipientName?.trim();

  return (
    <EmailLayout preview="Hesabın başarıyla oluşturuldu — hadi başlayalım.">
      <Heading as="h2" style={title}>
        Aramıza Hoş Geldin 🎉
      </Heading>
      <Text style={subtitle}>Hesabın başarıyla oluşturuldu.</Text>

      <Text style={paragraph}>
        Merhaba{greetingName ? ` ${greetingName}` : ""}, {BRAND.name} ailesine katıldığın için
        mutluyuz. Filonu tek yerden yönetmeye başlamak için aşağıdaki adımları izlemen yeterli:
      </Text>

      {/* Onboarding adımları */}
      <Section style={steps}>
        {ONBOARDING_STEPS.map((step) => (
          <Text key={step} style={stepItem}>
            <span style={check}>✅</span>
            <span style={stepText}>{step}</span>
          </Text>
        ))}
      </Section>

      <EmailButton href={ctaUrl ?? `${appUrl}/dashboard`} label="Sistemi Kullanmaya Başla" />

      <Text style={closing}>
        Her şey hazır. Aklına takılan bir şey olursa bu e-postanın altındaki destek adresinden bize
        ulaşabilirsin.
      </Text>
    </EmailLayout>
  );
}

// Önizleme/CLI için varsayılan props
WelcomeEmail.PreviewProps = {
  recipientName: "Mehmet",
  appUrl: "https://carstrack.app",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;

// ── Stiller ───────────────────────────────────────────────────────────────────

const title: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "22px",
  fontWeight: 700,
  color: PALETTE.textStrong,
  letterSpacing: "-0.3px",
};

const subtitle: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: "14px",
  fontWeight: 500,
  color: PALETTE.textMuted,
};

const paragraph: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: "14px",
  lineHeight: 1.65,
  color: PALETTE.textMuted,
};

const steps: React.CSSProperties = {
  backgroundColor: PALETTE.surfaceMuted,
  borderRadius: "12px",
  padding: "8px 16px",
  margin: "4px 0 8px",
};

const stepItem: React.CSSProperties = {
  margin: "10px 0",
  fontSize: "14px",
  lineHeight: 1.4,
  color: PALETTE.text,
};

const check: React.CSSProperties = {
  marginRight: "10px",
};

const stepText: React.CSSProperties = {
  color: PALETTE.text,
};

const closing: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "13px",
  lineHeight: 1.6,
  color: PALETTE.textFaint,
};
