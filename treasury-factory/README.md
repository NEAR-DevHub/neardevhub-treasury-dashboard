# treasury-factory

The web4 and helper contract for the treasury factory

## How to Build Locally?

Install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
# For non-reproducible build (faster, for development)
cargo near build non-reproducible-wasm

# For reproducible build (for production deployment)
cargo near build build-reproducible-wasm
```

## How to Test Locally?

```bash
cargo test
```

## How to Deploy?

Deployment is automated with GitHub Actions CI/CD pipeline.
To deploy manually, install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
cargo near deploy build-reproducible-wasm <account-id> \
  without-init-call \
  network-config mainnet \
  sign-with-plaintext-private-key <private-key> \
  send
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
