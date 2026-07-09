// notes — PWA service worker (slice 5 · pwa).
//
// Purpose: cache the static *app shell* so the app is installable and loads fast.
// It deliberately does NOT cache application data — the app requires a connection
// (#084), so journals/notes/routines always come from the network.
//
// Capacitor-friendly (#082): the later native shell points a WebView at the same
// hosted URL and reuses this exact service worker; nothing here assumes a browser
// chrome or blocks the wrap.

const SHELL_CACHE = "notes-shell-v2";

// Media cache (#150): storage images (journal photos, inspo tiles, video
// posters) are content-addressed (a path is written once, never rewritten), so
// cache-first is safe and makes them load instantly + render offline. Video
// *files* are deliberately not cached (up to ~50 MB each — quota). Bounded by
// entry count, oldest dropped first.
const MEDIA_CACHE = "notes-media-v1";
const MEDIA_MAX_ENTRIES = 400;

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
          keys
            .filter((k) => k !== SHELL_CACHE && k !== MEDIA_CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Storage *images* (#150) — cache-first (immutable paths). Matched by path +
  // destination so journal photos, inspo tiles and posters qualify anywhere
  // Supabase lives (cloud or local), while REST/auth/video are never touched.
  if (
    request.destination === "image" &&
    url.pathname.includes("/storage/v1/object/")
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(MEDIA_CACHE);
        const cached = await cache.match(request.url);
        if (cached) return cached;
        try {
          // Re-issue as CORS (storage sends ACAO:*) so the stored response isn't
          // opaque — Chrome pads opaque cache entries to megabytes of quota.
          const res = await fetch(request.url, { mode: "cors" });
          if (res && res.ok) {
            await cache.put(request.url, res.clone());
            trimCache(cache).catch(() => {});
          }
          return res;
        } catch {
          return fetch(request); // last resort: the browser's own path
        }
      })(),
    );
    return;
  }

  if (url.origin !== self.location.origin) return; // never touch Supabase data / cross-origin

  // Top-level page navigations (a cold start / hard reload in the WebView) →
  // stale-while-revalidate the app *shell* (#129). Serve the cached HTML instantly so
  // the phone paints immediately instead of waiting on a network round-trip, then
  // refresh the cache in the background for next launch. The document is a user-agnostic
  // client-rendered shell (all data is fetched client-side, #084), so caching it leaks
  // no journal/note data. Only same-origin, non-redirected 200s are cached, so an
  // expired-session redirect to /sign-in is never stored under the "/" key.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        // Key the document cache by pathname only (#149): the shell is identical
        // for any query (all data is client-fetched), so `/notes?open=x` reloads
        // offline from the cached `/notes` document.
        const navKey = new URL(request.url);
        navKey.search = "";
        const cached = await cache.match(navKey.href);
        const fromNetwork = fetch(request)
          .then((res) => {
            if (res && res.ok && !res.redirected) cache.put(navKey.href, res.clone());
            return res;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(fromNetwork); // revalidate without blocking the response
          return cached;
        }
        return (await fromNetwork) || Response.error();
      })(),
    );
    return;
  }

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

  // Everything else (data, API) falls through to the network — app data lives
  // in the local-snapshot layer, not the SW (#084/#149).
});

// Drop the oldest media entries once over the cap (Cache keys keep insertion order).
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MEDIA_MAX_ENTRIES) return;
  for (const k of keys.slice(0, keys.length - MEDIA_MAX_ENTRIES)) {
    await cache.delete(k);
  }
}
