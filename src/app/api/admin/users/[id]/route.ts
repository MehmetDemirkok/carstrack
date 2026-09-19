export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { bustAuthCache, withAdmin, getAuthUser, isBanned, logAdminAction, uniqueIds } from "@/lib/admin/api";
import { isAdminEmail } from "@/lib/admin/auth";
import type { AdminUserDetail } from "@/lib/admin/types";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["manager", "operator", "user", "sofor"];

/** Tek kullanıcının tam dökümü: profil, auth durumu, araçlar, aktivite, sayaçlar. */
export const GET = withAdmin<{ id: string }>(async (_req, { db, params }) => {
  const userId = params.id;

  const [profileRes, authUser] = await Promise.all([
    db
      .from("profiles")
      .select("id, company_id, full_name, role, department, created_at, notify_by_email, license_number")
      .eq("id", userId)
      .maybeSingle(),
    getAuthUser(db, userId),
  ]);

  if (profileRes.error) throw new Error(`profiles: ${profileRes.error.message}`);
  const profile = profileRes.data;
  if (!profile && !authUser) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const companyId = (profile?.company_id as string) ?? null;

  const [companyRes, assignmentsRes, auditRes, taskCountRes, fuelCountRes, reportCountRes, feedbackCountRes, kmLogCountRes] =
    await Promise.all([
      companyId
        ? db.from("companies").select("id, name").eq("id", companyId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      db.from("vehicle_assignments").select("vehicle_id").eq("driver_id", userId),
      db
        .from("audit_logs")
        .select("id, action, entity_label, created_at")
        .eq("actor_id", userId)
        .order("created_at", { ascending: false })
        .limit(15),
      db.from("vehicle_tasks").select("id", { count: "exact", head: true }).eq("driver_id", userId),
      db.from("fuel_records").select("id", { count: "exact", head: true }).eq("created_by", userId),
      db.from("vehicle_reports").select("id", { count: "exact", head: true }).eq("reporter_id", userId),
      db.from("feedback").select("id", { count: "exact", head: true }).eq("user_id", userId),
      db.from("kilometer_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

  const vehicleIds = uniqueIds((assignmentsRes.data ?? []).map((a) => a.vehicle_id as string));
  const vehiclesRes = vehicleIds.length
    ? await db.from("vehicles").select("id, plate, brand, model").in("id", vehicleIds)
    : { data: [], error: null };

  const company = companyRes.data as { id: string; name: string } | null;

  const detail: AdminUserDetail = {
    id: userId,
    email: authUser?.email ?? "—",
    fullName: (profile?.full_name as string) || "İsimsiz",
    role: ((profile?.role as UserRole) || "user") as UserRole,
    department: (profile?.department as string) || "",
    companyId,
    companyName: company?.name || "—",
    createdAt: (profile?.created_at as string) ?? authUser?.createdAt ?? new Date().toISOString(),
    lastSignInAt: authUser?.lastSignInAt ?? null,
    emailConfirmed: Boolean(authUser?.emailConfirmedAt),
    banned: authUser ? isBanned(authUser) : false,
    vehicleCount: vehicleIds.length,
    taskCount: taskCountRes.count ?? 0,
    notifyByEmail: profile?.notify_by_email !== false,
    provider: authUser?.provider ?? "email",
    authCreatedAt: authUser?.createdAt ?? "",
    licenseNumber: (profile?.license_number as string) || null,
    vehicles: (vehiclesRes.data ?? []).map((v) => ({
      id: v.id as string,
      plate: (v.plate as string) || "—",
      brand: (v.brand as string) || "",
      model: (v.model as string) || "",
    })),
    recentActivity: (auditRes.data ?? []).map((a) => ({
      id: a.id as string,
      action: a.action as string,
      entityLabel: (a.entity_label as string) ?? null,
      createdAt: a.created_at as string,
    })),
    stats: {
      tasks: taskCountRes.count ?? 0,
      fuelRecords: fuelCountRes.count ?? 0,
      reports: reportCountRes.count ?? 0,
      feedback: feedbackCountRes.count ?? 0,
      kilometerLogs: kmLogCountRes.count ?? 0,
    },
  };

  return NextResponse.json(detail);
});

/**
 * Kullanıcı güncelleme: rol, ad, departman, askıya alma, e-posta doğrulama.
 * Her alan bağımsız ve opsiyoneldir; gelen gövdede olmayan alana dokunulmaz.
 */
export const PATCH = withAdmin<{ id: string }>(async (req, ctx) => {
  const { db, params } = ctx;
  const userId = params.id;
  const body = (await req.json()) as {
    role?: UserRole;
    fullName?: string;
    department?: string;
    banned?: boolean;
    confirmEmail?: boolean;
  };

  const authUser = await getAuthUser(db, userId);
  const label = authUser?.email ?? userId;

  // Kendi admin hesabını kilitlemeye karşı koruma.
  if ((body.banned === true) && isAdminEmail(authUser?.email)) {
    return NextResponse.json(
      { error: "Süper admin hesabı askıya alınamaz." },
      { status: 400 },
    );
  }

  const profilePatch: Record<string, unknown> = {};
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
    }
    profilePatch.role = body.role;
  }
  if (body.fullName !== undefined) profilePatch.full_name = body.fullName.trim();
  if (body.department !== undefined) profilePatch.department = body.department.trim();

  if (Object.keys(profilePatch).length > 0) {
    // Şirketin son yöneticisini düşürmeyi engelle — uygulamadaki
    // `last_manager_guard` trigger'ıyla aynı kural, burada net hata mesajıyla.
    if (profilePatch.role && profilePatch.role !== "manager") {
      const { data: prof } = await db
        .from("profiles")
        .select("company_id, role")
        .eq("id", userId)
        .maybeSingle();
      if (prof?.role === "manager" && prof.company_id) {
        const { count } = await db
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", prof.company_id)
          .eq("role", "manager");
        if ((count ?? 0) <= 1) {
          return NextResponse.json(
            { error: "Bu kullanıcı şirketin tek yöneticisi — rolü düşürülemez." },
            { status: 400 },
          );
        }
      }
    }

    const { error } = await db.from("profiles").update(profilePatch).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logAdminAction(ctx, {
      action: body.role !== undefined ? "user_role_changed" : "user_profile_updated",
      targetType: "user",
      targetId: userId,
      targetLabel: label,
      meta: profilePatch,
    });
  }

  if (body.banned !== undefined) {
    // Supabase'de "süresiz ban" pratikte çok uzun bir süre vermektir.
    const { error } = await db.auth.admin.updateUserById(userId, {
      ban_duration: body.banned ? "876000h" : "none",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    bustAuthCache();

    await logAdminAction(ctx, {
      action: body.banned ? "user_banned" : "user_unbanned",
      targetType: "user",
      targetId: userId,
      targetLabel: label,
    });
  }

  if (body.confirmEmail === true) {
    const { error } = await db.auth.admin.updateUserById(userId, { email_confirm: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    bustAuthCache();

    await logAdminAction(ctx, {
      action: "user_email_confirmed",
      targetType: "user",
      targetId: userId,
      targetLabel: label,
    });
  }

  return NextResponse.json({ ok: true });
});

/**
 * Kullanıcıyı kalıcı olarak siler. auth.users silinince profiles ve ona bağlı
 * tüm kayıtlar ON DELETE CASCADE ile temizlenir — geri alınamaz.
 */
export const DELETE = withAdmin<{ id: string }>(async (_req, ctx) => {
  const { db, params } = ctx;
  const userId = params.id;

  const authUser = await getAuthUser(db, userId);
  if (isAdminEmail(authUser?.email)) {
    return NextResponse.json({ error: "Süper admin hesabı silinemez." }, { status: 400 });
  }

  const { data: prof } = await db
    .from("profiles")
    .select("company_id, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  // Şirketin son yöneticisini silmek şirketi sahipsiz bırakır.
  if (prof?.role === "manager" && prof.company_id) {
    const { count } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", prof.company_id)
      .eq("role", "manager");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        {
          error:
            "Bu kullanıcı şirketin tek yöneticisi. Önce başka bir yönetici atayın veya şirketi tamamen silin.",
        },
        { status: 400 },
      );
    }
  }

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  bustAuthCache();

  await logAdminAction(ctx, {
    action: "user_deleted",
    targetType: "user",
    targetId: userId,
    targetLabel: authUser?.email ?? (prof?.full_name as string) ?? userId,
    meta: { companyId: prof?.company_id ?? null, role: prof?.role ?? null },
  });

  return NextResponse.json({ ok: true });
});
