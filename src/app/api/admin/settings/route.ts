export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin, logAdminAction } from "@/lib/admin/api";
import type { AppBanner } from "@/lib/admin/types";

const DEFAULT_BANNER: AppBanner = { enabled: false, message: "", severity: "info" };
const SEVERITIES: AppBanner["severity"][] = ["info", "warning", "critical"];

/** Global uygulama ayarları — şu an yalnızca bakım/duyuru bandı. */
export const GET = withAdmin(async (_req, { db }) => {
  const { data, error } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "banner")
    .maybeSingle();

  // Tablo yoksa (migration uygulanmadıysa) varsayılan kapalı bant döner.
  if (error) {
    console.warn(`[admin/settings] app_settings okunamadı: ${error.message}`);
    return NextResponse.json({ banner: DEFAULT_BANNER, unavailable: true });
  }

  return NextResponse.json({
    banner: { ...DEFAULT_BANNER, ...((data?.value as Partial<AppBanner>) ?? {}) },
    unavailable: false,
  });
});

/**
 * Bandı günceller.
 *
 * Bant TÜM kiracılara görünür — bu yüzden her değişiklik denetime yazılır ve
 * açık bir bant boş mesajla kaydedilemez.
 */
export const PUT = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as Partial<AppBanner>;

  const enabled = body.enabled === true;
  const message = (body.message ?? "").trim().slice(0, 500);
  const severity = SEVERITIES.includes(body.severity as AppBanner["severity"])
    ? (body.severity as AppBanner["severity"])
    : "info";

  if (enabled && !message) {
    return NextResponse.json({ error: "Açık bant için mesaj gerekli." }, { status: 400 });
  }

  const banner: AppBanner = { enabled, message, severity };

  const { error } = await ctx.db.from("app_settings").upsert(
    {
      key: "banner",
      value: banner,
      updated_at: new Date().toISOString(),
      updated_by: ctx.admin.email,
    },
    { onConflict: "key" },
  );

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("app_settings")
          ? "app_settings tablosu yok — 20260919_admin_panel_v2.sql migration'ını çalıştır."
          : error.message,
      },
      { status: 400 },
    );
  }

  await logAdminAction(ctx, {
    action: "app_banner_changed",
    targetType: "system",
    targetLabel: enabled ? message.slice(0, 80) : "kapatıldı",
    meta: { ...banner },
  });

  return NextResponse.json({ ok: true, banner });
});
