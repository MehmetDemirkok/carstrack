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
