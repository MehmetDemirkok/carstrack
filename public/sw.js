// CarsTrack Service Worker
//
// Kapsam bilinçli olarak dar tutulur:
//   * HTML gezinmeleri ve JS/CSS varlıkları ASLA önbellekten sunulmaz. Next.js
//     her derlemede hash'li chunk üretir; bayat HTML artık var olmayan chunk'ları
//     ister ve ChunkLoadError ile sayfa açılmaz. Bu istekler her zaman ağa gider.
//   * Ağ yoksa gezinme isteğine tek bir statik "çevrimdışısınız" sayfası döner
//     (tarayıcının dinozor/hata ekranı yerine).
//   * Görseller: ağ öncelikli, çevrimdışı için sınırlı (MAX_IMAGES) önbellek.
//   * Web Push bildirimleri ve bildirime tıklama.

const VERSION = "carstrack-v3";
const STATIC_CACHE = `${VERSION}-static`;
const IMAGE_CACHE = `${VERSION}-images`;
const OFFLINE_URL = "/offline.html";
const MAX_IMAGES = 120;

// Çevrimdışı sayfasının kendisi ve kullandığı ikon kurulumda önbelleğe alınır.
const PRECACHE = [OFFLINE_URL, "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // `reload`: HTTP önbelleğini atlayıp sunucudaki güncel kopyayı al.
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Eski sürümlerin önbelleklerini temizle.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== IMAGE_CACHE).map((k) => caches.delete(k))
      );
      // Gezinme ön yüklemesi: SW açılırken sayfa isteği paralel başlar, ek
      // gecikme olmaz.
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable(); } catch { /* yoksay */ }
      }
      await self.clients.claim();
    })()
  );
});

// ── Web Push ────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "CarsTrack";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    // Android durum çubuğu rozeti yalnızca saydamlık kanalını kullanır; opak
    // ikon beyaz kare olarak görünüyordu. badge-96 saydam, tek renkli siluet.
    badge: "/badge-96.png",
    tag: payload.tag,
    // Aynı tag'le gelen yeni bildirim sessizce değil, yeniden uyararak gelsin.
    renotify: !!payload.tag,
    data: { url: payload.url || "/dashboard" },
    vibrate: [80, 40, 80],
    lang: "tr",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || "/dashboard";
  let targetUrl = rawUrl;
  try { targetUrl = new URL(rawUrl, self.registration.scope).href; } catch { /* yoksay */ }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Önce bu uygulamanın kapsamındaki bir pencereyi tercih et.
      const scoped = allClients.find((c) => c.url && c.url.startsWith(self.registration.scope)) || allClients[0];
      if (scoped && "focus" in scoped) {
        await scoped.focus();
        if ("navigate" in scoped && targetUrl) {
          try { await scoped.navigate(targetUrl); } catch { /* yoksay */ }
        }
        return;
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })()
  );
});

// localhost'ta (geliştirme) fetch'e hiç dokunmayız — Next.js HMR ile
// çakışmasın. Push/notification işleyicileri bundan etkilenmez.
const IS_LOCALHOST =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

async function trimImageCache() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();
  // Cache API ekleme sırasını korur — en eskiler önce silinir.
  for (let i = 0; i < keys.length - MAX_IMAGES; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener("fetch", (event) => {
  if (IS_LOCALHOST) return;
  const { request } = event;
  if (request.method !== "GET") return;

  // ── Sayfa gezinmeleri: her zaman ağ; ağ yoksa çevrimdışı sayfası ──
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse;
          if (preloaded) return preloaded;
          return await fetch(request);
        } catch {
          const cached = await caches.match(OFFLINE_URL);
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // ── Yalnızca aynı kökenden görseller: ağ öncelikli, sınırlı yedek ──
  if (request.destination !== "image") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          event.waitUntil(
            caches.open(IMAGE_CACHE)
              .then((cache) => cache.put(request, copy))
              .then(trimImageCache)
              .catch(() => {})
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || Response.error();
      })
  );
});
