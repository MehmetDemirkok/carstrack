export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import {
  bustAuthCache,
  daysAgoIso,
  getAuthUser,
  listAllAuthUsers,
  logAdminAction,
  withAdmin,
} from "@/lib/admin/api";
import { isAdminEmail } from "@/lib/admin/auth";
import type { AdminCompanyDetail, AdminCompanyHealth } from "@/lib/admin/types";
import type { UserRole } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tek şirketin tam dökümü: bilgiler, ekip, araçlar ve içerik sayaçları. */
export const GET = withAdmin<{ id: string }>(async (_req, { db, params }) => {
  const companyId = params.id;

  const { data: company, error } = await db
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw new Error(`companies: ${error.message}`);
  if (!company) return NextResponse.json({ error: "Şirket bulunamadı" }, { status: 404 });

  const since30 = daysAgoIso(30);

  const [
    profilesRes,
    vehiclesRes,
    svcCountRes,
    docCountRes,
    taskCountRes,
    fuelCountRes,
    fineCountRes,
    reportCountRes,
    feedbackCountRes,
    activityRes,
    authUsers,
  ] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    db
      .from("vehicles")
      .select("id, plate, brand, model, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    db.from("service_records").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    db.from("vehicle_documents").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    db.from("vehicle_tasks").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    db.from("fuel_records").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    db.from("traffic_fines").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    db.from("vehicle_reports").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    db.from("feedback").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    Promise.all([
      db.from("service_records").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", since30),
      db.from("vehicle_tasks").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", since30),
      db.from("fuel_records").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", since30),
      db.from("vehicles").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", since30),
    ]),
    listAllAuthUsers(db),
  ]);

  const profiles = profilesRes.data ?? [];
  const vehicles = vehiclesRes.data ?? [];
  const activity30d = activityRes.reduce((sum, r) => sum + (r.count ?? 0), 0);

  let lastSignIn = 0;
  const members = profiles.map((p) => {
    const au = authUsers.get(p.id as string);
    if (au?.lastSignInAt) lastSignIn = Math.max(lastSignIn, new Date(au.lastSignInAt).getTime());
    return {
      id: p.id as string,
      email: au?.email ?? "—",
      fullName: (p.full_name as string) || "İsimsiz",
      role: ((p.role as UserRole) || "user") as UserRole,
      createdAt: p.created_at as string,
      lastSignInAt: au?.lastSignInAt ?? null,
    };
  });

  const createdAt = company.created_at as string;
  const d30 = Date.now() - 30 * DAY_MS;
  const isNew = new Date(createdAt).getTime() > d30;
  let health: AdminCompanyHealth = "healthy";
  if (!isNew && (!lastSignIn || lastSignIn < d30)) health = "dormant";
  else if (vehicles.length === 0) health = "empty";
  else if (activity30d === 0) health = "partial";

  const owner = members.find((m) => m.role === "manager") ?? null;

  const detail: AdminCompanyDetail = {
    id: companyId,
    name: (company.name as string) || "İsimsiz Şirket",
    createdAt,
    timezone: (company.timezone as string) ?? null,
    email: (company.email as string) ?? null,
    phone: (company.phone as string) ?? null,
    address: (company.address as string) ?? null,
    taxOffice: (company.tax_office as string) ?? null,
    taxNumber: (company.tax_number as string) ?? null,
    inviteCode: (company.invite_code as string) ?? null,
    userCount: members.length,
    vehicleCount: vehicles.length,
    activity30d,
    lastSignInAt: lastSignIn ? new Date(lastSignIn).toISOString() : null,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.fullName ?? null,
    health,
    members,
    vehicles: vehicles.map((v) => ({
      id: v.id as string,
      plate: (v.plate as string) || "—",
      brand: (v.brand as string) || "",
      model: (v.model as string) || "",
      createdAt: v.created_at as string,
    })),
    counts: {
      vehicles: vehicles.length,
      serviceRecords: svcCountRes.count ?? 0,
      documents: docCountRes.count ?? 0,
      tasks: taskCountRes.count ?? 0,
      fuelRecords: fuelCountRes.count ?? 0,
      trafficFines: fineCountRes.count ?? 0,
      reports: reportCountRes.count ?? 0,
      feedback: feedbackCountRes.count ?? 0,
    },
  };

  return NextResponse.json(detail);
});

