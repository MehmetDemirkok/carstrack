import { listAllAuthUsers, type AdminContext } from "./api";
import type { AdminEmailRecipient, AdminEmailSegment } from "./types";
import type { UserRole } from "@/lib/types";
import { isDriverRole } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ResolveRecipientsInput {
  segment: AdminEmailSegment;
  /** segment = "company" için zorunlu. */
  companyId?: string | null;
  /** segment = "manual" için zorunlu — profil id listesi. */
  userIds?: string[];
  /**
   * `notify_by_email = false` diyenlere de gönder. Yalnızca hesabı doğrudan
   * ilgilendiren zorunlu duyurularda (güvenlik, fiyat değişikliği) kullanılır.
   */
  ignoreOptOut?: boolean;
}

export interface ResolvedRecipients {
  recipients: AdminEmailRecipient[];
  /** Tercihine göre elenen kişi sayısı. */
  optedOut: number;
}

export const SEGMENT_LABELS: Record<AdminEmailSegment, string> = {
  all: "Tüm kullanıcılar",
  managers: "Şirket yetkilileri",
  operators: "Operatörler",
  drivers: "Sürücüler",
  company: "Belirli şirket",
  inactive: "30+ gündür giriş yapmayanlar",
  never_signed_in: "Hiç giriş yapmamışlar",
  empty_fleet: "Hiç araç eklememiş şirketler",
  manual: "Elle seçilenler",
};

/**
 * Segmenti gerçek alıcı listesine çevirir.
 *
 * E-posta adresi `auth.users`'ta, isim/rol `profiles`'ta olduğu için iki liste
 * burada birleştirilir. Adresi olmayan veya doğrulanmamış hesaplar elenir —
 * doğrulanmamış adrese gönderim bounce oranını yükseltir.
 */
export async function resolveRecipients(
  ctx: AdminContext,
  input: ResolveRecipientsInput,
): Promise<ResolvedRecipients> {
  const { db } = ctx;
  const now = Date.now();

  const [profilesRes, companiesRes, vehiclesRes, authUsers] = await Promise.all([
    db.from("profiles").select("id, company_id, full_name, role, notify_by_email"),
    db.from("companies").select("id, name"),
    input.segment === "empty_fleet"
      ? db.from("vehicles").select("company_id")
      : Promise.resolve({ data: [], error: null }),
    listAllAuthUsers(db),
  ]);

  if (profilesRes.error) throw new Error(`profiles: ${profilesRes.error.message}`);

  const companyNames = new Map(
    (companiesRes.data ?? []).map((c) => [c.id as string, (c.name as string) || "İsimsiz Şirket"]),
  );
  const companiesWithVehicle = new Set(
    (vehiclesRes.data ?? []).map((v) => v.company_id as string),
  );
  const manualSet = new Set(input.userIds ?? []);

  let optedOut = 0;
  const recipients: AdminEmailRecipient[] = [];

  for (const p of profilesRes.data ?? []) {
    const id = p.id as string;
    const role = ((p.role as UserRole) || "user") as UserRole;
    const companyId = (p.company_id as string) ?? "";
    const au = authUsers.get(id);

    // Adres yoksa veya doğrulanmamışsa gönderme.
    if (!au?.email || !au.emailConfirmedAt) continue;

    let matches = false;
    switch (input.segment) {
      case "all":
        matches = true;
        break;
      case "managers":
        matches = role === "manager";
        break;
      case "operators":
        matches = role === "operator";
        break;
      case "drivers":
        matches = isDriverRole(role);
        break;
      case "company":
        matches = Boolean(input.companyId) && companyId === input.companyId;
        break;
      case "inactive":
        matches = !au.lastSignInAt || now - new Date(au.lastSignInAt).getTime() > 30 * DAY_MS;
        break;
      case "never_signed_in":
        matches = !au.lastSignInAt;
        break;
      case "empty_fleet":
        matches = Boolean(companyId) && !companiesWithVehicle.has(companyId);
        break;
      case "manual":
        matches = manualSet.has(id);
        break;
    }

    if (!matches) continue;

    if (p.notify_by_email === false && !input.ignoreOptOut) {
      optedOut++;
      continue;
    }

    recipients.push({
      userId: id,
      email: au.email,
      fullName: (p.full_name as string) || "",
      role,
      companyName: companyNames.get(companyId) ?? "—",
    });
  }

  // Aynı adres birden fazla profile bağlıysa tek sefer gönder.
  const seen = new Set<string>();
  const unique = recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));

  return { recipients: unique, optedOut };
}
