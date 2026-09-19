export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAdmin, intParam, logAdminAction } from "@/lib/admin/api";
import type { AdminNoteRow, AdminNoteTarget } from "@/lib/admin/types";

const TARGET_TYPES: AdminNoteTarget[] = ["user", "company", "vehicle"];
const MAX_BODY = 4000;

/** Kayıt bulunamazsa (migration uygulanmamışsa) panel boş liste görür, hata vermez. */
function isMissingTable(message: string): boolean {
  return message.includes("admin_notes") && /does not exist|schema cache/i.test(message);
}

/** Bir hedefe ait destek notları — en yeni önce. */
export const GET = withAdmin(async (req, { db }) => {
  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType") ?? "";
  const targetId = url.searchParams.get("targetId") ?? "";
  const limit = intParam(url, "limit", 50, { min: 1, max: 200 });

  if (!TARGET_TYPES.includes(targetType as AdminNoteTarget) || !targetId) {
    return NextResponse.json({ error: "Geçersiz hedef" }, { status: 400 });
  }

  const { data, error } = await db
    .from("admin_notes")
    .select("id, actor_email, target_type, target_id, target_label, body, created_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTable(error.message)) {
      console.warn("[admin/notes] admin_notes tablosu yok — migration uygulanmamış olabilir.");
      return NextResponse.json({ notes: [], unavailable: true });
    }
    throw new Error(`admin_notes: ${error.message}`);
  }

  const notes: AdminNoteRow[] = (data ?? []).map((n) => ({
    id: n.id as string,
    actorEmail: n.actor_email as string,
    targetType: n.target_type as AdminNoteTarget,
    targetId: n.target_id as string,
    targetLabel: (n.target_label as string) || "",
    body: (n.body as string) || "",
    createdAt: n.created_at as string,
  }));

  return NextResponse.json({ notes, unavailable: false });
});

/** Yeni not ekler. */
export const POST = withAdmin(async (req, ctx) => {
  const body = (await req.json()) as {
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    body?: string;
  };

  const targetType = body.targetType ?? "";
  const targetId = body.targetId ?? "";
  const text = (body.body ?? "").trim();

  if (!TARGET_TYPES.includes(targetType as AdminNoteTarget) || !targetId) {
    return NextResponse.json({ error: "Geçersiz hedef" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Not boş olamaz" }, { status: 400 });

  const { data, error } = await ctx.db
    .from("admin_notes")
    .insert({
      actor_email: ctx.admin.email,
      target_type: targetType,
      target_id: targetId,
      target_label: (body.targetLabel ?? "").slice(0, 200),
      body: text.slice(0, MAX_BODY),
    })
    .select("id, actor_email, target_type, target_id, target_label, body, created_at")
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message)) {
      return NextResponse.json(
        { error: "admin_notes tablosu yok — 20260919_admin_panel_v2.sql migration'ını çalıştır." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Notun kendisi denetim kaydına yazılmaz — içeriği admin_notes'ta zaten duruyor.
  await logAdminAction(ctx, {
    action: "admin_note_added",
    targetType: targetType as AdminNoteTarget,
    targetId,
    targetLabel: body.targetLabel ?? null,
    meta: { length: text.length },
  });

  return NextResponse.json({ note: data });
});

/** Notu siler. */
export const DELETE = withAdmin(async (req, ctx) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Not id gerekli" }, { status: 400 });

  const { error } = await ctx.db.from("admin_notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAdminAction(ctx, {
    action: "admin_note_deleted",
    targetType: "system",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
});
