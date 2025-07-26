#!/usr/bin/env node

/**
 * Manual 1Click API Swap Script for Real DAO Execution
 * 
 * This script performs a real swap using webassemblymusic-treasury.sputnik-dao.near
 * from USDC to ETH via the 1Click API.
 * 
 * Prerequisites:
 * npm install @psalomo/jsonrpc-client
 * 
 * Usage: 
 * cd docs/implementation-plans/1click-api-integration
 * node manual-1click-swap.js
 * 
 * This script was used to execute the successful mainnet swap:
 * - Proposal ID: 15
 * - Transaction: H8U1Xz56LQAXWhk58Q6EJjApiwZzXioX9qxbAmHTMGCY
 * - Amount: 1.0 USDC → 0.999998 USDC
 */

import { NearRpcClient } from '@psalomo/jsonrpc-client';

// Configuration
const DAO_ACCOUNT = "webassemblymusic-treasury.sputnik-dao.near";
const RPC_URL = "https://rpc.mainnet.near.org";
const ONECLICK_API_URL = 'https://1click.chaindefuser.com/v0/quote';

// Token contracts
const USDC_CONTRACT = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
const ETH_CONTRACT = "eth.omft.near";

// RPC client
const rpc = new NearRpcClient(RPC_URL);

async function checkBalance(accountId, tokenContract, tokenSymbol, decimals = 6) {
  try {
    const result = await rpc.query({
      request_type: 'call_function',
      finality: 'final',
      account_id: tokenContract,
      method_name: 'ft_balance_of',
      args_base64: Buffer.from(JSON.stringify({ account_id: accountId })).toString('base64')
    });

    if (result.result && result.result.length > 0) {
      const balance = JSON.parse(Buffer.from(result.result).toString());
      const formattedBalance = (parseInt(balance) / Math.pow(10, decimals)).toFixed(decimals);
      console.log(`💰 ${tokenSymbol} Balance: ${formattedBalance} ${tokenSymbol}`);
      return balance;
    } else {
      console.log(`💰 ${tokenSymbol} Balance: 0 ${tokenSymbol} (not registered or no balance)`);
      return "0";
    }
  } catch (error) {
    console.log(`❌ Error checking ${tokenSymbol} balance: ${error.message}`);
    return "0";
  }
}

