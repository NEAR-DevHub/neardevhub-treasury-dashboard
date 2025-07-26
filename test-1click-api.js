#!/usr/bin/env node

/**
 * Test script for 1Click API quote endpoint
 * 
 * Usage: node test-1click-api.js
 * 
 * This script demonstrates how to request a quote from the 1Click API
 * and shows how the API handles different deadline values.
 */

async function test1ClickAPI() {
  const API_URL = 'https://1click.chaindefuser.com/v0/quote';
  
  // Test with different deadline values
  const deadlineTests = [
   /* { days: 1, label: "24 hours" },
    { days: 2, label: "2 days" },
    { days: 5, label: "5 days" },*/
    { days: 7, label: "7 days (typical DAO voting)" },
    //{ days: 14, label: "14 days" }
  ];

  console.log('🔍 Testing 1Click API Quote Endpoint\n');
  console.log('API URL:', API_URL);
  console.log('Testing different deadline values to see how 1Click handles them...\n');

  for (const test of deadlineTests) {
    // Calculate deadline
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + test.days);
    
    // Create request payload - SWAP USDC on NEAR -> ETH on Ethereum
    const requestPayload = {
      dry: false,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100, // 1% slippage
      originAsset: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", // NEAR USDC
      depositType: "INTENTS",
      destinationAsset: "nep141:eth.omft.near", // ETH on Ethereum mainnet
      refundTo: "test-dao.sputnik-dao.near", // Example DAO account
      refundType: "INTENTS",
      recipient: "0xa03157D76c410D0A92Cb1B381B365DF612E6989E", // Example Ethereum address
      recipientType: "DESTINATION_CHAIN",
      deadline: deadline.toISOString(),
      amount: "100000000" // 100 USDC (6 decimals) - buying ETH with this amount
    };

    console.log(`\n📅 Test ${test.label}:`);
    console.log(`Request deadline: ${requestPayload.deadline}`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ API Error (${response.status}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      
      console.log(`✅ Quote received!`);
      console.log(`Returned deadline: ${data.quote.deadline}`);
      console.log(`Deposit address: ${data.quote.depositAddress}`);
      console.log(`Amount in: ${data.quote.amountInFormatted} USDC`);
      console.log(`Amount out: ${data.quote.amountOutFormatted} USDC`);
      console.log(`Time estimate: ${data.quote.timeEstimate} minutes`);
      console.log(`Signature: ${data.signature.substring(0, 50)}...`);
      
      // Calculate deadline difference
      const requestedDeadline = new Date(requestPayload.deadline);
      const returnedDeadline = new Date(data.quote.deadline);
      const diffHours = (returnedDeadline - new Date()) / (1000 * 60 * 60);
      console.log(`⏰ Actual deadline: ~${diffHours.toFixed(1)} hours from now`);

      console.log(JSON.stringify(data, null, 1));
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }

  console.log('\n\n📋 Full Example Request:');
  console.log('------------------------');
  
  // Show a complete example - USDC to ETH swap
  const examplePayload = {
    dry: false,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", // NEAR USDC
    depositType: "INTENTS",
    destinationAsset: "nep141:eth.omft.near", // ETH on Ethereum
    refundTo: "your-dao.sputnik-dao.near",
    refundType: "INTENTS",
    recipient: "0xYourEthereumAddress",
    recipientType: "DESTINATION_CHAIN",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    amount: "100000000" // 100 USDC -> will receive ETH
  };
  
  console.log(JSON.stringify(examplePayload, null, 2));
  
  console.log('\n💡 Key Findings:');
  console.log('- 1Click ignores requested deadline and sets ~24 hours');
  console.log('- For DAO integration, get fresh quote after approval');
  console.log('- Use INTENTS deposit type for proper integration');
  console.log('- Signature provided for dispute resolution\n');
}

// Run the test
test1ClickAPI().catch(console.error);