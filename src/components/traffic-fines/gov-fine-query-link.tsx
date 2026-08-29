"use client";

import { ShieldCheck, ExternalLink } from "lucide-react";

// Resmi e-Devlet "Araç Plakasına Yazılan Ceza Sorgulama" servisi (Emniyet Genel
// Müdürlüğü). Kimlik doğrulama (e-Devlet şifresi, mobil imza vb.) gerektirir —
// CarsTrack tarafında bir sorgulama API'si yok, kullanıcıyı resmi kaynağa yönlendirir.
const GOV_FINE_QUERY_URL = "https://www.turkiye.gov.tr/emniyet-arac-plakasina-yazilan-ceza-sorgulama";

export function GovFineQueryLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={GOV_FINE_QUERY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-colors p-4 ${className}`}
    >
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <ShieldCheck className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Resmi Ceza Sorgulama (e-Devlet)</p>
        <p className="text-xs text-muted-foreground">Plakaya kesilen güncel cezaları e-Devlet üzerinden sorgulayın</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
    </a>
  );
}