/** Şirket güncelleme: ad, saat dilimi ve iletişim bilgileri. */
export const PATCH = withAdmin<{ id: string }>(async (req, ctx) => {
  const { db, params } = ctx;
  const body = (await req.json()) as {
    name?: string;
    timezone?: string;
    email?: string;
    phone?: string;
  };

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Şirket adı boş olamaz" }, { status: 400 });
    patch.name = name;
  }
  if (body.timezone !== undefined) patch.timezone = body.timezone;
  if (body.email !== undefined) patch.email = body.email.trim() || null;
  if (body.phone !== undefined) patch.phone = body.phone.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const { data, error } = await db
    .from("companies")
    .update(patch)
    .eq("id", params.id)
    .select("name")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction(ctx, {
    action: "company_updated",
    targetType: "company",
    targetId: params.id,
    targetLabel: (data?.name as string) ?? params.id,
    meta: patch,
  });

  return NextResponse.json({ ok: true });
});

/**
 * Şirketi ve ona bağlı HER ŞEYİ siler.
 *
 * Sıra önemli: önce üyelerin auth kayıtları silinir (bunlar `profiles`'ı
 * cascade ile götürür), sonra şirket satırı silinir — bu da araç/servis/görev
 * gibi company_id FK'li tüm tabloları cascade ile temizler. Ters sırada
 * yapılırsa şirketsiz kalan auth kullanıcıları ortada kalır.
 *
 * İki koruma var:
 *  1. Şirkette süper admin hesabı varsa işlem hiç başlamaz — aksi halde
 *     kendi hesabını silip panele erişimini kaybedebilirsin.
 *  2. Üyelerden biri silinemezse şirket satırına DOKUNULMAZ. Yarım kalan
 *     silme, profili cascade ile gitmiş ama auth kaydı duran "yetim"
 *     kullanıcılar bırakırdı.
 */
export const DELETE = withAdmin<{ id: string }>(async (_req, ctx) => {
  const { db, params } = ctx;

  const { data: company } = await db
    .from("companies")
    .select("name")
    .eq("id", params.id)
    .maybeSingle();

  if (!company) return NextResponse.json({ error: "Şirket bulunamadı" }, { status: 404 });

  const { data: members } = await db.from("profiles").select("id").eq("company_id", params.id);
  const memberIds = (members ?? []).map((m) => m.id as string);

  // ── Koruma 1: süper admin bu şirkette mi? ────────────────────────────────
  const memberAuth = await Promise.all(memberIds.map((id) => getAuthUser(db, id)));
  const adminMember = memberAuth.find((u) => isAdminEmail(u?.email));
  if (adminMember) {
    return NextResponse.json(
      {
        error:
          `Bu şirkette süper admin hesabı var (${adminMember.email}) — ` +
          "silinirse panele erişimini kaybedersin. Önce o hesabı başka bir şirkete taşı.",
      },
      { status: 400 },
    );
  }

  // ── Koruma 2: üyelerin hepsi silinemezse şirkete dokunma ─────────────────
  const failures: string[] = [];
  for (const id of memberIds) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) failures.push(`${id}: ${error.message}`);
  }
  bustAuthCache();

  if (failures.length > 0) {
    await logAdminAction(ctx, {
      action: "company_deleted",
      targetType: "company",
      targetId: params.id,
      targetLabel: (company.name as string) ?? params.id,
      meta: { outcome: "aborted", memberCount: memberIds.length, failures },
    });

    return NextResponse.json(
      {
        error:
          `${failures.length} üye silinemedi, şirket silinmedi. ` +
          "Tekrar dene; sorun sürerse önce o kullanıcıları tek tek sil.",
        failures,
        deletedUsers: memberIds.length - failures.length,
      },
      { status: 409 },
    );
  }

  const { error } = await db.from("companies").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction(ctx, {
    action: "company_deleted",
    targetType: "company",
    targetId: params.id,
    targetLabel: (company.name as string) ?? params.id,
    meta: { outcome: "deleted", deletedUsers: memberIds.length },
  });

  return NextResponse.json({ ok: true, deletedUsers: memberIds.length, failures: [] });
});
