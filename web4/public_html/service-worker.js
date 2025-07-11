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
    
    // Check if this is a call to a .sputnik-dao.near contract - don't cache these
    if (jsonBody && jsonBody.params && jsonBody.params.account_id) {
      const accountId = jsonBody.params.account_id;
      if (accountId && accountId.endsWith('.sputnik-dao.near')) {
        swLog(`Service Worker: Skipping cache for .sputnik-dao.near contract call: ${accountId}`);
        return fetch(request);
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
      
      if (cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
        swLog(`Service Worker: Returning cached RPC response from ${url.hostname}`);
        return cachedResponse;
      } else {
        swLog(`Service Worker: Cache expired, removing entry`);
        // Cache expired, remove it
        await cache.delete(cacheRequest);
      }
    } else {
      swLog(`Service Worker: No cached response found`);
    }
    
    // Make the actual request
    swLog(`Service Worker: Fetching fresh RPC response from ${url.hostname}`);
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
      
      // Store in cache using the cacheRequest
      await cache.put(cacheRequest, cachedResponse);
      swLog(`Service Worker: Cached RPC response from ${url.hostname}`);
    } else {
      swLog(`Service Worker: Not caching response with status ${response.status}`);
    }
    
    return response;
  } catch (error) {
    swLog('Service Worker: Error handling RPC request: ' + error.message);
    // Fallback to normal fetch
    return fetch(request);
  }
}
