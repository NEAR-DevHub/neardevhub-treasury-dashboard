// Map to track in-flight requests for deduplication
const inflightRpcRequests = new Map();
// Service Worker for Treasury Dashboard with RPC Caching
// Caches POST requests to rpc.mainnet.fastnear.com to improve performance

// Build timestamp for cache busting (updated on each contract deployment)
const BUILD_TIMESTAMP = 0; // PLACEHOLDER_BUILD_TIMESTAMP

// Cache configuration
const CACHE_NAME = `treasury-rpc-cache-v${Math.floor(BUILD_TIMESTAMP / 1000)}`;
const RPC_ENDPOINTS = ['rpc.mainnet.fastnear.com', 'archival-rpc.mainnet.fastnear.com'];
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to send messages to all clients
async function sendMessageToClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SW_LOG',
      message: message,
      timestamp: Date.now()
    });
  });
}

// Enhanced console.log that also sends to clients
function swLog(message) {
  console.log(message);
  sendMessageToClients(message);
}

self.addEventListener('install', (event) => {
  swLog(`Service Worker: Installing... (Build: ${BUILD_TIMESTAMP})`);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  swLog(`Service Worker: Activated (Build: ${BUILD_TIMESTAMP})`);
  // Take control of all pages immediately
  event.waitUntil(
    self.clients.claim().then(() => {
      swLog('Service Worker: Claimed control of all clients');
      // Clean up old caches if any
      return caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              swLog('Service Worker: Deleting old cache: ' + cacheName);
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
  
  // Log all requests for debugging
  if (url.hostname.includes('fastnear.com')) {
    swLog(`Service Worker: Intercepting request to ${url.hostname}${url.pathname}`);
    swLog(`Service Worker: Request method: ${event.request.method}`);
    swLog(`Service Worker: Request URL: ${event.request.url}`);
  }
  
  // Only cache POST requests to Fast NEAR RPC endpoints (regular and archival)
  if (event.request.method === 'POST' && RPC_ENDPOINTS.includes(url.hostname)) {
    swLog(`Service Worker: Handling cacheable POST request to ${url.hostname}`);
    event.respondWith(handleRpcRequest(event.request));
  } else {
    // Pass through all other requests
    event.respondWith(fetch(event.request));
  }
});

self.addEventListener('message', (event) => {
  swLog('Service Worker: Received message: ' + JSON.stringify(event.data));
  if (event.data && event.data.type === 'CLAIM_CLIENTS') {
    swLog('Service Worker: Claiming all clients...');
    self.clients.claim();
  }
});

async function handleRpcRequest(request) {
  try {
    // Read the request body to create a cache key
    const requestBody = await request.clone().text();
    const url = new URL(request.url);
    
    // Parse the JSON-RPC request to extract method and params for cache key
    // This ignores the 'id' field which changes but doesn't affect the query
    let cacheKeyData;
    let jsonBody;
    try {
      jsonBody = JSON.parse(requestBody);
      // If not a call_function request, bypass cache and do regular fetch
      if (!jsonBody.params || jsonBody.params.request_type !== "call_function") {
        swLog(`Service Worker: Non-call_function request_type detected, bypassing cache and using regular fetch.`);
        return fetch(request);
      }
      cacheKeyData = {
        method: jsonBody.method,
        params: jsonBody.params,
        jsonrpc: jsonBody.jsonrpc
      };
    } catch (e) {
      // If parsing fails, fall back to using the full body
      swLog(`Service Worker: Failed to parse JSON body, using full body for cache key`);
      cacheKeyData = requestBody;
    }
    
    // Check for special cache durations
    let specialCacheDuration = null;
    if (jsonBody && jsonBody.params) {
      const accountId = jsonBody.params.account_id;
      const methodName = jsonBody.params.method_name;
      // .sputnik-dao.near contract with 'proposal' method: cache for 1 second and invalidate all caches if changed
      if (accountId && accountId.endsWith('.sputnik-dao.near') && methodName && methodName.includes('proposal')) {
        swLog(`Service Worker: .sputnik-dao.near contract call with 'proposal' method detected: ${accountId}, method: ${methodName} (cache for 1 second)`);
        specialCacheDuration = { duration: 1 * 1000, invalidateAll: true };
      } else if (methodName && methodName.includes('balance')) {
        // Any contract with method_name including 'balance': cache for 1 second, do NOT invalidate other caches
        swLog(`Service Worker: 'balance' method detected: ${methodName} (cache for 1 second, no invalidation)`);
        specialCacheDuration = { duration: 1 * 1000, invalidateAll: false };
      }
    }
    
    const cacheKey = `${url.origin}${url.pathname}:${btoa(JSON.stringify(cacheKeyData))}`;
    
    swLog(`Service Worker: Handling request to ${url.hostname}`);
    swLog(`Service Worker: Cache key (method+params): ${cacheKey.substring(0, 100)}...`);

    // Try to get from cache first
    const cache = await caches.open(CACHE_NAME);
    // Create a fake request with the cache key as URL for matching
    const cacheRequest = new Request(cacheKey);
    const cachedResponse = await cache.match(cacheRequest);

    if (cachedResponse) {
      // Check if cache entry is still valid
      const cacheTime = cachedResponse.headers.get('sw-cache-time');
      swLog(`Service Worker: Found cached response, cache time: ${cacheTime}`);
      let duration = CACHE_DURATION;
      if (specialCacheDuration !== null) {
        duration = specialCacheDuration.duration;
      }
      if (cacheTime && (Date.now() - parseInt(cacheTime)) < duration) {
        swLog(`Service Worker: Returning cached RPC response from ${url.hostname}`);
        return cachedResponse;
      } else {
        swLog(`Service Worker: Cache expired, removing entry if it is not 'invalidateAll'`);
        // Cache expired, remove it
        if (specialCacheDuration === null || !specialCacheDuration.invalidateAll) {
          await cache.delete(cacheRequest);
        }
        
      }
    } else {
      swLog(`Service Worker: No cached response found`);
    }

    // Deduplication: check if a request for this cacheKey is already in flight
    if (inflightRpcRequests.has(cacheKey)) {
      swLog(`Service Worker: Deduplication - waiting for in-flight request for cacheKey: ${cacheKey.substring(0, 100)}...`);
      return inflightRpcRequests.get(cacheKey);
    }

    // Make the actual request and store the promise in the map
    swLog(`Service Worker: Fetching fresh RPC response from ${url.hostname}`);
    const fetchPromise = (async () => {
      try {
        const response = await fetch(request);
        // Only cache successful responses
        if (response.status === 200) {
          // For proposal methods, compare with previous cached value and invalidate all caches if changed
          if (specialCacheDuration && specialCacheDuration.invalidateAll) {
            try {
              // Try to get previous cached value
              const prevCache = await caches.open(CACHE_NAME);
              const prevCacheRequest = new Request(cacheKey);
              const prevCachedResponse = await prevCache.match(prevCacheRequest);
              if (prevCachedResponse) {
                const prevData = await prevCachedResponse.clone().json();
                const newData = await response.clone().json();
                const prevArr = prevData?.result?.result;
                const newArr = newData?.result?.result;
                if (JSON.stringify(prevArr) !== JSON.stringify(newArr)) {
                  swLog('Service Worker: Proposal result changed, invalidating ALL caches.');
                  const cacheNames = await caches.keys();
                  for (const name of cacheNames) {
                    const cacheInst = await caches.open(name);
                    const requests = await cacheInst.keys();
                    for (const req of requests) {
                      try {
                        await cacheInst.delete(req);
                      } catch (e) {}
                    }
                  }
                }
              }
            } catch (e) {
              swLog('Service Worker: Error comparing previous and new proposal response: ' + e.message);
            }
          }
          // For 'balance' methods, just cache for 1 second, no invalidation
          // Clone the response and add cache timestamp
          const responseToCache = response.clone();
          const headers = new Headers(responseToCache.headers);
          headers.set('sw-cache-time', Date.now().toString());
          const cachedResponse = new Response(responseToCache.body, {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers
          });
          // Store in cache using the cacheRequest
          await cache.put(cacheRequest, cachedResponse);
          swLog(`Service Worker: Cached RPC response from ${url.hostname}`);
          return response;
        } else {
          swLog(`Service Worker: Not caching response with status ${response.status}`);
          return response;
        }
      } finally {
        // Remove from inflight map after completion
        inflightRpcRequests.delete(cacheKey);
      }
    })();
    inflightRpcRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  } catch (error) {
    swLog('Service Worker: Error handling RPC request: ' + error.message);
    // Fallback to normal fetch
    return fetch(request);
  }
}
