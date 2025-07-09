// Minimal Service Worker for Treasury Dashboard
// This is a basic service worker that can be extended for caching RPC calls

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // For now, just pass through all requests
  // Future: Add caching logic for RPC calls here
  event.respondWith(fetch(event.request));
});
