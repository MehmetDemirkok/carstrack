export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyAdminReportEmail } from "@/lib/email/sendEmail";
import { getAppUrl } from "@/lib/email/emailTypes";
import { getPlan } from "@/lib/plans";
import type {
  WeeklyAdminReportCompanyStat,
  WeeklyAdminReportFeedbackItem,
  WeeklyAdminReportInactiveCompany,
  WeeklyAdminReportNewCompany,
  WeeklyAdminReportNewUser,
} from "@/lib/emails/weekly-admin-report";
import type { PlanType } from "@/lib/types";

/**
 * TEK bir alıcıya (uygulama sahibi) giden, tüm şirketleri kapsayan haftalık
 * kullanıcı-aktivite raporu. Bilinçli olarak sabit — bildirim tercihlerinden,
 * şirket verisinden veya `notify.ts` fan-out'undan TÜREMEZ, çünkü bu diğer
 * kullanıcılara/şirketlere gitmemesi gereken kişisel bir yönetici raporudur.
 *
 * Vercel cron UTC kullanır: Cuma 09:00 TR = 06:00 UTC → `0 6 * * 5`
 */
const REPORT_RECIPIENT = "mehmetdemirkok@gmail.com";
const REPORT_RECIPIENT_NAME = "Mehmet";

const ROLE_LABELS: Record<string, string> = { manager: "Yönetici", operator: "Operatör", user: "Sürücü" };
const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  bug: "Hata Bildirimi",
  suggestion: "Öneri",
  other: "Genel Geri Bildirim",
};

interface CompanyAgg {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
  newUsers: number;
  newVehicles: number;
  serviceRecords: number;
  documents: number;
  tasks: number;
  kmAdjustments: number;
  fuelRecords: number;
  trafficFines: number;
  feedbackCount: number;
}

function totalActivity(c: CompanyAgg): number {
  return (
    c.newUsers +
    c.newVehicles +
    c.serviceRecords +
    c.documents +
    c.tasks +
    c.fuelRecords +
    c.trafficFines +
    c.feedbackCount
  );
}

function getRequestAppUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(req.url).origin;
}

