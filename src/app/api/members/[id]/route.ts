import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDeactivatedRow } from "@/lib/member-status";

/** Supabase'de "süresiz ban" pratikte çok uzun bir süre vermektir (admin paneliyle aynı). */
const BAN_FOREVER = "876000h";

type ProfileRow = {
  id: string;
  company_id: string | null;
  role: string;
  full_name: string | null;
  deactivated_at?: string | null;
  deactivation_ban?: boolean;
};

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Üyeyi şirketten çıkarır (`{ active: false }`) ya da geri alır (`{ active: true }`).
 * Yalnızca aynı şirketin aktif yöneticisi, kendisi dışındaki bir üye için.
 *
 * Çıkarma (geri alınabilir pasifleştirme):
 *   1. Auth hesabı askıya alınır (zaten askıdaysa — ör. admin banı — dokunulmaz)
 *   2. profiles.deactivated_at yazılır → private.get_auth_role() NULL döner, RLS kapanır
 *   3. Araç atamaları silinir
 * Geri alma: yalnızca pasifleştirmenin koyduğu ban kaldırılır; atamalar geri gelmez.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetId } = await params;

  let body: { active?: unknown };
  try { body = await req.json(); } catch { return fail("Geçersiz istek.", 400); }
  if (typeof body.active !== "boolean") return fail("Geçersiz istek.", 400);
  const activate = body.active;

  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return fail("Unauthorized", 401);
  if (targetId === user.id) return fail("Kendinizi şirketten çıkaramazsınız.", 400);

  const admin = createAdminClient();
  const { data: rows, error: rowsErr } = await admin
    .from("profiles")
    .select("*")
    .in("id", [user.id, targetId]);
  if (rowsErr) return fail("Profil bilgileri alınamadı.", 500);

  const caller = (rows ?? []).find((r) => r.id === user.id) as ProfileRow | undefined;
  const target = (rows ?? []).find((r) => r.id === targetId) as ProfileRow | undefined;

  if (!caller || caller.role !== "manager" || isDeactivatedRow(caller) || !caller.company_id) {
    return fail("Bu işlem için yetkiniz yok.", 403);
  }
  if (!target || target.company_id !== caller.company_id) return fail("Üye bulunamadı.", 404);
  if (!("deactivated_at" in target)) {
    return fail("Bu özellik için veritabanı güncellemesi (20261115b_member_deactivation) henüz uygulanmamış.", 503);
  }

  const targetName = target.full_name || "Üye";
  const isDeactivated = isDeactivatedRow(target);

  if (!activate) {
    if (isDeactivated) return NextResponse.json({ ok: true });

    // Aktif seyahatteki sürücü çıkarılırsa görev sonsuza dek "aktif" kalır.
    const { count: activeTaskCount } = await admin
      .from("vehicle_tasks")
      .select("id", { count: "exact", head: true })
      .eq("driver_id", targetId)
      .eq("status", "active");
    if ((activeTaskCount ?? 0) > 0) {
      return fail(`${targetName} şu anda aktif bir seyahatte. Önce Görevler sayfasından seyahati bitirin.`, 409);
    }

    if (target.role === "manager") {
      const { data: managers } = await admin
        .from("profiles")
        .select("*")
        .eq("company_id", caller.company_id)
        .eq("role", "manager");
      const otherActive = (managers ?? []).filter((m) => m.id !== targetId && !isDeactivatedRow(m));
      if (otherActive.length === 0) return fail("Şirketin en az bir aktif yöneticisi olmalı.", 409);
    }

    // 1) Auth banı — zaten askıdaysa (admin banı, hesap silme talebi) bizim değil.
    const { data: authUser } = await admin.auth.admin.getUserById(targetId);
    const bannedUntil = (authUser?.user as { banned_until?: string | null } | undefined)?.banned_until;
    const alreadyBanned = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
    let weBanned = false;
    if (!alreadyBanned) {
      const { error: banErr } = await admin.auth.admin.updateUserById(targetId, { ban_duration: BAN_FOREVER });
      if (banErr) {
        console.error("[members] ban hatası:", banErr);
        return fail("Üyenin oturumu kapatılamadı, işlem yapılmadı.", 500);
      }
      weBanned = true;
    }

    // 2) Pasifleştir — başarısızsa koyduğumuz banı geri al.
    const { error: updErr } = await admin
      .from("profiles")
      .update({ deactivated_at: new Date().toISOString(), deactivated_by: user.id, deactivation_ban: weBanned })
      .eq("id", targetId);
    if (updErr) {
      if (weBanned) await admin.auth.admin.updateUserById(targetId, { ban_duration: "none" });
      console.error("[members] pasifleştirme hatası:", updErr);
      const msg = updErr.message?.includes("yoneticisi") ? "Şirketin en az bir aktif yöneticisi olmalı." : "Üye şirketten çıkarılamadı.";
      return fail(msg, 500);
    }

    // 3) Atamaları ve push aboneliklerini temizle (başarısızlık işlemi geri almaz).
    const [{ error: asgErr }, { error: pushErr }] = await Promise.all([
      admin.from("vehicle_assignments").delete().eq("driver_id", targetId),
      admin.from("push_subscriptions").delete().eq("user_id", targetId),
    ]);
    if (asgErr) console.error("[members] atama silme hatası:", asgErr);
    if (pushErr) console.error("[members] push aboneliği silme hatası:", pushErr);
  } else {
    if (!isDeactivated) return NextResponse.json({ ok: true });

    if (target.deactivation_ban) {
      const { error: unbanErr } = await admin.auth.admin.updateUserById(targetId, { ban_duration: "none" });
      if (unbanErr) {
        console.error("[members] ban kaldırma hatası:", unbanErr);
        return fail("Üyenin hesabı yeniden açılamadı.", 500);
      }
    }

    const { error: updErr } = await admin
      .from("profiles")
      .update({ deactivated_at: null, deactivated_by: null, deactivation_ban: false })
      .eq("id", targetId);
    if (updErr) {
      if (target.deactivation_ban) await admin.auth.admin.updateUserById(targetId, { ban_duration: BAN_FOREVER });
      console.error("[members] yeniden etkinleştirme hatası:", updErr);
      return fail("Üye yeniden etkinleştirilemedi.", 500);
    }
  }

  await admin.from("audit_logs").insert({
    company_id: caller.company_id,
    actor_id: user.id,
    actor_name: caller.full_name || "Yönetici",
    action: activate ? "member_reactivated" : "member_deactivated",
    entity_type: "profile",
    entity_id: targetId,
    entity_label: targetName,
    meta: { role: target.role },
  }).then(({ error: auditErr }) => { if (auditErr) console.error("[members] audit log hatası:", auditErr); });

  return NextResponse.json({ ok: true });
}
