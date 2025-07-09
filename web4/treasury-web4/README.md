# treasury-web4

This is the contract for serving web4 content

## 🔧 Service Worker Implementation

This contract includes a **minimal service worker** for future caching of repeated RPC calls. The service worker is served from the same origin (required by browsers) at `/service-worker.js`.

**Key implementation notes:**
- Service worker is served by the contract itself (not from CDN)
- Currently passes through all requests (ready for caching logic)
- Automatically registers on page load
- Includes comprehensive test coverage

See [`/web4/README-Minimal-Service-Worker.md`](../README-Minimal-Service-Worker.md) for detailed implementation documentation.

## ⚠️ HTML Editing - Important Build Process

**To modify the HTML content:**

1. **Edit the source file**: `/web4/public_html/index.html`
2. **Rebuild the contract**: `cargo clean && cargo near build non-reproducible-wasm`

**DO NOT** edit `/web4/treasury-web4/src/web4/index.html` directly - it gets overwritten by the build script!

The build process copies HTML from `public_html/index.html` to the contract's source directory during compilation.

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