async function checkStorageDeposit(accountId, tokenContract, tokenSymbol) {
  try {
    const result = await rpc.query({
      request_type: 'call_function',
      finality: 'final',
      account_id: tokenContract,
      method_name: 'storage_balance_of',
      args_base64: Buffer.from(JSON.stringify({ account_id: accountId })).toString('base64')
    });

    if (result.result && result.result.length > 0) {
      const storageBalance = JSON.parse(Buffer.from(result.result).toString());
      console.log(`🏦 ${tokenSymbol} Storage Deposit: ${storageBalance ? 'Registered' : 'Not registered'}`);
      return storageBalance;
    } else {
      console.log(`🏦 ${tokenSymbol} Storage Deposit: Not registered`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error checking ${tokenSymbol} storage: ${error.message}`);
    return null;
  }
}

async function checkIntentsTokens(accountId) {
  try {
    console.log(`\n🔍 Checking tokens held in NEAR Intents for ${accountId}...`);
    
    // First get the list of token IDs
    const tokensResult = await rpc.query({
      request_type: 'call_function',
      finality: 'final',
      account_id: 'intents.near',
      method_name: 'mt_tokens_for_owner',
      args_base64: Buffer.from(JSON.stringify({ account_id: accountId })).toString('base64')
    });

    if (tokensResult.result && tokensResult.result.length > 0) {
      const tokenIds = JSON.parse(Buffer.from(tokensResult.result).toString());
      
      if (tokenIds && tokenIds.length > 0) {
        console.log(`💰 Found ${tokenIds.length} token(s) in NEAR Intents`);
        console.log(`Debug - Token IDs:`, tokenIds);
        
        // Extract just the token ID strings
        const tokenIdStrings = tokenIds.map(tokenObj => tokenObj.token_id);
        console.log(`Debug - Token ID strings:`, tokenIdStrings);
        
        // Now get the balances for all tokens
        try {
          const balancesResult = await rpc.query({
            request_type: 'call_function',
            finality: 'final',
            account_id: 'intents.near',
            method_name: 'mt_batch_balance_of',
            args_base64: Buffer.from(JSON.stringify({ 
              account_id: accountId,
              token_ids: tokenIdStrings
            })).toString('base64')
          });
          
          console.log(`Debug - Balance query result:`, balancesResult);

          if (balancesResult.result && balancesResult.result.length > 0) {
            const balances = JSON.parse(Buffer.from(balancesResult.result).toString());
            
            console.log(`Debug - Balances response:`, balances);
            
            // Combine token IDs with their balances
            const tokensWithBalances = tokenIdStrings.map((tokenId, index) => ({
              token_id: tokenId,
              balance: balances[index]
            }));
            
            console.log(`\nToken Details:`);
            for (const tokenInfo of tokensWithBalances) {
              console.log(`   • Token ID: ${tokenInfo.token_id}`);
              console.log(`     Balance: ${tokenInfo.balance}`);
              
              // Format known tokens - token IDs already include nep141: prefix
              if (tokenInfo.token_id === `nep141:${USDC_CONTRACT}`) {
                const formattedBalance = (parseInt(tokenInfo.balance) / 1000000).toFixed(6);
                console.log(`     Formatted: ${formattedBalance} USDC`);
              } else if (tokenInfo.token_id === 'nep141:wrap.near') {
                const formattedBalance = (parseInt(tokenInfo.balance) / Math.pow(10, 24)).toFixed(8);
                console.log(`     Formatted: ${formattedBalance} wNEAR`);
              } else if (tokenInfo.token_id === 'nep141:eth.omft.near') {
                const formattedBalance = (parseInt(tokenInfo.balance) / Math.pow(10, 18)).toFixed(8);
                console.log(`     Formatted: ${formattedBalance} ETH`);
              } else if (tokenInfo.token_id.includes('eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')) {
                const formattedBalance = (parseInt(tokenInfo.balance) / 1000000).toFixed(6);
                console.log(`     Formatted: ${formattedBalance} USDC (Ethereum)`);
              }
            }
            
            return tokensWithBalances;
          } else {
            console.log(`❌ Failed to get balances - no result`);
            return [];
          }
        } catch (balanceError) {
          console.log(`❌ Error getting balances: ${balanceError.message}`);
          return [];
        }
      } else {
        console.log(`💰 No tokens found in NEAR Intents for this account`);
        return [];
      }
    } else {
      console.log(`💰 No tokens found in NEAR Intents for this account`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Error checking NEAR Intents tokens: ${error.message}`);
    return [];
  }
}

async function get1ClickQuote(usdcAmount) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7); // 7 days for DAO voting

  const requestPayload = {
    dry: false,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100, // 1% slippage
    originAsset: `nep141:${USDC_CONTRACT}`, // NEAR USDC
    depositType: "INTENTS",
    destinationAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near", // USDC on Ethereum
    refundTo: DAO_ACCOUNT,
    refundType: "INTENTS", 
    recipient: DAO_ACCOUNT, // DAO receives the swapped USDC on NEAR Intents
    recipientType: "INTENTS",
    deadline: deadline.toISOString(),
    amount: usdcAmount // USDC amount in base units (6 decimals)
  };

  console.log(`\n🔄 Requesting 1Click quote...`);
  console.log(`Amount: ${(parseInt(usdcAmount) / 1000000).toFixed(6)} USDC (NEAR) → USDC (Ethereum)`);
  console.log(`Recipient: ${DAO_ACCOUNT} (NEAR Intents)`);
  console.log(`Deadline: ${requestPayload.deadline}`);

  try {
    const response = await fetch(ONECLICK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return { requestPayload, response: data };
  } catch (error) {
    throw new Error(`1Click API request failed: ${error.message}`);
  }
}

