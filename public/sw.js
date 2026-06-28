/// <reference lib="webworker" />

const CACHE_NAME = "unrobot-v1";

// App shell — ressources à mettre en cache au premier chargement
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Ressources externes préconnectées (fonts)
const FONT_ORIGIN = "https://fonts.googleapis.com";
const FONT_STATIC_ORIGIN = "https://fonts.gstatic.com";

// Extensions à mettre en cache avec stratégie cache-first
const CACHE_FIRST_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".svg",
  ".woff",
  ".woff2",
  ".wasm",
];

// Installation : pré-cache l'app shell
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => (self as unknown as ServiceWorkerGlobalScope).skipWaiting())
  );
});

// Activation : nettoie les anciens caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => (self as unknown as ServiceWorkerGlobalScope).clients.claim())
  );
});

// Fetch : stratégie hybride
self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes non-GET
  if (event.request.method !== "GET") return;

  // Ne pas intercepter les requêtes d'API ou Chrome extensions
  if (url.protocol === "chrome-extension:") return;

  // Fonts : cache-first avec cache séparé
  if (url.origin === FONT_ORIGIN || url.origin === FONT_STATIC_ORIGIN) {
    event.respondWith(cacheFirst(event.request, "unrobot-fonts"));
    return;
  }

  // Fichiers statiques (.js, .css, images, wasm) : cache-first
  const isStaticAsset = CACHE_FIRST_EXTENSIONS.some((ext) =>
    url.pathname.endsWith(ext)
  );
  if (isStaticAsset && url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }

  // HTML (navigation) : network-first avec fallback cache
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, CACHE_NAME));
    return;
  }
});

/**
 * Cache-first : cherche en cache, sinon fetch et met en cache.
 */
async function cacheFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Hors ligne et pas en cache : retourner une réponse vide
    return new Response("Hors ligne", { status: 503, statusText: "Hors ligne" });
  }
}

/**
 * Network-first : essaie le réseau, fallback sur le cache.
 */
async function networkFirst(
  request: Request,
  cacheName: string
): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Dernier recours : l'app shell HTML
    const shell = await caches.match("/index.html");
    if (shell) return shell;
    return new Response("Hors ligne", { status: 503, statusText: "Hors ligne" });
  }
}

export {};