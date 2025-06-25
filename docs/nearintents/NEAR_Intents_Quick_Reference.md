# NEAR Intents Quick Reference Guide

## Quick Setup Checklist

### For DAO Administrators

- [ ] Enable NEAR Intents feature flag in config
- [ ] Verify treasury permissions for intents operations  
- [ ] Set up monitoring for cross-chain deposits
- [ ] Configure approval thresholds for payment requests
- [ ] Test deposit/payment flow with small amounts

### For Developers

- [ ] Set up local development environment
- [ ] Run test suite: `npm test -- --grep "intents"`
- [ ] Configure RPC proxy for sandbox testing
- [ ] Review contract deployment scripts
- [ ] Set up monitoring and alerting

## Common Operations

### Checking NEAR Intents Balance

```bash
# Via NEAR CLI
near view intents.near mt_balance_of '{"account_id":"your-dao.sputnik-dao.near","token_id":"nep141:eth.omft.near"}'

# Via RPC
curl -X POST https://rpc.mainnet.near.org \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "dontcare",
    "method": "query",
    "params": {
      "request_type": "call_function",
      "finality": "final",
      "account_id": "intents.near",
      "method_name": "mt_balance_of",
      "args_base64": "eyJhY2NvdW50X2lkIjoieW91ci1kYW8uc3B1dG5pay1kYW8ubmVhciIsInRva2VuX2lkIjoibmVwMTQxOmV0aC5vbWZ0Lm5lYXIifQ=="
    }
  }'
```

### Creating a Payment Request (DAO Proposal)

```bash
# Create BTC payment proposal
near call your-dao.sputnik-dao.near add_proposal '{
  "proposal": {
    "description": "Payment to contractor",
    "kind": {
      "FunctionCall": {
        "receiver_id": "intents.near",
        "actions": [{
          "method_name": "ft_withdraw",
          "args": "eyJyZWNlaXZlcl9pZCI6ImJ0Yy5vbWZ0Lm5lYXIiLCJhbW91bnQiOiIxMDAwMDAwMDAwIiwidG9rZW4iOiJidGMub21mdC5uZWFyIiwibWVtbyI6IldJVEhEUkFXX1RPOmJjMXF4eTJrZ2R5Z2pyc3F0enEybjB5cmYyNDkzcDgza2tmanh3bGgifQ==",
          "deposit": "1",
          "gas": "100000000000000"
        }]
      }
    }
  }
}' --accountId your-dao.sputnik-dao.near --amount 0.1
```

### Monitoring Deposits

```bash
# Check recent deposits
near view intents.near get_recent_deposits '{"account_id":"your-dao.sputnik-dao.near","limit":10}'

# Monitor specific token
watch -n 30 'near view intents.near mt_balance_of "{\"account_id\":\"your-dao.sputnik-dao.near\",\"token_id\":\"nep141:btc.omft.near\"}"'
```

## Network Reference

### Chain IDs and Display Names

| Network | Chain ID | Display Name | Sample Address |
|---------|----------|--------------|----------------|
| Ethereum | eth:1 | ETH | 0x742d35Cc6634C0532925a3b8D77F33808d84C | 
| Bitcoin | btc:mainnet | BTC | bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh |
| Solana | sol:mainnet | SOL | 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM |
| Base | eth:8453 | BASE | 0x742d35Cc6634C0532925a3b8D77F33808d84C |
| Arbitrum | eth:42161 | ARB | 0x742d35Cc6634C0532925a3b8D77F33808d84C |
| NEAR | near:mainnet | NEAR | your-account.near |
| XRP | xrp:mainnet | XRP | rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH |
| Tron | tron:mainnet | TRON | TEmgZEq7E2Eeo41gN5AHMF5QfWkTbr3Gdg |

### Asset Token IDs

```javascript
const assetTokenIds = {
  // Ethereum assets
  "eth": "nep141:eth.omft.near",
  "usdc-eth": "nep141:0xa0b86a33e6180efb4c5cffdac00cd7b11b6e9de",
  "usdt-eth": "nep141:0xdac17f958d2ee523a2206206994597c13d831ec7",
  
  // Bitcoin
  "btc": "nep141:btc.omft.near",
  
  // Solana assets  
  "sol": "nep141:sol.omft.near",
  
  // Base assets
  "usdc-base": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
  
  // NEAR native
  "wnear": "nep141:wrap.near",
  "ref": "nep141:token.v2.ref-finance.near"
};
```

