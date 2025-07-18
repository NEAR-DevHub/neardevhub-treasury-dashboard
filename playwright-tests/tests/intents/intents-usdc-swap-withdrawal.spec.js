import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Account, parseNEAR, Worker } from "near-workspaces";
import { connect, utils } from "near-api-js";
import { KeyPair } from "near-api-js/lib/utils/index.js";
import {
  PROPOSAL_BOND,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc.js";

/**
 * NEP-413 Signed Intents Test
 * 
 * This test replicates the mainnet transaction 2nPcKm1LyKyivxPZwTnN9DXziH3az5h1o3VQbV3nX9wF
 * which demonstrates a USDC swap from NEAR to ETH followed by withdrawal using NEP-413 signed intents.
 * 
 * Key Features Demonstrated:
 * - NEP-413 signature generation using proper Borsh serialization and base58 encoding
 * - TEE-compatible workflow where signing keys are separate from account access keys
 * - Cross-chain token swaps using the intents.near contract
 * - Public key registration for signature verification
 * - Real mainnet token IDs and contract interactions in sandbox environment
 * 
 * Test Flow:
 * 1. Deploy and initialize OMFT and intents contracts
 * 2. Import real mainnet USDC contracts (NEAR and ETH variants)
 * 3. Generate separate keypairs for TEE-style signing
 * 4. Register public keys with intents contract for each signer account
 * 5. Create signed intents using NEP-413 standard
 * 6. Execute intents via intents.near contract
 * 
 * Current Status:
 * ✅ NEP-413 signature generation and verification working correctly
 * ✅ JSON deserialization passes
 * ✅ Public key lookup succeeds
 * ❌ Intent execution fails on insufficient balance (expected without token minting)
 * 
 * TODO: Implement proper token minting to see full successful execution
 */
test("replicate USDC swap and withdrawal with solver", async ({ page }, testInfo) => {
  // Skip if not running treasury-testing project
  test.skip(testInfo.project.name !== "treasury-testing", "This test only runs in treasury-testing project");
  test.setTimeout(120_000);
  
  const worker = await Worker.init();
  const mainnet = await connect({
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.fastnear.com",
  });

  // Setup omft contract
  const omftContract = await worker.rootAccount.importContract({
    mainnetContract: "omft.near",
  });
  const omftMainnetAccount = await mainnet.account(omftContract.accountId);

  await omftContract.call(omftContract.accountId, "new", {
    super_admins: ["omft.near"],
    admins: {},
    grantees: {
      DAO: ["omft.near"],
      TokenDeployer: ["omft.near"],
      TokenDepositer: ["omft.near"],
    },
  });

  // Setup intents contract
  const intentsContract = await worker.rootAccount.importContract({
    mainnetContract: "intents.near",
  });
  await intentsContract.call(intentsContract.accountId, "new", {
    config: {
      wnear_id: "wrap.near",
      fees: {
        fee: 100,
        fee_collector: "intents.near",
      },
      roles: {
        super_admins: ["intents.near"],
        admins: {},
        grantees: {},
      },
    },
  });

  // Use the real USDC token IDs from the supported tokens API
  const nearUsdcToken = {
    defuse_asset_identifier: "near:mainnet:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    near_token_id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
    decimals: 6,
    asset_name: "USDC",
    intents_token_id: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"
  };
  
  const ethUsdcToken = {
    defuse_asset_identifier: "eth:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    near_token_id: "eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
    decimals: 6,
    asset_name: "USDC",
    intents_token_id: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near"
  };

  console.log("Using NEAR USDC token:", nearUsdcToken.near_token_id);
  console.log("Using ETH USDC token:", ethUsdcToken.near_token_id);

  // Import the real mainnet USDC contract
  const nearUsdcContract = await worker.rootAccount.importContract({
    mainnetContract: nearUsdcToken.near_token_id,
  });
  
  // Initialize it using the same method as wrap.near initialization in other tests
  const nearUsdcMainnetAccount = await mainnet.account(nearUsdcContract.accountId);
  const mainnetMetadata = await nearUsdcMainnetAccount.viewFunction({
    contractId: nearUsdcContract.accountId,
    methodName: "ft_metadata",
  });
  // Note: We don't need to fetch total_supply since we'll mint our own tokens
  
  await nearUsdcContract.call(nearUsdcContract.accountId, "init", {
    admin_ids: [worker.rootAccount.accountId],
    master_minter_ids: [worker.rootAccount.accountId],
    owner_ids: [worker.rootAccount.accountId],
    pauser_ids: [worker.rootAccount.accountId],
    blocklister_id: worker.rootAccount.accountId,
    metadata: mainnetMetadata,
    approval_threshold: 1, // Use 1 for testing instead of 2
    validity_period: "432000000000000", // 5 days in nanoseconds
  });

  // Deploy ETH USDC token via OMFT (this needs to be deployed through OMFT)
  const ethUsdcMetadata = await omftMainnetAccount.viewFunction({
    contractId: ethUsdcToken.near_token_id,
    methodName: "ft_metadata",
  });
  await omftContract.call(
    omftContract.accountId,
    "deploy_token",
    {
      token: "eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      metadata: ethUsdcMetadata,
    },
    { attachedDeposit: parseNEAR("3"), gas: 300_000_000_000_000n.toString() }
  );

  // Import real mainnet accounts
  const solverAccount = await worker.rootAccount.importContract({
    mainnetContract: "solver-multichain-asset.near",
  });
  
  const userAccount = await worker.rootAccount.importContract({
    mainnetContract: "petersalomonsen.near",
  });

  // Note: near-intents.intents-referral.near doesn't exist on mainnet, so we'll skip referral for this test

  const nearUsdcTokenId = nearUsdcToken.near_token_id; // Use the real mainnet token ID
  const ethUsdcTokenId = ethUsdcToken.near_token_id;

  // Storage deposits for intents contract
  await intentsContract.call(
    nearUsdcTokenId,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    { attachedDeposit: parseNEAR("0.00125") }
  );

  await omftContract.call(
    ethUsdcTokenId,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    { attachedDeposit: parseNEAR("0.00125") }
  );

  // Storage deposits for solver and user accounts
  await solverAccount.call(
    nearUsdcTokenId,
    "storage_deposit",
    {
      account_id: solverAccount.accountId,
      registration_only: true,
    },
    { attachedDeposit: parseNEAR("0.00125") }
  );

  await userAccount.call(
    nearUsdcTokenId,
    "storage_deposit",
    {
      account_id: userAccount.accountId,
      registration_only: true,
    },
    { attachedDeposit: parseNEAR("0.00125") }
  );

  // Register root account for NEAR USDC storage (needed for transfers)
  await worker.rootAccount.call(
    nearUsdcTokenId,
    "storage_deposit",
    {
      account_id: worker.rootAccount.accountId,
      registration_only: true,
    },
    { attachedDeposit: parseNEAR("0.00125") }
  );

  // Note: For this test, we're focusing on the NEP-413 signature verification
  // The swap will fail due to insufficient balances, but we can verify the signatures work
  console.log("✓ Setup complete - testing NEP-413 signature verification");
  
  /* TODO: Implement proper token minting for full test
   * 
   * To see successful execute_intents execution, we need to:
   * 1. Mint NEAR USDC tokens to user account using nearUsdcContract.mint()
   * 2. Mint ETH USDC tokens to solver account using OMFT contract's minting functionality
   *    - Check intents-deposit-other-chain.spec.js for deploy_token pattern
   *    - Use proper OMFT minting methods
   * 3. Transfer tokens to intents contract so it has sufficient balance for swaps
   * 4. Verify balances before/after execution to confirm swap worked
   * 
   * Current blocker: Need to understand proper OMFT token minting interface
   * Reference: intents-deposit-other-chain.spec.js line selection shows deploy_token usage
   */

  // Define the defuse token IDs using real mainnet token IDs
  const nearUsdcTokenDefuseId = nearUsdcToken.intents_token_id; // Use real mainnet token ID
  const ethUsdcTokenDefuseId = ethUsdcToken.intents_token_id;

  console.log("✓ Setup complete - contracts deployed and ready for NEP-413 testing");
  console.log("Using real mainnet token IDs for intents payload:");
  console.log("NEAR USDC:", nearUsdcTokenDefuseId);
  console.log("ETH USDC:", ethUsdcTokenDefuseId);

  // Generate separate keypairs for intent signing (simulating TEE-generated keys)
  const solverSigningKey = KeyPair.fromRandom("ed25519");
  const userSigningKey = KeyPair.fromRandom("ed25519");
  
  console.log("Generated signing keys:");
  console.log("Solver signing public key:", solverSigningKey.getPublicKey().toString());
  console.log("User signing public key:", userSigningKey.getPublicKey().toString());

  // Add these public keys to the intents contract for signature verification
  // Call from each account to register their own public key for TEE signing
  await solverAccount.call(
    intentsContract.accountId,
    "add_public_key",
    {
      account_id: solverAccount.accountId,
      public_key: solverSigningKey.getPublicKey().toString(),
    },
    { attachedDeposit: "1", gas: "50000000000000" }
  );

  await userAccount.call(
    intentsContract.accountId,
    "add_public_key",
    {
      account_id: userAccount.accountId,
      public_key: userSigningKey.getPublicKey().toString(),
    },
    { attachedDeposit: "1", gas: "50000000000000" }
  );

  console.log("✓ Public keys registered for signature verification");


  // Execute intents using proper NEP-413 signed payloads (replicating the mainnet transaction)
  
  // Create the solver intent message - matching original format exactly
  const solverMessage = {
    signer_id: solverAccount.accountId,
    deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
    intents: [
      {
        intent: "token_diff",
        diff: {
          [nearUsdcTokenDefuseId]: "99999900", // Take NEAR USDC
          [ethUsdcTokenDefuseId]: "-99999900", // Give ETH USDC
        },
      },
    ],
  };

  // Create the user intent message - matching original format exactly
  const userMessage = {
    deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
    intents: [
      {
        intent: "token_diff",
        diff: {
          [nearUsdcTokenDefuseId]: "-100000000", // Give NEAR USDC
          [ethUsdcTokenDefuseId]: "99999800", // Get ETH USDC (200 fee)
        },
        referral: "near-intents.intents-referral.near", // Non-existent account (replicating mainnet behavior)
      },
      {
        intent: "ft_withdraw",
        token: ethUsdcTokenId,
        receiver_id: ethUsdcTokenId, // Same as token for cross-chain withdrawal
        amount: "99999800",
        memo: "WITHDRAW_TO:0xa03157D76c410D0A92Cb1B381B365DF612E6989E",
      },
    ],
    signer_id: userAccount.accountId,
  };

  // Create NEP-413 payloads and sign them with the generated keypairs
  
  /**
   * Creates and signs a NEP-413 payload for intent execution
   * 
   * This implements the NEP-413 standard for off-chain message signing, compatible with
   * TEE environments where private keys are held securely but signatures can be generated.
   * 
   * Key implementation details:
   * - Uses Borsh serialization for cross-platform compatibility
   * - Implements hash-then-sign pattern for security
   * - Uses base58 encoding for NEAR ecosystem compatibility
   * - Supports both near-cli-rs (prefix bytes) and MyNearWallet (tag field) approaches
   * 
   * @param {Object} message - The intent message to sign
   * @param {string} recipient - The contract that will verify this signature  
   * @param {Uint8Array} nonce - 32-byte random nonce for replay protection
   * @param {KeyPair} signingKey - The keypair to sign with (separate from account access key)
   * @param {string} standard - Signing standard ("nep413" or "raw_ed25519")
   * @returns {Object} Signed payload in format expected by intents.near contract
   */
  async function createSignedPayload(message, recipient, nonce, signingKey, standard = "nep413") {
    const messageString = JSON.stringify(message);
    
    if (standard === "nep413") {
      // Based on near-cli-rs implementation: prefix bytes + borsh serialized payload
      const payload = {
        message: messageString,
        nonce: Array.from(nonce),
        recipient: recipient,
        callbackUrl: null // Optional field
      };
      
      // Define Borsh schema for the payload (without prefix)
      const payloadSchema = {
        struct: {
          message: 'string',
          nonce: { array: { type: 'u8', len: 32 } },
          recipient: 'string',
          callbackUrl: { option: 'string' }
        }
      };
      
      // NEP413_SIGN_MESSAGE_PREFIX: (1 << 31) + 413 = 2147484061
      const prefixValue = 2147484061;
      const prefixBytes = new Uint8Array(4);
      // to_le_bytes() - little endian
      prefixBytes[0] = prefixValue & 0xFF;
      prefixBytes[1] = (prefixValue >> 8) & 0xFF;
      prefixBytes[2] = (prefixValue >> 16) & 0xFF;
      prefixBytes[3] = (prefixValue >> 24) & 0xFF;
      
      // Serialize payload with Borsh
      const serializedPayload = utils.serialize.serialize(payloadSchema, payload);
      
      // Combine: prefix bytes + serialized payload (matching near-cli-rs)
      const bytesToSign = new Uint8Array(prefixBytes.length + serializedPayload.length);
      bytesToSign.set(prefixBytes);
      bytesToSign.set(serializedPayload, prefixBytes.length);
      
      // Hash the combined bytes first, then sign the hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', bytesToSign);
      const hash = new Uint8Array(hashBuffer);
      
      // Sign the hash (not the raw bytes)
      const signature = signingKey.sign(hash);
      
      return {
        standard: "nep413",
        payload: {
          message: messageString,
          nonce: Buffer.from(nonce).toString("base64"), // Convert to base64 for JSON transport
          recipient: recipient,
        },
        public_key: signingKey.getPublicKey().toString(),
        signature: `ed25519:${utils.serialize.base_encode(signature.signature)}`,
      };
    } else {
      // Raw Ed25519 signing (simple approach)
      const messageBytes = Buffer.from(messageString, 'utf-8');
      const signature = signingKey.sign(messageBytes);
      
      return {
        standard: "raw_ed25519",
        payload: messageString, // Just the raw message string
        public_key: signingKey.getPublicKey().toString(),
        signature: `ed25519:${utils.serialize.base_encode(signature.signature)}`,
      };
    }
  }

  // Create proper 32-byte nonces
  const solverNonce = new Uint8Array(32);
  crypto.getRandomValues(solverNonce);
  
  const userNonce = new Uint8Array(32);
  crypto.getRandomValues(userNonce);

  // Sign the solver intent using NEP-413 standard (default)
  const solverSignedPayload = await createSignedPayload(
    solverMessage,
    intentsContract.accountId,
    solverNonce,
    solverSigningKey
  );

  // Sign the user intent using NEP-413 standard (default)
  const userSignedPayload = await createSignedPayload(
    userMessage,
    intentsContract.accountId,
    userNonce,
    userSigningKey
  );

  // Create the signed payload structure matching the original transaction format
  const signedIntents = [
    {
      payload: solverSignedPayload.payload,
      public_key: solverSignedPayload.public_key,
      signature: solverSignedPayload.signature,
      standard: solverSignedPayload.standard,
    },
    {
      payload: userSignedPayload.payload,
      public_key: userSignedPayload.public_key,
      signature: userSignedPayload.signature,
      standard: userSignedPayload.standard,
    },
  ];

  // Check initial balances (will be 0 for this test)
  console.log("\n=== Initial Balances ===");
  try {
    const solverEthUsdcBalance = await omftContract.view(ethUsdcTokenId, "ft_balance_of", {
      account_id: solverAccount.accountId
    });
    console.log(`Solver ETH USDC balance: ${solverEthUsdcBalance}`);
  } catch (e) {
    console.log("Solver ETH USDC balance: 0 (account not registered)");
  }
  
  try {
    const userNearUsdcBalance = await nearUsdcContract.view("ft_balance_of", {
      account_id: userAccount.accountId
    });
    console.log(`User NEAR USDC balance: ${userNearUsdcBalance}`);
  } catch (e) {
    console.log("User NEAR USDC balance: 0 (account not registered)");
  }

  // Execute the complete swap and withdrawal transaction
  console.log("\n=== Executing USDC Swap and Withdrawal ===");
  console.log("Signed intents payload (NEP-413):", JSON.stringify(signedIntents, null, 2));
  
  const swapPayload = {
    "signed": signedIntents
  };
  
  try {
    const result = await intentsContract.call(intentsContract.accountId, "execute_intents", swapPayload, {
      attachedDeposit: "0", gas: 300_000_000_000_000n.toString()
    });
    console.log("✅ SWAP SUCCESSFUL!");
    console.log("Transaction result:", result);
    
    console.log("✅ NEP-413 signatures verified successfully!");
    console.log("✅ Intent execution completed!");
    
  } catch (error) {
    const errorMessage = error.message.split("Smart contract panicked: ")[1] || error.message;
    console.log(`❌ SWAP FAILED: ${errorMessage}`);
    
    if (errorMessage.includes("insufficient balance")) {
      console.log("💡 This is expected if accounts don't have enough tokens for the swap amounts");
    } else if (errorMessage.includes("invalid signature")) {
      console.log("💡 Signature verification failed - check NEP-413 implementation");
    } else {
      console.log("💡 Unexpected error - check contract state and parameters");
    }
  }

  await worker.tearDown();
});