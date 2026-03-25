<<<<<<< HEAD
const CACHE_NAME = 'chronos-v1.0';
=======
const CACHE_NAME = 'chronos-v2';
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
<<<<<<< HEAD
    './manifest.json'
];

// Data assets that should always be fresh
const DATA_ASSETS = [
    './data/latest/headlines.json',
    './data/latest/clusters.json',
    './data/latest/alerts.json',
    './data/archive/manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
=======
    './manifest.json',
    './data/latest/headlines.json',
    './data/latest/clusters.json',
    './data/latest/alerts.json'
];

self.addEventListener('install', (event) => {
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

<<<<<<< HEAD
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Network-First for Data
    if (DATA_ASSETS.some(asset => event.request.url.includes(asset.replace('./', '')))) {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Stale-While-Revalidate for UI Assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetched = fetch(event.request).then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return response;
            }).catch(() => null);
            return cached || fetched;
=======
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
>>>>>>> 22f06f6 (feat(stage2): implement Premium Cyber-Noir UI, PWA capabilities, and Regional Focus filtering)
        })
    );
});
