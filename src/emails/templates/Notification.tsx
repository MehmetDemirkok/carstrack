import * as React from "react";
import { Column, Heading, Row, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EmailButton } from "../components/EmailButton";
import {
  PALETTE,
  SEVERITY_ACCENT,
  getAppUrl,
  type NotificationEmailProps,
} from "@/lib/email/emailTypes";

/**
 * Genel bildirim/olay e-postası (görev başladı/bitti, yeni arıza, filo uyarısı
 * vb.). Telegram/push ile aynı kitleye, aynı olaylarda gönderilir. `severity`
 * vurgu rengini, `rows` etiket→değer detaylarını belirler.
 */
export function NotificationEmail({
  recipientName,
  title,
  emoji,
  intro,
  rows = [],
  note,
  severity = "info",
  accentColor,
  appUrl = getAppUrl(),
  ctaUrl,
  ctaLabel = "Uygulamada Görüntüle",
}: NotificationEmailProps) {
  const accent = accentColor ?? SEVERITY_ACCENT[severity];
  const greetingName = recipientName?.trim();

  return (
    <EmailLayout preview={`${title} — ${intro}`} showUnsubscribe appUrl={appUrl}>
      <Heading as="h2" style={heading}>
        {emoji ? `${emoji} ` : ""}
        {title}
      </Heading>

      {greetingName && <Text style={greeting}>Merhaba {greetingName},</Text>}
      <Text style={introText}>{intro}</Text>

      {rows.length > 0 && (
        <Section style={detailCard}>
          {rows.map(({ label, value }) => (
            <Row key={`${label}:${value}`} style={detailRow}>
              <Column style={labelCol}>
                <Text style={labelText}>{label.toLocaleUpperCase("tr")}</Text>
              </Column>
              <Column style={valueCol}>
                <Text style={valueText}>{value}</Text>
              </Column>
            </Row>
          ))}
        </Section>
      )}

      {note && (
        <Section style={noteCard}>
          <Text style={noteText}>📝 {note}</Text>
        </Section>
      )}

      <EmailButton href={ctaUrl ?? appUrl} label={ctaLabel} color={accent} />
    </EmailLayout>
  );
}

NotificationEmail.PreviewProps = {
  recipientName: "Mehmet",
  title: "Görev Başladı",
  emoji: "🟢",
  intro: "Ahmet Yılmaz yeni bir görevi başlattı.",
  rows: [
    { label: "Sürücü", value: "Ahmet Yılmaz" },
    { label: "Plaka", value: "34 ABC 123" },
  ],
  note: "Görev güzergahı İstanbul → Ankara olarak planlandı.",
  severity: "success",
  ctaLabel: "Görevi Görüntüle",
} satisfies NotificationEmailProps;

export default NotificationEmail;

// ── Stiller ───────────────────────────────────────────────────────────────────

const heading: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: "17px",
  fontWeight: 700,
  color: PALETTE.textStrong,
};

const greeting: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "14px",
  fontWeight: 700,
  color: PALETTE.textStrong,
};

const introText: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: "13px",
  lineHeight: 1.6,
  color: PALETTE.textMuted,
};

const detailCard: React.CSSProperties = {
  backgroundColor: PALETTE.surfaceMuted,
  borderRadius: "10px",
  padding: "4px 16px",
};

const detailRow: React.CSSProperties = {
  borderBottom: `1px solid ${PALETTE.border}`,
};

const labelCol: React.CSSProperties = {
  padding: "8px 0",
  verticalAlign: "middle",
};

const valueCol: React.CSSProperties = {
  padding: "8px 0",
  textAlign: "right",
  verticalAlign: "middle",
};

const labelText: React.CSSProperties = {
  margin: 0,
  fontSize: "11px",
  color: PALETTE.textFaint,
  fontWeight: 600,
  letterSpacing: "0.4px",
};

const valueText: React.CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: PALETTE.textStrong,
  fontWeight: 600,
};

const noteCard: React.CSSProperties = {
  backgroundColor: PALETTE.surfaceMuted,
  borderRadius: "10px",
  padding: "2px 14px",
  marginTop: "16px",
};

const noteText: React.CSSProperties = {
  margin: "12px 0",
  fontSize: "12px",
  lineHeight: 1.5,
  color: PALETTE.textMuted,
};