## Error Codes and Solutions

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Insufficient balance" | Not enough funds | Check available balance, wait for deposits |
| "Invalid address format" | Wrong address format | Verify address matches network requirements |
| "Network not supported" | Unsupported blockchain | Use supported networks only |
| "Amount below minimum" | Transfer too small | Check minimum transfer amounts |
| "Gas estimation failed" | Network congestion | Retry with higher gas or wait |

### Debugging Commands

```bash
# Check DAO balance
near view your-dao.sputnik-dao.near get_balances

# Verify intents integration
near view intents.near get_config

# Check recent transactions
near view your-dao.sputnik-dao.near get_proposals '{"from_index":0,"limit":10}'

# Monitor contract logs
near view intents.near get_logs '{"account_id":"your-dao.sputnik-dao.near"}'
```

## Asset-Specific Information

### Bitcoin (BTC)
- **Decimals**: 8
- **Min Transfer**: 0.00001 BTC
- **Confirmations**: 6 blocks
- **Address Format**: Bech32 (bc1...) or Legacy (1... / 3...)

### Ethereum (ETH)
- **Decimals**: 18  
- **Min Transfer**: 0.001 ETH
- **Confirmations**: 12 blocks
- **Address Format**: 0x followed by 40 hex characters

### USDC
- **Ethereum Decimals**: 6
- **Base Decimals**: 6  
- **Min Transfer**: $1 equivalent
- **Confirmations**: Network-dependent

### Solana (SOL)
- **Decimals**: 9
- **Min Transfer**: 0.01 SOL
- **Confirmations**: 32 slots
- **Address Format**: Base58 encoded

## UI Component Reference

### Feature Flags

```javascript
// Enable/disable NEAR Intents
showNearIntents: true

// Enable USD value display
showUSDValues: true

// Enable deposit button
enableDeposits: true
```

### CSS Classes

```css
/* Main intents container */
.near-intents-card { }

/* Deposit button */
.btn-deposit.btn-success { }

/* Asset selection */
.asset-selector { }

/* Network dropdown */
.network-selector { }

/* QR code display */
.qr-code-container { }

/* Balance display */
.balance-display { }
```

## Testing Commands

### Run Specific Test Categories

```bash
# Dashboard tests only
npm test -- --grep "dashboard"

# Deposit functionality  
npm test -- --grep "deposit"

# Payment requests
npm test -- --grep "payment"

# UI interactions
npm test -- --grep "ui"

# All intents tests
npm test -- --grep "intents"
```

### Generate Test Artifacts

```bash
# Record videos
npm test -- --headed

# Generate traces
npm test -- --trace=on

# Capture screenshots  
npm test -- --screenshot=only-on-failure
```

### Test Environment Setup

```bash
# Start development servers
npm run gateway &
npm run rpcproxy &

# Run in specific environment
npm test -- --project=treasury-testing
npm test -- --project=infinex  
npm test -- --project=treasury-dashboard
```

## Performance Tips

### Balance Queries
- Use batch queries for multiple assets
- Cache results for 30 seconds  
- Implement fallback RPC endpoints

### UI Optimization
- Lazy load asset icons
- Debounce search inputs
- Use virtual scrolling for long lists

### Network Calls
- Retry failed requests with exponential backoff
- Set appropriate timeouts (10s for queries, 60s for transactions)
- Monitor rate limits

## Security Checklist

### For DAOs
- [ ] Multi-signature requirements enabled
- [ ] Spending limits configured
- [ ] Regular balance monitoring
- [ ] Audit trail review

### For Developers  
- [ ] Input validation on all user data
- [ ] Address format verification
- [ ] Rate limiting on API calls
- [ ] Error handling for all edge cases

## Support and Resources

### Documentation
- [NEAR Intents User Guide](./NEAR_Intents_User_Guide.md)
- [Technical Documentation](./NEAR_Intents_Technical_Documentation.md)
- [NEAR DevHub Docs](https://github.com/NEAR-DevHub/neardevhub-treasury-dashboard)

### Community
- **Discord**: NEAR DevHub Discord Server
- **Forum**: gov.near.org
- **GitHub**: Report issues and feature requests

### Emergency Contacts
- **Critical Issues**: Contact NEAR DevHub team immediately
- **Security Issues**: Use responsible disclosure process
- **Network Issues**: Check status pages for bridge infrastructure

---

*Last updated: June 2025. Keep this reference updated as new features are added.*
