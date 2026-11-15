import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

/**
 * E-postaya ait Supabase Auth kullanıcısının id'sini bulur (yoksa null).
 *
 * Supabase JS admin API'sinde e-postayla doğrudan arama yok; diğer sunucu
 * uçları gibi (fleet-alerts, admin paneli) `listUsers` sayfalanarak taranır.
 * Bu ölçekte tek sayfa yeter; kullanıcı sayısı beş haneye çıkarsa SQL tarafında
 * service-role'e açık bir arama fonksiyonuna geçilmeli.
 *
 * Tarama yarıda hata verirse `error` döner — çağıran taraf "hesap yok"
 * varsayıp yanlış davet göndermesin diye.
 */
export async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string | null; error?: string }> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) return { id: null, error: error.message };
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (match) return { id: match.id };
    if (users.length < PAGE_SIZE) return { id: null };
  }
  return { id: null, error: "Kullanıcı listesi tamamen taranamadı." };
}