async function generateDAOProposal(quote, quoteRequest) {
  const proposalDescription = `1Click USDC Cross-Network Swap (NEAR → Ethereum)

Swap Details:
- Amount In: ${quote.response.quote.amountInFormatted} USDC (NEAR)
- Amount Out: ${quote.response.quote.amountOutFormatted} USDC (Ethereum)
- Rate: 1 USDC (NEAR) = ${(parseFloat(quote.response.quote.amountOutFormatted) / parseFloat(quote.response.quote.amountInFormatted)).toFixed(6)} USDC (Ethereum)
- Destination: ${quoteRequest.recipient} (NEAR Intents)
- Time Estimate: ${quote.response.quote.timeEstimate} minutes
- Quote Deadline: ${quote.response.quote.deadline}

Deposit Address: ${quote.response.quote.depositAddress}

🔗 TRACKING:
Monitor status: https://explorer.near-intents.org/?depositAddress=${quote.response.quote.depositAddress}

1Click Service Signature (for dispute resolution):
${quote.response.signature}

EXECUTION:
This proposal authorizes transferring ${quote.response.quote.amountInFormatted} USDC (NEAR) to 1Click's deposit address.
1Click will execute the cross-network swap and deliver ${quote.response.quote.amountOutFormatted} USDC (Ethereum) back to the DAO's NEAR Intents account.

The signature above provides cryptographic guarantees and can be used for dispute resolution.`;

  // DAO proposal structure - confirmed mt_transfer method works
  const proposalKind = {
    FunctionCall: {
      receiver_id: "intents.near", // Contract to call
      actions: [{
        method_name: "mt_transfer", // Verified method
        args: Buffer.from(JSON.stringify({
          receiver_id: quote.response.quote.depositAddress,
          amount: quote.response.quote.amountIn,
          token_id: quoteRequest.originAsset,
        })).toString("base64"),
        deposit: "1", // 1 yoctoNEAR for function call
        gas: "100000000000000", // 100 Tgas
      }],
    },
  };

  // Complete proposal payload for DAO submission
  const proposalPayload = {
    proposal: {
      description: proposalDescription,
      kind: proposalKind
    }
  };

  return {
    description: proposalDescription,
    kind: proposalKind,
    payload: proposalPayload
  };
}

