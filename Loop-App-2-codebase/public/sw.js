// LOOP Service Worker for Web Push, Local Background Notifications, App Shell & Image Caching
const IMAGE_CACHE_NAME = "loop-images-v1";
const APP_SHELL_CACHE_NAME = "loop-app-shell-v2";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/header-logo.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: "no-cache" }).then((res) => {
              if (res && res.status === 200) {
                return cache.put(url, res);
              }
            })
          )
        )
      )
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("loop-app-shell-") && k !== APP_SHELL_CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

// Fetch Handler:
// 1. Network-First with Cache Fallback for App Shell navigation (HTML) so LOOP opens even offline
// 2. Cache-First with Stale-While-Revalidate for Next.js static bundles, Fonts, Avatars, and Static Images
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. App Shell Navigation (HTML pages) -> Network-First, fallback to cached shell when offline
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            cache.put("/", networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedPage =
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            (await cache.match(url.pathname));
          if (cachedPage) return cachedPage;
          throw new Error("Offline and no cached app shell available");
        }
      })
    );
    return;
  }

  // 2. Next.js static JS/CSS/font chunks & manifest -> Cache-First with background revalidation
  const isNextStatic =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname.endsWith(".woff2") ||
      url.pathname.endsWith(".woff"));

  if (isNextStatic) {
    event.respondWith(
      caches.open(APP_SHELL_CACHE_NAME).then(async (cache) => {
        const cachedChunk = (await cache.match(request)) || (await cache.match(url.pathname + url.search));
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedChunk);
        return cachedChunk || fetchPromise;
      })
    );
    return;
  }

  // 3. Match Supabase storage avatars or static public images
  const isAvatar = url.pathname.includes("/storage/v1/object/public/avatars/");
  const isStaticImage =
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico)$/i) ||
    url.pathname === "/creator.jpg";

  if (isAvatar || isStaticImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        // Fetch in the background to revalidate
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // If in cache, return immediately (0ms latency); otherwise wait for network
        return cachedResponse || fetchPromise;
      })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  } else if (event.data && event.data.type === "WARM_APP_SHELL" && Array.isArray(event.data.urls)) {
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(APP_SHELL_CACHE_NAME).then((cache) =>
        Promise.allSettled(
          urls.map(async (u) => {
            const existing = await cache.match(u);
            if (!existing) {
              const res = await fetch(u);
              if (res && res.status === 200) {
                await cache.put(u, res);
              }
            }
          })
        )
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "LOOP Ride Alert 🚗";
  const options = {
    body: data.body || "A passenger joined your ride or sent a message.",
    icon: "/logo.png",
    badge: "/icon.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url && client.url.includes(self.registration.scope)) {
            return client.focus();
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
