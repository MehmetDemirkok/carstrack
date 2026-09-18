import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperAdmin, type AdminIdentity } from "./auth";

export type { AdminIdentity };

/**
 * Admin API route handler'larının tek giriş kapısı.
 *
 * Kullanım:
 *   export const GET = withAdmin(async (req, { admin, db }) => { ... });
 *
 * `db` service-role istemcisidir (RLS'i baypas eder) — bu yüzden guard'ın
 * DIŞINDA asla oluşturulmaz. Admin değilse handler hiç çalışmaz.
 */
export interface AdminContext {
  admin: AdminIdentity;
  db: ReturnType<typeof createAdminClient>;
}

type Handler<T> = (
  req: Request,
  ctx: AdminContext & { params: T },
) => Promise<Response> | Response;

export function withAdmin<T = Record<string, never>>(handler: Handler<T>) {
  return async (req: Request, route?: { params: Promise<T> }): Promise<Response> => {
    const admin = await getSuperAdmin();
    if (!admin) {
      // Panelin varlığını sızdırmamak için 403 yerine sade bir mesaj.
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const params = route?.params ? await route.params : ({} as T);

    try {
      return await handler(req, { admin, db: createAdminClient(), params });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[admin-api] beklenmeyen hata:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin denetim kaydı
// ─────────────────────────────────────────────────────────────────────────────

export type AdminAuditAction =
  | "user_role_changed"
  | "user_profile_updated"
  | "user_banned"
  | "user_unbanned"
  | "user_email_confirmed"
  | "user_deleted"
  | "user_password_reset_link"
  | "user_magic_link"
  | "company_plan_changed"
  | "company_updated"
  | "company_deleted"
  | "email_broadcast_sent"
  | "notification_broadcast_sent"
  | "feedback_status_changed"
  | "cron_triggered";

export interface AdminAuditEntry {
  action: AdminAuditAction;
  targetType: "user" | "company" | "feedback" | "email" | "system";
  targetId?: string | null;
  targetLabel?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Admin panelinden yapılan HER değişikliği kaydeder. Asla throw etmez ve
 * asla çağıran akışı bozmaz — `admin_audit_log` tablosu henüz uygulanmamışsa
 * (migration çalıştırılmadıysa) sessizce uyarı basıp geçer.
 */
export async function logAdminAction(
  ctx: AdminContext,
  entry: AdminAuditEntry,
): Promise<void> {
  try {
    const { error } = await ctx.db.from("admin_audit_log").insert({
      actor_email: ctx.admin.email,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      target_label: entry.targetLabel ?? null,
      meta: entry.meta ?? {},
    });
    if (error) {
      console.warn(`[admin-api] denetim kaydı yazılamadı (${entry.action}): ${error.message}`);
    }
  } catch (err) {
    console.warn("[admin-api] denetim kaydı yazılamadı:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ortak yardımcılar
// ─────────────────────────────────────────────────────────────────────────────

/** ISO tarih — `days` gün önce. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Sorgu parametresini güvenli tamsayıya çevirir. */
export function intParam(
  url: URL,
  key: string,
  fallback: number,
  { min = 0, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number {
  const raw = url.searchParams.get(key);
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** PostgREST `.in()` filtrelerinde kullanılmak üzere id listesini tekilleştirir. */
export function uniqueIds(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => typeof v === "string" && v.length > 0))];
}

/**
 * Supabase Auth'ta kullanıcı sayısı binleri bulabileceğinden `listUsers`
 * sayfalanarak tamamı çekilir. 50k üstü hesapta yavaşlar ama bu ölçekte
 * (tek tenant SaaS başlangıcı) fazlasıyla yeterli ve tek sorguluk basitlikte.
 */
export interface AuthUserSummary {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  provider: string;
}

const AUTH_PAGE_SIZE = 1000;
const AUTH_MAX_PAGES = 50;

export async function listAllAuthUsers(
  db: AdminContext["db"],
): Promise<Map<string, AuthUserSummary>> {
  const map = new Map<string, AuthUserSummary>();

  for (let page = 1; page <= AUTH_MAX_PAGES; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });
    if (error) {
      console.error("[admin-api] auth.listUsers hatası:", error.message);
      break;
    }
    const users = data?.users ?? [];
    for (const u of users) {
      const row = u as unknown as {
        id: string;
        email?: string | null;
        created_at: string;
        last_sign_in_at?: string | null;
        email_confirmed_at?: string | null;
        confirmed_at?: string | null;
        banned_until?: string | null;
        app_metadata?: { provider?: string };
      };
      map.set(row.id, {
        id: row.id,
        email: row.email ?? "",
        createdAt: row.created_at,
        lastSignInAt: row.last_sign_in_at ?? null,
        emailConfirmedAt: row.email_confirmed_at ?? row.confirmed_at ?? null,
        bannedUntil: row.banned_until ?? null,
        provider: row.app_metadata?.provider ?? "email",
      });
    }
    if (users.length < AUTH_PAGE_SIZE) break;
  }

  return map;
}

/** Tek bir auth kullanıcısını özet tipe indirger. */
export async function getAuthUser(
  db: AdminContext["db"],
  userId: string,
): Promise<AuthUserSummary | null> {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  const row = data.user as unknown as {
    id: string;
    email?: string | null;
    created_at: string;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
    confirmed_at?: string | null;
    banned_until?: string | null;
    app_metadata?: { provider?: string };
  };
  return {
    id: row.id,
    email: row.email ?? "",
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at ?? null,
    emailConfirmedAt: row.email_confirmed_at ?? row.confirmed_at ?? null,
    bannedUntil: row.banned_until ?? null,
    provider: row.app_metadata?.provider ?? "email",
  };
}

/** Askıya alınmış mı? (banned_until gelecekte bir tarihse) */
export function isBanned(user: Pick<AuthUserSummary, "bannedUntil">): boolean {
  if (!user.bannedUntil) return false;
  const until = new Date(user.bannedUntil).getTime();
  return Number.isFinite(until) && until > Date.now();
}
