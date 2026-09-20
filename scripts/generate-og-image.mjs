/**
 * public/og-image.png üretir — sosyal paylaşım (Open Graph / Twitter) görseli.
 *
 * Tarayıcı gerektirmez: next/og (Satori + resvg) JSX'i doğrudan PNG'ye çevirir.
 * Landing tasarımı değiştiğinde `node scripts/generate-og-image.mjs` ile yenileyin.
 *
 * Renkler globals.css'teki koyu tema token'larının hex karşılığıdır; Satori
 * oklch() ve CSS değişkenlerini desteklemediği için burada sabit yazılır.
 */
import { ImageResponse } from "next/og.js";
import { writeFileSync } from "node:fs";
import { createElement as h } from "react";

const C = {
  heroFrom: "#121928",
  heroTo: "#060a13",
  card: "#131926",
  border: "#293040",
  fg: "#edeef5",
  muted: "#989eae",
  primary: "#6fa2ff",
  cyan: "#1acfdf",
  mint: "#4bdba0",
  warning: "#f5ae39",
  destructive: "#e64343",
};

const div = (style, children) => h("div", { style: { display: "flex", ...style } }, children);

/** Sağdaki mini panel — landing'deki ürün önizlemesinin sadeleştirilmiş hâli. */
function panel() {
  const kpi = (label, value) =>
    div(
      {
        flexDirection: "column",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        width: 128,
      },
      [
        div({ color: C.muted, fontSize: 15 }, label),
        div({ color: C.fg, fontSize: 30, fontWeight: 800, marginTop: 4 }, value),
      ]
    );

  const alert = (color, plate, text) =>
    div(
      {
        alignItems: "center",
        gap: 12,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "12px 14px",
      },
      [
        div({ width: 10, height: 10, borderRadius: 999, background: color }),
        div({ color: C.fg, fontSize: 17, fontWeight: 700 }, plate),
        div({ color: C.muted, fontSize: 16 }, text),
      ]
    );

  return div(
    {
      flexDirection: "column",
      gap: 14,
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 22,
      padding: 24,
      width: 470,
    },
    [
      div({ gap: 12 }, [kpi("Araç", "12"), kpi("Uyarı", "3"), kpi("Servis", "5")]),
      alert(C.destructive, "34 ABC 12", "Muayene 4 gün"),
      alert(C.warning, "06 XYZ 88", "Yağ değişimi yakın"),
      alert(C.mint, "35 DEF 45", "Bakımlar güncel"),
    ]
  );
}

const tree = div(
  {
    width: "100%",
    height: "100%",
    background: `linear-gradient(150deg, ${C.heroFrom} 0%, ${C.heroTo} 100%)`,
    padding: 64,
    alignItems: "center",
    justifyContent: "space-between",
  },
  [
    div({ flexDirection: "column", width: 560 }, [
      // marka
      div({ alignItems: "center", gap: 12, marginBottom: 34 }, [
        div(
          {
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
          },
          []
        ),
        div({ color: C.fg, fontSize: 28, fontWeight: 800 }, "CarsTrack"),
      ]),
      div(
        { color: C.fg, fontSize: 60, fontWeight: 800, lineHeight: 1.08, flexDirection: "column" },
        [div({}, "Filonuzun tam"), div({ color: C.primary }, "kontrolü")]
      ),
      div(
        { color: C.muted, fontSize: 24, marginTop: 22, lineHeight: 1.45 },
        "Araç bakım takibi, sigorta ve muayene hatırlatmaları, servis geçmişi ve filo analitiği — tek platformda."
      ),
      div({ alignItems: "center", gap: 10, marginTop: 30 }, [
        div(
          {
            background: C.primary,
            color: "#0b1220",
            fontSize: 20,
            fontWeight: 800,
            borderRadius: 12,
            padding: "12px 22px",
          },
          "Ücretsiz Başla"
        ),
        div({ color: C.muted, fontSize: 20, marginLeft: 8 }, "carstrack.app"),
      ]),
    ]),
    panel(),
  ]
);

const img = new ImageResponse(tree, { width: 1200, height: 630 });
const buf = Buffer.from(await img.arrayBuffer());
writeFileSync("public/og-image.png", buf);
console.log(`public/og-image.png yazıldı — ${(buf.length / 1024).toFixed(0)} KB`);
