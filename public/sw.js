// CarsTrack Service Worker
// Amaç: Uygulamanın PWA olarak "yüklenebilir" sayılması için gereken minimum
// service worker. Chrome/Edge, manifest + bir fetch dinleyicisi olan kayıtlı
// bir service worker olmadan `beforeinstallprompt` olayını tetiklemez.
//
// Agresif önbellekleme bilinçli olarak yapılmaz; Next.js'in kendi varlık
// sürümleme/önbellekleme mekanizması ile çakışmaması ve bayat içerik
// gösterilmemesi için istekler ağ üzerinden geçirilir.

const VERSION = "carstrack-v1";

self.addEventListener("install", () => {
  // Yeni service worker'ı hemen etkinleştir.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Eski önbellekleri (varsa) temizle ve açık sekmelerin kontrolünü al.
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// ── Web Push ────────────────────────────────────────────────────────────
// Sunucu, web-push ile şifreli bir payload gönderir. Burada onu çözüp
// telefonun bildirim alanında gösteririz. Telegram'a giden mesajların
// telefona da düşmesini sağlayan kısım budur.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Düz metin geldiyse gövde olarak kullan.
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "CarsTrack";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon.png",
    badge: "/icon.png",
    tag: payload.tag,            // Aynı tag'li bildirimler üst üste yığılmaz.
    data: { url: payload.url || "/" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime dokunulduğunda uygulamayı (ilgili sayfayı) aç/öne getir.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        // Zaten açık bir pencere varsa onu öne getir ve hedefe yönlendir.
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && targetUrl) {
            try { await client.navigate(targetUrl); } catch { /* yoksay */ }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Yalnızca GET isteklerine dokun; geri kalanını tarayıcıya bırak.
  if (event.request.method !== "GET") return;

  // Ağ öncelikli, sessiz geri dönüş: çevrimdışıyken aynı sayfa için
  // son başarılı yanıtı önbellekten döndürmeyi dener.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Yalnızca temel (same-origin) gezinme/varlık yanıtlarını önbelleğe al.
        if (
          response &&
          response.status === 200 &&
          response.type === "basic" &&
          (event.request.mode === "navigate" || event.request.destination === "image")
        ) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw new Error("offline");
      })
  );
});
