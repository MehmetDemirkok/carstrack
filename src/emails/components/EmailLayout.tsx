import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { BRAND, PALETTE, getAppUrl } from "@/lib/email/emailTypes";

/**
 * Tüm e-postaların ortak kabuğu: koyu tema, marka logosu, başlık ve footer.
 *
 * Template'ler yalnızca "gövde"yi yazar; header/footer/copyright/abonelik
 * notu burada tek yerde tutulur (DRY). Tasarım güncellemesi tek dosyada.
 */
export interface EmailLayoutProps {
  /** Gelen kutusu önizleme metni (zarf metni). */
  preview: string;
  /** Footer'da abonelikten çıkış satırını göster (bildirim e-postaları için). */
  showUnsubscribe?: boolean;
  appUrl?: string;
  children: React.ReactNode;
}

export function EmailLayout({
  preview,
  showUnsubscribe = false,
  appUrl = getAppUrl(),
  children,
}: EmailLayoutProps) {
  const year = new Date().getFullYear();

  return (
    <Html lang="tr" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={card}>
          {/* Marka başlığı */}
          <Section style={header}>
            <div style={logoBadge}>🚗</div>
            <Heading as="h1" style={brandName}>
              {BRAND.name}
            </Heading>
            <Text style={brandTagline}>{BRAND.tagline.toLocaleUpperCase("tr")}</Text>
          </Section>

          <Hr style={divider} />

          {/* Şablona özel gövde */}
          <Section style={content}>{children}</Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {year} {BRAND.name}. Tüm hakları saklıdır.
            </Text>
            <Text style={footerText}>
              Yardıma mı ihtiyacın var?{" "}
              <Link href={`mailto:${BRAND.supportAddress}`} style={footerLink}>
                {BRAND.supportAddress}
              </Link>
            </Text>
            <Text style={footerMuted}>
              Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.
            </Text>
            {showUnsubscribe && (
              <Text style={footerMuted}>
                E-posta bildirimlerini durdurmak için{" "}
                <Link href={`${appUrl}/settings`} style={footerLink}>
                  ayarlar
                </Link>{" "}
                sayfasını ziyaret edebilirsin.
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Stiller (inline; e-posta istemcileri için en güvenli yöntem) ──────────────

const body: React.CSSProperties = {
  margin: 0,
  padding: "40px 16px",
  backgroundColor: PALETTE.bg,
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};

const card: React.CSSProperties = {
  maxWidth: "540px",
  margin: "0 auto",
  backgroundColor: PALETTE.surface,
  borderRadius: "16px",
  border: `1px solid ${PALETTE.border}`,
  overflow: "hidden",
};

const header: React.CSSProperties = {
  padding: "32px 40px 20px",
  textAlign: "center",
};

const logoBadge: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: PALETTE.brand,
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "26px",
  lineHeight: 1,
  marginBottom: "12px",
};

const brandName: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 800,
  color: PALETTE.textStrong,
  letterSpacing: "-0.5px",
};

const brandTagline: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: "11px",
  color: PALETTE.textFaint,
  fontWeight: 500,
  letterSpacing: "0.5px",
};

const divider: React.CSSProperties = {
  borderColor: PALETTE.border,
  margin: "0 40px",
  width: "auto",
};

const content: React.CSSProperties = {
  padding: "28px 40px 8px",
};

const footer: React.CSSProperties = {
  padding: "20px 40px 28px",
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "11px",
  color: PALETTE.textFooter,
  lineHeight: 1.6,
};

const footerMuted: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "11px",
  color: PALETTE.textFooter,
  lineHeight: 1.6,
};

const footerLink: React.CSSProperties = {
  color: PALETTE.brand,
  textDecoration: "none",
};
