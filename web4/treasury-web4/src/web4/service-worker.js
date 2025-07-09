// Service Worker for Treasury Dashboard with RPC Caching
// Caches POST requests to rpc.mainnet.fastnear.com to improve performance

// Cache configuration
const CACHE_NAME = 'treasury-rpc-cache-v1';
const RPC_ENDPOINT = 'rpc.mainnet.fastnear.com';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  // Take control of all pages immediately
  event.waitUntil(
    self.clients.claim().then(() => {
      // Clean up old caches if any
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only cache POST requests to the Fast NEAR RPC endpoint
  if (event.request.method === 'POST' && url.hostname === RPC_ENDPOINT) {
    event.respondWith(handleRpcRequest(event.request));
  } else {
    // Pass through all other requests
    event.respondWith(fetch(event.request));
  }
});

async function handleRpcRequest(request) {
  try {
    // Read the request body to create a cache key
    const requestBody = await request.clone().text();
    const cacheKey = `${request.url}:${btoa(requestBody)}`;
    
    // Try to get from cache first
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      // Check if cache entry is still valid
      const cacheTime = cachedResponse.headers.get('sw-cache-time');
      if (cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
        console.log('Service Worker: Returning cached RPC response');
        return cachedResponse;
      } else {
        // Cache expired, remove it
        await cache.delete(cacheKey);
      }
    }
    
    // Make the actual request
    console.log('Service Worker: Fetching fresh RPC response');
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.status === 200) {
      // Clone the response and add cache timestamp
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      // Store in cache
      await cache.put(cacheKey, cachedResponse);
      console.log('Service Worker: Cached RPC response');
    }
    
    return response;
  } catch (error) {
    console.error('Service Worker: Error handling RPC request:', error);
    // Fallback to normal fetch
    return fetch(request);
  }
}
