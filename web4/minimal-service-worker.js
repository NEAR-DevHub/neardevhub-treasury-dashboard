// Minimal Service Worker for Treasury Dashboard RPC Caching
// Version: 1.0.0

const CACHE_NAME = 'treasury-rpc-cache-v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install event - basic setup
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Check if a URL is an RPC call that should be cached
function isRPCCall(url) {
  try {
    const urlObj = new URL(url);
    
    // NEAR RPC endpoints
    if (urlObj.hostname.includes('near.org') || 
        urlObj.hostname.includes('nearrpc.com') ||
        urlObj.hostname.includes('rpc.mainnet.near.org') ||
        urlObj.hostname.includes('rpc.testnet.near.org')) {
      return true;
    }
    
    // Social DB and other common NEAR endpoints
    if (urlObj.pathname.includes('/query') || 
        urlObj.pathname.includes('/view') ||
        urlObj.hostname.includes('social.near.org')) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

// Check if a response should be cached (only cache successful responses)
function shouldCacheResponse(response) {
  return response.status === 200 && 
         response.type === 'basic' && 
         response.headers.get('content-type')?.includes('application/json');
}

// Fetch event - intercept and cache RPC calls
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Only handle GET requests and RPC calls
  if (request.method !== 'GET' || !isRPCCall(request.url)) {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        // Check if we have a cached response and if it's still fresh
        if (cachedResponse) {
          const cacheTime = new Date(cachedResponse.headers.get('sw-cache-time'));
          const now = new Date();
          
          if (now - cacheTime < CACHE_DURATION) {
            console.log('[Service Worker] Serving from cache:', request.url);
            return cachedResponse;
          } else {
            // Cache expired, delete it
            cache.delete(request);
          }
        }
        
        // Fetch from network
        console.log('[Service Worker] Fetching from network:', request.url);
        return fetch(request).then((response) => {
          // Only cache successful responses
          if (shouldCacheResponse(response)) {
            // Clone the response before caching (responses can only be read once)
            const responseToCache = response.clone();
            
            // Add cache timestamp to headers
            const modifiedResponse = new Response(responseToCache.body, {
              status: responseToCache.status,
              statusText: responseToCache.statusText,
              headers: {
                ...Object.fromEntries(responseToCache.headers.entries()),
                'sw-cache-time': new Date().toISOString()
              }
            });
            
            cache.put(request, modifiedResponse);
            console.log('[Service Worker] Cached response for:', request.url);
          }
          
          return response;
        }).catch((error) => {
          console.error('[Service Worker] Fetch failed:', error);
          // If network fails and we have any cached response (even expired), use it
          return cachedResponse || Promise.reject(error);
        });
      });
    })
  );
});

// Message event - for communication with the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_STATUS') {
    // Send cache status back to main thread
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        event.ports[0].postMessage({
          type: 'CACHE_STATUS_RESPONSE',
          cacheSize: keys.length,
          cacheName: CACHE_NAME
        });
      });
    });
  }
});
