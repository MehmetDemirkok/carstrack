/** `vercel.json` ile birebir aynı olmalı — oradan okunmaz, çünkü build çıktısına dahil değil. */
export const CRON_JOBS = [
  {
    path: "/api/cron/fleet-alerts",
    schedule: "0 6 * * *",
    label: "Filo uyarıları",
    description: "Sigorta/muayene/bakım yaklaşan araçları yöneticilere bildirir. Her gün 09:00 (TR).",
  },
  {
    path: "/api/cron/license-alerts",
    schedule: "0 5 * * *",
    label: "Ehliyet uyarıları",
    description: "Süresi dolan sürücü ehliyetlerini hatırlatır. Her gün 08:00 (TR).",
  },
  {
    path: "/api/cron/kilometer-reminder",
    schedule: "0 7 * * 1,5",
    label: "Kilometre hatırlatması",
    description: "Sürücülerden haftalık km bildirimi ister. Pazartesi/Cuma 10:00 (TR).",
  },
  {
    path: "/api/cron/activation-nudge",
    schedule: "0 8 * * 2,5",
    label: "Aktivasyon dürtmesi",
    description: "Hiç araç eklememiş hesaplara e-posta atar. Salı/Cuma 11:00 (TR).",
  },
  {
    path: "/api/cron/db-backup",
    schedule: "0 3 * * 1",
    label: "Veritabanı yedeği",
    description: "Tüm tabloları gzip'leyip Storage'a yazar. Pazartesi 06:00 (TR).",
  },
  {
    path: "/api/cron/email-queue-drain",
    schedule: "*/5 * * * *",
    label: "Duyuru kuyruğu",
    description: "Kuyruktaki toplu duyuruları parça parça gönderir. 5 dakikada bir.",
  },
  {
    path: "/api/cron/keepalive",
    schedule: "0 4 */2 * *",
    label: "Supabase canlı tutma",
    description: "Ücretsiz katmanın projeyi duraklatmasını engeller. 2 günde bir.",
  },
] as const;
