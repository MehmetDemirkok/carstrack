// Tarayıcı tarafı Web Push yardımcıları. Ayarlar sayfasından kullanılır.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** VAPID base64url string'ini PushManager.subscribe'ın beklediği Uint8Array'e çevirir. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Bu tarayıcı Web Push'u destekliyor mu? */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * İzin ister, service worker'a abone olur ve aboneliği sunucuya kaydeder.
 * İzin verilmezse veya hata olursa Error fırlatır.
 */
export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) throw new Error("Bu cihaz/tarayıcı push bildirimlerini desteklemiyor.");
  if (!VAPID_PUBLIC_KEY) throw new Error("VAPID anahtarı yapılandırılmamış.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Bildirim izni verilmedi.");

  const reg = await navigator.serviceWorker.ready;

  // Var olan aboneliği tekrar kullan; yoksa yeni oluştur.
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) throw new Error("Abonelik sunucuya kaydedilemedi.");
}

/** Aboneliği iptal eder ve sunucudan siler. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});

  await sub.unsubscribe().catch(() => {});
}

/** Bu cihazda aktif bir push aboneliği var mı? */
export async function getPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
