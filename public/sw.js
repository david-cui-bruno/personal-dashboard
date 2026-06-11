// notes — PWA service worker (slice 5 · pwa).
//
// Purpose: cache the static *app shell* so the app is installable and loads fast.
// It deliberately does NOT cache application data — the app requires a connection
// (#084), so journals/notes/routines always come from the network.
//
// Capacitor-friendly (#082): the later native shell points a WebView at the same
// hosted URL and reuses this exact service worker; nothing here assumes a browser
// chrome or blocks the wrap.

const SHELL_CACHE = "notes-shell-v1";

// Stable, self-owned static assets safe to precache. Build assets under
// /_next/static/* are content-hashed (URLs change every build) so they're cached
// at runtime below rather than precached here.
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase / cross-origin

  // Immutable build assets + our static icons/manifest = the shell → cache-first.
  const isShellAsset =
    url.pathname.startsWith("/_next/static/") ||
    SHELL_ASSETS.includes(url.pathname);

  if (isShellAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else (navigations, data, API) falls through to the network.
  // No offline data by design (#084).
});
