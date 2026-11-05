// Hors ligne : on essaie toujours le réseau d'abord (pour avoir le planning
// à jour), et on se rabat sur la copie enregistrée si on n'a pas internet.
const CACHE = "calendrier-v13";
const FICHIERS = [
  "./", "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    // "no-cache" : on redemande toujours au serveur s'il y a une nouvelle version
    // (sinon le navigateur garde l'ancienne jusqu'à 10 minutes).
    fetch(e.request, { cache: "no-cache" })
      .then((rep) => {
        const copie = rep.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie));
        return rep;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
