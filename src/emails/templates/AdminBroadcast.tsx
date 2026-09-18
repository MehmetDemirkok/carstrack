import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "../components/EmailLayout";
import { EmailButton } from "../components/EmailButton";
import { PALETTE, getAppUrl, type AdminBroadcastEmailProps } from "@/lib/email/emailTypes";

/**
 * Süper admin panelinden gönderilen duyuru/bilgilendirme e-postası.
 *
 * Gövde düz metin olarak yazılır: boş satır paragrafı ayırır, "- " ile
 * başlayan satırlar madde işaretine dönüşür. Bilinçli olarak HTML kabul
 * edilmez — panelden gelen metin doğrudan enjekte edilmesin diye.
 */
export function AdminBroadcastEmail({
  recipientName,
  title,
  body,
  ctaUrl,
  ctaLabel,
  signature,
  appUrl = getAppUrl(),
}: AdminBroadcastEmailProps) {
  const greetingName = recipientName?.trim();
  const blocks = parseBody(body);

  return (
    <EmailLayout preview={title} showUnsubscribe appUrl={appUrl}>
      <Heading as="h2" style={heading}>
        {title}
      </Heading>

      <Text style={paragraph}>Merhaba{greetingName ? ` ${greetingName}` : ""},</Text>

      {blocks.map((block, i) =>
        block.type === "list" ? (
          <Section key={i} style={list}>
            {block.items.map((item, j) => (
              <Text key={j} style={listItem}>
                <span style={bullet}>•</span>
                <span>{item}</span>
              </Text>
            ))}
          </Section>
        ) : (
          <Text key={i} style={paragraph}>
            {block.text}
          </Text>
        ),
      )}

      {ctaUrl ? <EmailButton href={ctaUrl} label={ctaLabel || "Uygulamayı Aç"} /> : null}

      {signature ? <Text style={signatureStyle}>{signature}</Text> : null}
    </EmailLayout>
  );
}

type Block = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

/** Düz metni paragraf ve madde bloklarına ayırır. */
function parseBody(raw: string): Block[] {
  const blocks: Block[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ type: "list", items: listBuffer });
      listBuffer = [];
    }
  };
  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ") });
      paragraphBuffer = [];
    }
  };

  for (const line of (raw ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      listBuffer.push(trimmed.slice(2).trim());
      continue;
    }
    flushList();
    paragraphBuffer.push(trimmed);
  }
  flushList();
  flushParagraph();

  return blocks;
}

AdminBroadcastEmail.PreviewProps = {
  recipientName: "Mehmet",
  title: "Yeni özellik: Yakıt analizi",
  body: "Filo yakıt tüketimini artık araç bazında karşılaştırabilirsiniz.\n\n- Anomali tespiti\n- Aylık maliyet grafiği\n- Excel'e aktarma",
  ctaUrl: "https://carstrack.app/yakit",
  ctaLabel: "Yakıt Analizini Gör",
  signature: "CarsTrack Ekibi",
} satisfies AdminBroadcastEmailProps;

export default AdminBroadcastEmail;

// ── Stiller ───────────────────────────────────────────────────────────────────

const heading: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: "21px",
  fontWeight: 700,
  color: PALETTE.textStrong,
  letterSpacing: "-0.3px",
  lineHeight: 1.3,
};

const paragraph: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: "14px",
  lineHeight: 1.7,
  color: PALETTE.text,
};

const list: React.CSSProperties = {
  backgroundColor: PALETTE.surfaceMuted,
  borderRadius: "12px",
  padding: "6px 16px",
  margin: "4px 0 16px",
};

const listItem: React.CSSProperties = {
  margin: "9px 0",
  fontSize: "14px",
  lineHeight: 1.5,
  color: PALETTE.text,
};

const bullet: React.CSSProperties = {
  marginRight: "10px",
  color: PALETTE.brand,
  fontWeight: 700,
};

const signatureStyle: React.CSSProperties = {
  margin: "20px 0 0",
  fontSize: "13px",
  lineHeight: 1.6,
  color: PALETTE.textFaint,
};