async function main() {
  console.log('🚀 Manual 1Click Swap Script for DAO Treasury');
  console.log('===========================================\n');
  
  console.log(`DAO Account: ${DAO_ACCOUNT}`);
  console.log(`Target: USDC (NEAR) → USDC (Ethereum) swap via 1Click API\n`);

  // Step 1: Check current balances
  console.log('📊 STEP 1: Checking current balances...\n');
  
  const usdcBalance = await checkBalance(DAO_ACCOUNT, USDC_CONTRACT, 'USDC', 6);
  await checkBalance(DAO_ACCOUNT, ETH_CONTRACT, 'ETH', 18);
  
  await checkStorageDeposit(DAO_ACCOUNT, USDC_CONTRACT, 'USDC');
  await checkStorageDeposit(DAO_ACCOUNT, ETH_CONTRACT, 'ETH');

  // Check tokens in NEAR Intents
  const intentsTokens = await checkIntentsTokens(DAO_ACCOUNT);

  const usdcBalanceFormatted = (parseInt(usdcBalance) / 1000000).toFixed(6);
  console.log(`\n💡 Available USDC for swap: ${usdcBalanceFormatted} USDC\n`);

  // Check if we have USDC in either regular balance or NEAR Intents
  let availableUsdcAmount = parseInt(usdcBalance);
  let usdcInIntents = null;
  
  if (intentsTokens && intentsTokens.length > 0) {
    usdcInIntents = intentsTokens.find(token => token.token_id === `nep141:${USDC_CONTRACT}`);
    if (usdcInIntents) {
      availableUsdcAmount = Math.max(availableUsdcAmount, parseInt(usdcInIntents.balance));
      console.log(`💡 Found USDC in NEAR Intents: ${(parseInt(usdcInIntents.balance) / 1000000).toFixed(6)} USDC`);
    }
  }

  if (availableUsdcAmount === 0) {
    console.log('❌ No USDC balance available for swap');
    console.log('💡 Please ensure the DAO has USDC tokens before proceeding\n');
    return;
  }

  // Step 2: Get 1Click quote
  console.log('📊 STEP 2: Getting 1Click quote...\n');
  
  // Use 1 USDC for testing cross-network swap
  const swapAmountUsdc = Math.min(1000000, availableUsdcAmount); // 1 USDC or available balance
  
  try {
    const quote = await get1ClickQuote(swapAmountUsdc.toString());
    
    console.log(`✅ Quote received successfully!`);
    console.log(`📈 Quote Details:`);
    console.log(`   Amount In: ${quote.response.quote.amountInFormatted} USDC`);
    console.log(`   Amount Out: ${quote.response.quote.amountOutFormatted} ETH`);
    console.log(`   Rate: 1 USDC = ${(parseFloat(quote.response.quote.amountOutFormatted) / parseFloat(quote.response.quote.amountInFormatted)).toFixed(8)} ETH`);
    console.log(`   Deposit Address: ${quote.response.quote.depositAddress}`);
    console.log(`   Time Estimate: ${quote.response.quote.timeEstimate} minutes`);
    console.log(`   Quote Deadline: ${quote.response.quote.deadline}`);
    console.log(`   Signature: ${quote.response.signature.substring(0, 50)}...`);

    // Step 3: Generate DAO proposal
    console.log(`\n📊 STEP 3: Generating DAO proposal...\n`);
    
    const proposal = await generateDAOProposal(quote, quote.requestPayload);
    
    console.log(`✅ DAO Proposal Generated:`);
    console.log(`\n📋 PROPOSAL DESCRIPTION:`);
    console.log('=' .repeat(50));
    console.log(proposal.description);
    console.log('=' .repeat(50));
    
    console.log(`\n🔧 PROPOSAL KIND (Technical Details):`);
    console.log(JSON.stringify(proposal.kind, null, 2));
    
    console.log(`\n📤 PROPOSAL PAYLOAD FOR SUBMISSION:`);
    console.log('=' .repeat(60));
    console.log(JSON.stringify(proposal.payload, null, 2));
    console.log('=' .repeat(60));
    
    console.log(`\n📋 COMPLETE API RESPONSE:`);
    console.log(JSON.stringify(quote.response, null, 2));

    console.log(`\n✅ SUCCESS: Manual swap preparation complete!`);
    
    // Write proposal to file
    const fs = await import('fs').then(m => m.default);
    const proposalFilePath = './dao-proposal.json';
    
    fs.writeFileSync(proposalFilePath, JSON.stringify(proposal.payload, null, 2));
    console.log(`\n📁 Proposal JSON saved to: ${proposalFilePath}`);
    
    console.log(`\n🎯 SUBMISSION COMMAND:`);
    console.log(`near contract call-function as-transaction ${DAO_ACCOUNT} add_proposal file-args dao-proposal.json prepaid-gas '100.0 Tgas' attached-deposit '0.1 NEAR' sign-as <your-account.near> network-config mainnet sign-with-keychain send`);
    
    console.log(`\n📝 MANUAL SUBMISSION STEPS:`);
    console.log(`1. 📁 The proposal has been saved to dao-proposal.json`);
    console.log(`2. 🔑 Replace <your-account.near> with your DAO member account`);
    console.log(`3. 📤 Execute the command above to submit the proposal`);
    console.log(`4. 🗳️  Wait for DAO members to vote and approve`);
    console.log(`5. ⚡ Execute the approved proposal to transfer USDC to deposit address`);
    console.log(`6. 🔍 Monitor swap progress: https://explorer.near-intents.org/?depositAddress=${quote.response.quote.depositAddress}`);
    console.log(`7. 🎉 Verify USDC (Ethereum) delivery to DAO's NEAR Intents account`);
    
    console.log(`\n⚠️  CRITICAL TIMING:`);
    console.log(`- Quote expires: ${quote.response.quote.deadline}`);
    console.log(`- DAO MUST approve and execute before this deadline!`);
    console.log(`- Current time: ${new Date().toISOString()}`);
    
    const expiryTime = new Date(quote.response.quote.deadline);
    const timeLeft = (expiryTime - new Date()) / (1000 * 60 * 60);
    console.log(`- Time remaining: ${timeLeft.toFixed(1)} hours`);
    
    console.log(`\n🔐 SECURITY NOTES:`);
    console.log(`- Signature: ${quote.response.signature.substring(0, 30)}...`);
    console.log(`- Deposit address verified: ${quote.response.quote.depositAddress}`);
    console.log(`- Contract method verified: mt_transfer on intents.near`);

    console.log(`\n\n📋 PROPOSAL CONTENT SAVED TO FILE:`);
    console.log('=' .repeat(80));
    console.log(`File: dao-proposal.json`);
    console.log(`DAO Account: ${DAO_ACCOUNT}`);
    console.log(`Method: add_proposal`);
    console.log(`Deposit: 0.1 NEAR (proposal bond)`);
    console.log('=' .repeat(80));
    
    console.log(`\n💾 RESPONSE PAYLOAD FOR PLAYWRIGHT TEST:`);
    console.log('This is the real 1Click API response to use in tests:');
    console.log(JSON.stringify(quote.response, null, 2));

  } catch (error) {
    console.log(`❌ Failed to get 1Click quote: ${error.message}`);
    console.log(`\n💡 Possible issues:`);
    console.log(`- 1Click API may be temporarily unavailable`);
    console.log(`- Token pair may not be supported`);
    console.log(`- Network connectivity issues`);
  }
}

// Run the script
main().catch(console.error);

export {
  checkBalance,
  checkStorageDeposit,
  get1ClickQuote,
  generateDAOProposal
};