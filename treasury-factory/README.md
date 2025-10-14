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

## Global Contract Setup

The treasury factory supports NEAR's global contract deployment feature, which reduces deployment costs and enables centralized contract updates.

### Benefits of Global Contracts

- **Cost Reduction**: 2 NEAR savings per treasury instance (7 NEAR vs 9 NEAR)
  - Global contract storage: 0.5 NEAR vs 2.5 NEAR for full contract deployment
- **Centralized Updates**: All instances automatically use the updated contract when the global contract is updated
  - No user action required to benefit from updates
  - Immediate propagation to all existing treasuries

### Setting Up Global Contract Deployment

#### 1. Deploy the Web4 Contract as a Global Contract

After deploying the treasury-factory contract, deploy the embedded web4 contract as a global contract:

```bash
near contract call-function as-transaction treasury-factory.near \
  deploy_web4_global_contract \
  json-args {} \
  prepaid-gas '300 TeraGas' \
  attached-deposit '0 NEAR' \
  sign-as treasury-factory.near \
  network-config mainnet
```

**What this does:**
- Calls `deploy_web4_global_contract()` on the treasury-factory contract
- Uses `deploy_global_contract_by_account_id()` from near-sdk to register the web4 contract as a global contract
- The global contract is deployed to the treasury-factory account itself (using `env::current_account_id()`)
- Can only be called by the factory contract itself (restricted via predecessor check)
- All future instances created with `create_instance_global_contract` will reference this global contract

#### 2. Create Treasury Instances Using Global Contract

Use `create_instance_global_contract` instead of `create_instance` when creating new treasuries:

```bash
near contract call-function as-transaction treasury-factory.near \
  create_instance_global_contract \
  json-args '{"name": "my-treasury", "sputnik_dao_factory_account_id": "sputnik-dao.near", "social_db_account_id": "social.near", "widget_reference_account_id": "treasury-devdao.near", "create_dao_args": "..."}' \
  prepaid-gas '300 TeraGas' \
  attached-deposit '7 NEAR' \
  sign-as <your-account> \
  network-config mainnet
```

**What this does:**
- Creates a new treasury instance account (e.g., `my-treasury.near`)
- Requires only **7 NEAR** deposit (vs 9 NEAR for `create_instance`)
- Uses NEAR linkdrop's `create_account_advanced` with `use_global_contract_account_id` option
- Instance account references the global contract instead of deploying contract bytes
- Instance storage: 0.5 NEAR vs 2.5 NEAR for full contract deployment
- Sets up full access keys, DAO, widgets, and metadata (same as `create_instance`)

### Cost Comparison

| Method | Total Cost | Storage Cost | Uses Global Contract |
|--------|-----------|--------------|---------------------|
| `create_instance` | 9 NEAR | 2.5 NEAR | ❌ No |
| `create_instance_global_contract` | **7 NEAR** | **0.5 NEAR** | ✅ Yes |
| **Savings** | **2 NEAR** | **2 NEAR** | - |

### Updating the Global Contract

To update the global contract (e.g., after deploying a new version of treasury-factory):

```bash
near contract call-function as-transaction treasury-factory.near \
  deploy_web4_global_contract \
  json-args {} \
  prepaid-gas '300 TeraGas' \
  attached-deposit '0 NEAR' \
  sign-as treasury-factory.near \
  network-config mainnet
```

All existing instances using the global contract will **automatically use the updated contract** without any user action required.

## Useful Links

- [cargo-near](https://github.com/near/cargo-near) - NEAR smart contract development toolkit for Rust
- [near CLI](https://near.cli.rs) - Interact with NEAR blockchain from command line
- [NEAR Rust SDK Documentation](https://docs.near.org/sdk/rust/introduction)
- [NEAR Documentation](https://docs.near.org)
- [NEAR StackOverflow](https://stackoverflow.com/questions/tagged/nearprotocol)
- [NEAR Discord](https://near.chat)
- [NEAR Telegram Developers Community Group](https://t.me/neardev)
- NEAR DevHub: [Telegram](https://t.me/neardevhub), [Twitter](https://twitter.com/neardevhub)
