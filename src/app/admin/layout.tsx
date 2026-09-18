import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSuperAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Panelin GERÇEK yetki kapısı burasıdır.
 *
 * `src/proxy.ts` de /admin'i korur ama o yalnızca cookie'deki JWT'yi çözer
 * (hızlı, imza doğrulamasız). Burada `getUser()` ile Supabase'e doğrulatılır;
 * altındaki her sayfa ve API ucu aynı kontrolü bağımsız olarak tekrarlar.
 *
 * Yetkisiz kullanıcı 403 değil 404 görür — panelin varlığı sızdırılmaz.
 */
export const metadata: Metadata = {
  title: "Yönetim Konsolu",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSuperAdmin();
  if (!admin) notFound();

  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
