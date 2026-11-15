import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Şu an yayında olan sürümün kimliği. Açık kalan PWA bunu kendi
 * <html data-dpl-id> değeriyle karşılaştırıp yeni sürüm olup olmadığını anlar
 * (bkz. components/app-update-checker.tsx, next.config.ts → deploymentId).
 * Oturum gerektirmez; yalnızca yayın kimliğini döndürür.
 */
export function GET() {
  return NextResponse.json(
    { deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
