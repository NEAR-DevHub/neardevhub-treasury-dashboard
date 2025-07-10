# treasury-web4

This is the contract for serving web4 content

## 🔧 Service Worker Implementation

This contract includes a **service worker** that caches RPC calls to improve performance. The service worker is served from the same origin (required by browsers) at `/service-worker.js`.

**Key implementation features:**
- **RPC Caching**: Caches POST requests to Fast NEAR RPC endpoints for 5 minutes
- **Same-origin serving**: Service worker served by the contract itself (required by browser security)
- **Smart cache keys**: Uses method+params for cache keys, ignoring request IDs
- **Automatic registration**: Registers on page load with error handling
- **Comprehensive logging**: Enhanced logging that sends messages to browser clients
- **Test coverage**: Includes tests to verify service worker functionality

**Important**: Service workers **must** be served from the same origin as the web page - they cannot be loaded from CDNs due to browser security requirements.

## ⚠️ HTML Editing - Important Build Process

**To modify the HTML content:**

1. **Edit the source file**: `/web4/public_html/index.html`
2. **Rebuild the contract**: `cargo clean && cargo near build non-reproducible-wasm`

**DO NOT** edit `/web4/treasury-web4/src/web4/index.html` directly - it gets overwritten by the build script!

**Why this matters:**
- The build script (`build.rs`) copies HTML from `public_html/index.html` to `src/web4/index.html`
- The contract embeds HTML using `include_str!()` at compile time
- Direct edits to `src/web4/index.html` are lost on rebuild
- Changes to source HTML require a contract rebuild to take effect

### Build Process Details
1. The `build.rs` script copies HTML from `public_html/index.html`
2. It processes environment variables (POSTHOG_API_KEY, PIKESPEAK_API_KEY)
3. It outputs the processed HTML to `src/web4/index.html`
4. The contract uses `include_str!("web4/index.html")` to embed the HTML at compile time

## Testing Service Worker

After deploying, you can test the service worker in Browser DevTools:

1. **Console Tab**: Look for service worker messages:
   ```
   Service Worker: Installing...
   Service Worker: Activated
   Service Worker: Cached RPC response from rpc.mainnet.fastnear.com
   ```

2. **Application Tab > Service Workers**: 
   - Should show the service worker as "activated" and "running"
   - URL should be `/service-worker.js`

3. **Network Tab**: 
   - First RPC requests fetch from network
   - Subsequent identical requests served from cache (within 5 minutes)

## How to Build Locally?

Install [`cargo-near`](https://github.com/near/cargo-near)

For development and testing, you can also use the non-reproducible build for faster compilation:

```bash
cargo near build non-reproducible-wasm
```

Note: The non-reproducible build is suitable for local development and testing but should not be used for production deployments.

## How to Test Locally?

```bash
cargo test
```

## How to Deploy?

Deployment is automated with GitHub Actions CI/CD pipeline.
To deploy manually, install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
cargo near deploy <account-id>
```

## Useful Links

- [cargo-near](https://github.com/near/cargo-near) - NEAR smart contract development toolkit for Rust
- [near CLI](https://near.cli.rs) - Interact with NEAR blockchain from command line
- [NEAR Rust SDK Documentation](https://docs.near.org/sdk/rust/introduction)
- [NEAR Documentation](https://docs.near.org)
- [NEAR StackOverflow](https://stackoverflow.com/questions/tagged/nearprotocol)
- [NEAR Discord](https://near.chat)
- [NEAR Telegram Developers Community Group](https://t.me/neardev)
- NEAR DevHub: [Telegram](https://t.me/neardevhub), [Twitter](https://twitter.com/neardevhub)
