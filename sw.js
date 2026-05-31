const CACHE_NAME = "travel-copilot-v3.5.28";
const BASE_URL = new URL("./", self.registration.scope);
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./data/trip-demo.v2.3.json",
  "./data/local-state-demo.v2.3.json",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("travel-copilot-") && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }

  if (["script", "style", "worker", "manifest", "font"].includes(event.request.destination)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.pathname.startsWith(new URL("./data/", BASE_URL).pathname) || url.pathname.startsWith(new URL("./icons/", BASE_URL).pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    APP_SHELL.map(async (path) => {
      try {
        const request = new Request(new URL(path, BASE_URL), { cache: "reload" });
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
      } catch (err) {
        // No fem fallar la instal·lació per un recurs opcional.
      }
    })
  );
}

async function networkFirst(request, fallbackPath = null) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackPath) {
      const fallback = await cache.match(new URL(fallbackPath, BASE_URL));
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}
