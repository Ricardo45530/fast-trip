const CACHE_NAME = "fast-trip-conductor-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        "/fast-trip/conductor/",
        "/fast-trip/conductor/manifest.webmanifest"
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
})
