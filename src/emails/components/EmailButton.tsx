import * as React from "react";
import { Button, Section } from "@react-email/components";
import { PALETTE } from "@/lib/email/emailTypes";

/**
 * Ortak CTA butonu — tek vurgu rengi, sade ve "premium" (gradient yok).
 * Tüm template'ler aynı buton bileşenini kullanır (DRY + tutarlı görünüm).
 */
export interface EmailButtonProps {
  href: string;
  label: string;
  /** Buton arka plan rengi (varsayılan marka mavisi). */
  color?: string;
}

export function EmailButton({ href, label, color = PALETTE.brand }: EmailButtonProps) {
  return (
    <Section style={wrapper}>
      <Button href={href} style={{ ...button, backgroundColor: color }}>
        {label}
      </Button>
    </Section>
  );
}

const wrapper: React.CSSProperties = {
  textAlign: "center",
  padding: "24px 0 8px",
};

const button: React.CSSProperties = {
  display: "inline-block",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "13px 32px",
  borderRadius: "10px",
  letterSpacing: "0.2px",
};
