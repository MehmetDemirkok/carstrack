import { createClient } from "./supabase/client";

export type AuditAction =
  | "role_changed"
  | "vehicle_deleted"
  | "task_deleted"
  | "invite_sent"
  | "invite_revoked"
  | "invite_code_regenerated";

interface LogActivityOptions {
  entityId?: string;
  entityLabel?: string;
  meta?: Record<string, unknown>;
}

/**
 * Aktivite/audit kaydı — asla throw etmez, çağıran akışı hiç etkilemez
 * (notify.ts'teki dispatchToManagers ile aynı "sessiz başarısızlık" ilkesi).
 * Bilerek `await` edilmeden fire-and-forget çağrılır (bkz. db.ts notifyEvent).
 */
export async function logActivity(
  action: AuditAction,
  entityType: string,
  options: LogActivityOptions = {},
): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const companyId =
      (user.app_metadata?.company_id as string | undefined) ??
      (user.user_metadata?.company_id as string | undefined);
    if (!companyId) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const actorName = (profile?.full_name as string | undefined) ?? "Bilinmeyen kullanıcı";

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      actor_id: user.id,
      actor_name: actorName,
      action,
      entity_type: entityType,
      entity_id: options.entityId ?? null,
      entity_label: options.entityLabel ?? null,
      meta: options.meta ?? {},
    });
  } catch (err) {
    console.error("[audit] log kaydı hatası:", err);
  }
}