const TR_TZ = "Europe/Istanbul";

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: TR_TZ });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: TR_TZ });
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const appUrl = getRequestAppUrl(req) || getAppUrl();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoIso = weekAgo.toISOString();

  const [
    companiesRes,
    newProfilesRes,
    newVehiclesRes,
    serviceRecordsRes,
    documentsRes,
    tasksRes,
    fuelRecordsRes,
    trafficFinesRes,
    feedbackRes,
  ] = await Promise.all([
    admin.from("companies").select("id, name, plan, created_at"),
    admin
      .from("profiles")
      .select("id, company_id, full_name, role, created_at")
      .gte("created_at", weekAgoIso),
    admin.from("vehicles").select("id, company_id, created_at").gte("created_at", weekAgoIso),
    admin.from("service_records").select("id, company_id, created_at").gte("created_at", weekAgoIso),
    admin.from("vehicle_documents").select("id, company_id, created_at").gte("created_at", weekAgoIso),
    admin
      .from("vehicle_tasks")
      .select("id, company_id, is_adjustment, created_at")
      .gte("created_at", weekAgoIso),
    admin.from("fuel_records").select("id, company_id, created_at").gte("created_at", weekAgoIso),
    admin.from("traffic_fines").select("id, company_id, created_at").gte("created_at", weekAgoIso),
    admin
      .from("feedback")
      .select("id, company_id, type, message, created_at")
      .gte("created_at", weekAgoIso),
  ]);

  if (companiesRes.error) {
    console.error("[cron/weekly-admin-report] companies error:", companiesRes.error);
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
  }

  for (const [label, res] of [
    ["profiles", newProfilesRes],
    ["vehicles", newVehiclesRes],
    ["service_records", serviceRecordsRes],
    ["vehicle_documents", documentsRes],
    ["vehicle_tasks", tasksRes],
    ["fuel_records", fuelRecordsRes],
    ["traffic_fines", trafficFinesRes],
    ["feedback", feedbackRes],
  ] as const) {
    if (res.error) console.error(`[cron/weekly-admin-report] ${label} error:`, res.error);
  }

  const companies = companiesRes.data ?? [];
  const companyMap = new Map<string, CompanyAgg>();
  for (const c of companies) {
    companyMap.set(c.id as string, {
      id: c.id as string,
      name: (c.name as string) || "İsimsiz Şirket",
      plan: (c.plan as string) || "free",
      createdAt: c.created_at as string,
      newUsers: 0,
      newVehicles: 0,
      serviceRecords: 0,
      documents: 0,
      tasks: 0,
      kmAdjustments: 0,
      fuelRecords: 0,
      trafficFines: 0,
      feedbackCount: 0,
    });
  }

  const newProfiles = newProfilesRes.data ?? [];
  for (const p of newProfiles) {
    const agg = companyMap.get(p.company_id as string);
    if (agg) agg.newUsers++;
  }
  for (const v of newVehiclesRes.data ?? []) {
    const agg = companyMap.get(v.company_id as string);
    if (agg) agg.newVehicles++;
  }
  for (const s of serviceRecordsRes.data ?? []) {
    const agg = companyMap.get(s.company_id as string);
    if (agg) agg.serviceRecords++;
  }
  for (const d of documentsRes.data ?? []) {
    const agg = companyMap.get(d.company_id as string);
    if (agg) agg.documents++;
  }
  const tasks = tasksRes.data ?? [];
  for (const t of tasks) {
    const agg = companyMap.get(t.company_id as string);
    if (agg) {
      agg.tasks++;
      if (t.is_adjustment) agg.kmAdjustments++;
    }
  }
  for (const f of fuelRecordsRes.data ?? []) {
    const agg = companyMap.get(f.company_id as string);
    if (agg) agg.fuelRecords++;
  }
  for (const tf of trafficFinesRes.data ?? []) {
    const agg = companyMap.get(tf.company_id as string);
    if (agg) agg.trafficFines++;
  }
  const feedbackRows = feedbackRes.data ?? [];
  for (const fb of feedbackRows) {
    const agg = companyMap.get(fb.company_id as string);
    if (agg) agg.feedbackCount++;
  }

  const allCompanies = [...companyMap.values()];

  const topCompanies: WeeklyAdminReportCompanyStat[] = allCompanies
    .filter((c) => totalActivity(c) > 0)
    .sort((a, b) => totalActivity(b) - totalActivity(a))
    .map((c) => ({
      id: c.id,
      name: c.name,
      planLabel: getPlan(c.plan as PlanType).name,
      newUsers: c.newUsers,
      newVehicles: c.newVehicles,
      serviceRecords: c.serviceRecords,
      documents: c.documents,
      tasks: c.tasks,
      kmAdjustments: c.kmAdjustments,
      fuelRecords: c.fuelRecords,
      trafficFines: c.trafficFines,
      feedbackCount: c.feedbackCount,
      totalActivity: totalActivity(c),
    }));

  const inactiveCompanies: WeeklyAdminReportInactiveCompany[] = allCompanies
    .filter((c) => totalActivity(c) === 0 && new Date(c.createdAt).getTime() < weekAgo.getTime())
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((c) => ({
      id: c.id,
      name: c.name,
      planLabel: getPlan(c.plan as PlanType).name,
      ageDays: Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
    }));

  const newCompanies: WeeklyAdminReportNewCompany[] = allCompanies
    .filter((c) => new Date(c.createdAt).getTime() >= weekAgo.getTime())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((c) => ({
      id: c.id,
      name: c.name,
      planLabel: getPlan(c.plan as PlanType).name,
      createdAtLabel: formatShortDate(c.createdAt),
    }));

  const newUsers: WeeklyAdminReportNewUser[] = newProfiles
    .slice()
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .map((p) => ({
      name: (p.full_name as string) || "İsimsiz Kullanıcı",
      roleLabel: ROLE_LABELS[p.role as string] || (p.role as string) || "—",
      companyName: companyMap.get(p.company_id as string)?.name || "—",
      createdAtLabel: formatShortDate(p.created_at as string),
    }));

  const feedbackItems: WeeklyAdminReportFeedbackItem[] = feedbackRows
    .slice()
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .map((f) => {
      const message = ((f.message as string) || "").trim();
      return {
        companyName: companyMap.get(f.company_id as string)?.name || "—",
        typeLabel: FEEDBACK_TYPE_LABELS[f.type as string] || "Geri Bildirim",
        message: message.length > 240 ? `${message.slice(0, 240)}…` : message || "(boş)",
        createdAtLabel: formatShortDate(f.created_at as string),
      };
    });

  const periodLabel = `${formatShortDate(weekAgoIso)} – ${formatShortDate(now.toISOString())}`;
  const generatedAtLabel = formatDateTime(now.toISOString());

  const emailResult = await sendWeeklyAdminReportEmail({
    to: REPORT_RECIPIENT,
    report: {
      recipientName: REPORT_RECIPIENT_NAME,
      periodLabel,
      generatedAtLabel,
      appUrl,
      totals: {
        companies: companies.length,
        activeCompanies: topCompanies.length,
        newCompanies: newCompanies.length,
        newUsers: newProfiles.length,
        newVehicles: (newVehiclesRes.data ?? []).length,
        serviceRecords: (serviceRecordsRes.data ?? []).length,
        documents: (documentsRes.data ?? []).length,
        tasks: tasks.length,
        kmAdjustments: tasks.filter((t) => t.is_adjustment).length,
        fuelRecords: (fuelRecordsRes.data ?? []).length,
        trafficFines: (trafficFinesRes.data ?? []).length,
        feedback: feedbackRows.length,
      },
      topCompanies,
      inactiveCompanies,
      newCompanies,
      newUsers,
      feedbackItems,
    },
  });

  if (!emailResult.success && !emailResult.skipped) {
    console.error("[cron/weekly-admin-report] e-posta gönderilemedi:", emailResult.error);
    return NextResponse.json({ ok: false, error: emailResult.error }, { status: 500 });
  }

  console.log(
    `[cron/weekly-admin-report] done — active_companies:${topCompanies.length} new_companies:${newCompanies.length} new_users:${newUsers.length} sent:${emailResult.success}`,
  );

  return NextResponse.json({
    ok: true,
    sent: emailResult.success,
    skipped: emailResult.skipped ?? false,
    activeCompanies: topCompanies.length,
    inactiveCompanies: inactiveCompanies.length,
    newCompanies: newCompanies.length,
    newUsers: newUsers.length,
  });
}
