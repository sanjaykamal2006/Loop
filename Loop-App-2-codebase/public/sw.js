// LOOP Service Worker for Web Push, Local Background Notifications & Zero-Latency Image Caching
const IMAGE_CACHE_NAME = "loop-images-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Cache-First with Stale-While-Revalidate for Avatars and Static App Assets
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Match Supabase storage avatars or static public images
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
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
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
