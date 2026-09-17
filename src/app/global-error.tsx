"use client";

import { useEffect } from "react";

/**
 * Kök layout'un kendisi çökerse devreye girer — bu durumda ThemeProvider,
 * globals.css ve tüm shell kullanılamaz olduğu için stiller satır içi yazıldı
 * ve kendi <html>/<body>'sini render eder.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[carstrack] kritik hata:", error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#09090b",
          color: "#fafafa",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "420px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 10px" }}>
            Uygulama açılamadı
          </h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#a1a1aa", margin: "0 0 24px" }}>
            Beklenmedik bir hata nedeniyle CarsTrack yüklenemedi. Verileriniz güvende.
            Sayfayı yenilemeyi deneyin.
          </p>
          <button
            onClick={() => reset()}
            style={{
              appearance: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: "12px",
              padding: "11px 22px",
              fontSize: "14px",
              fontWeight: 600,
              background: "#6fa3ff",
              color: "#09090b",
            }}
          >
            Tekrar dene
          </button>
          {error.digest && (
            <p style={{ marginTop: "22px", fontSize: "11px", color: "#71717a", fontFamily: "ui-monospace, monospace" }}>
              Hata kodu: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
