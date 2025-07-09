# Minimal Service Worker Implementation for Treasury Dashboard

This document describes the minimal, careful service worker implementation added to the NEAR Treasury Dashboard.

## Implementation Overview

### Files Created/Modified

1. **`/web4/treasury-web4/src/web4/service-worker.js`** - The minimal service worker (basic structure, ready for caching)
2. **`/web4/public_html/index.html`** - **SOURCE FILE** - Edit this file to modify HTML content
3. **`/web4/treasury-web4/src/web4/index.html`** - **GENERATED FILE** - DO NOT EDIT - copied from public_html during build
4. **`/web4/treasury-web4/src/lib.rs`** - Updated to serve the service worker file
5. **`/web4/treasury-web4/tests/test_basics.rs`** - Added test for service worker endpoint
6. **`/web4/treasury-web4/README.md`** - Added documentation for non-reproducible builds

### ⚠️ Important Build Process Notes

The web4 contract uses a **build script** (`/web4/treasury-web4/build.rs`) that copies HTML from a source file to the final location:

- **Source**: `/web4/public_html/index.html` - **EDIT THIS FILE**
- **Destination**: `/web4/treasury-web4/src/web4/index.html` - **DO NOT EDIT - GETS OVERWRITTEN**

**To modify HTML content:**
1. Edit `/web4/public_html/index.html` (the source file)
2. Run `cargo clean && cargo near build non-reproducible-wasm` to rebuild
3. The build script will copy your changes to the contract's HTML file

**Why this matters:**
- Direct edits to `/web4/treasury-web4/src/web4/index.html` are lost on rebuild
- The contract embeds the HTML using `include_str!()` at compile time
- Changes to source HTML require a contract rebuild to take effect

### Current Features

- **Basic Service Worker Structure**: Install, activate, and fetch event handlers
- **Same Origin Serving**: Service worker served from the web4 contract (required by browsers)
- **Pass-through Requests**: Currently passes all requests through (ready for caching logic)
- **Automatic Registration**: Registers on page load with error handling
- **Test Coverage**: Includes test to verify service worker endpoint works

## Service Worker Requirements

⚠️ **Important**: Service workers **MUST** be served from the same origin as the web page. They **cannot** be loaded from CDNs like jsdelivr or cdnjs due to browser security requirements.

The service worker is served by the web4 contract at `/service-worker.js`.

## Current Implementation Details

### Service Worker Structure

The current service worker (`service-worker.js`) includes:

```javascript
// Basic event handlers for install, activate, and fetch
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim()); // Take control immediately
});

self.addEventListener('fetch', (event) => {
  // Currently passes through all requests
  // Future: Add caching logic for RPC calls here
  event.respondWith(fetch(event.request));
});
```

### HTML Registration

The registration code in `index.html`:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(registration => {
      console.log('Service Worker registered:', registration);
    })
    .catch(error => {
      console.log('Service Worker registration failed:', error);
    });
}
```

### Contract Serving

The web4 contract serves the service worker at `/service-worker.js`:

```rust
match path {
    "/service-worker.js" => {
        let service_worker_js = include_str!("web4/service-worker.js");
        return Web4Response::Body {
            content_type: "application/javascript".to_owned(),
            body: BASE64_STANDARD.encode(service_worker_js),
        };
    }
    // ... other routes
}
```

## Important: Build Process and File Structure

**⚠️ CRITICAL: Do NOT edit `/web4/treasury-web4/src/web4/index.html` directly!**

The treasury web4 contract uses a build process that copies HTML from a source location:

### File Structure
- **Source HTML**: `/web4/public_html/index.html` (edit this file)
- **Generated HTML**: `/web4/treasury-web4/src/web4/index.html` (auto-generated, do not edit)

### Build Process
1. The `build.rs` script copies HTML from `public_html/index.html`
2. It processes environment variables (POSTHOG_API_KEY, PIKESPEAK_API_KEY)
3. It outputs the processed HTML to `src/web4/index.html`
4. The contract uses `include_str!("web4/index.html")` to embed the HTML at compile time

### Making Changes
1. **Edit**: `/web4/public_html/index.html`
2. **Build**: Run `cargo clean && cargo near build non-reproducible-wasm`
3. **Verify**: Check that `src/web4/index.html` was updated
4. **Test**: Run tests to confirm changes are included

This build process ensures that any HTML changes (including service worker registration) are properly included in the contract.

## Testing the Implementation

### 1. Build the Contract

For development and testing:
```bash
cd web4/treasury-web4
cargo near build non-reproducible-wasm
```

For production:
```bash
cargo near build
```

### 2. Deploy and Test

```bash
cargo near deploy <account-id>
```

### 3. Check Browser Developer Tools

After the page loads, open Browser DevTools:

1. **Console Tab**: Look for service worker registration messages:
   ```
   Service Worker registered: ServiceWorkerRegistration {...}
   Service Worker: Installing...
   Service Worker: Activated
   ```

2. **Application Tab > Service Workers**: 
   - Should show the service worker as "activated" and "running"
   - URL should be `/service-worker.js`

3. **Network Tab**:
   - All requests currently pass through normally
   - Ready for future caching implementation

### 4. Run Tests

```bash
cargo test test_service_worker
```

This test verifies:
- Service worker endpoint returns JavaScript content
- Content includes expected service worker code
- MIME type is correctly set to `application/javascript`

## Next Steps for Caching

When ready to implement actual caching, modify the fetch event handler in `service-worker.js`:

1. **Identify RPC calls**: Check if request URL matches NEAR RPC endpoints
2. **Cache strategy**: Implement cache-first or network-first strategies
3. **Cache management**: Add expiration and cleanup logic
4. **Error handling**: Provide fallbacks for cache misses

Example future implementation:
```javascript
self.addEventListener('fetch', (event) => {
  if (isNearRPCCall(event.request)) {
    event.respondWith(
      caches.open('rpc-cache-v1').then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse && !isExpired(cachedResponse)) {
            return cachedResponse;
          }
          return fetch(event.request).then(response => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
  } else {
    // Pass through non-RPC requests
    event.respondWith(fetch(event.request));
  }
});
```

## Development Notes

- **Non-reproducible builds**: Use `cargo near build non-reproducible-wasm` for faster development builds
- **Same origin requirement**: Service worker must be served from the web4 contract, not external CDNs
- **Minimal approach**: Current implementation provides the foundation without complex caching logic
- **Extensible design**: Ready to add caching when needed without major restructuring

This minimal approach focuses on getting basic RPC caching working reliably before adding more advanced features.
