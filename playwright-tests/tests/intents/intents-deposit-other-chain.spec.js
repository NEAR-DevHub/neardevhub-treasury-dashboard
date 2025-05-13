import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Account, parseNEAR, Worker } from "near-workspaces";
import { connect } from "near-api-js";
import { SPUTNIK_DAO_FACTORY_ID } from "../../util/sandboxrpc.js";

// DOCS: https://docs.near.org/tutorials/intents/deposit

/**
 * This test demonstrates and documents the process of depositing tokens to the NEAR intents contract from another chain (Ethereum).
 *
 * Findings:
 * - The test sets up a simulated environment with omft (fungible token) and intents contracts, and a DAO (Sputnik) contract.
 * - It fetches available tokens and supported bridge tokens from real APIs, ensuring the test uses real-world token metadata.
 * - The test deploys and initializes the omft token contract, and registers the intents contract for storage on the token contract.
 * - It creates a DAO and fetches the deposit address for the DAO on Ethereum using the bridge API.
 * - The test simulates a cross-chain deposit by calling `ft_deposit` on the omft contract, using a memo that references a real Ethereum transaction hash and a message specifying the DAO as the receiver.
 * - Finally, it verifies that the DAO account received the correct token balance on NEAR, proving that the cross-chain deposit flow works as expected.
 *
 * This test serves as both documentation and a technical reference for implementing a user interface for NEAR intents deposits from other chains.
 */
test("deposit to near-intents from other chain", async ({ page }) => {
  test.setTimeout(120_000);
  const daoName = "testdao";

  const availableTokens = (
    await fetch("https://api-mng-console.chaindefuser.com/api/tokens").then(
      (r) => r.json()
    )
  ).items;
  const tokenId = availableTokens.find(
    (token) => token.defuse_asset_id === "nep141:eth.omft.near"
  ).defuse_asset_id;

  const supportedTokens = await fetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: "dontcare",
      jsonrpc: "2.0",
      method: "supported_tokens",
      params: [
        {
          chains: [
            "eth:1", // Ethereum Mainnet
          ],
        },
      ],
    }),
  }).then((r) => r.json());

  const nativeToken = supportedTokens.result.tokens[0];
  expect(nativeToken.near_token_id).toEqual("eth.omft.near");

  expect(tokenId).toEqual("nep141:eth.omft.near");

  const worker = await Worker.init();
  const mainnet = await connect({
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.fastnear.com",
  });

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

  await omftContract.call(
    omftContract.accountId,
    "deploy_token",
    {
      token: "eth",
      metadata: await omftMainnetAccount.viewFunction({
        contractId: nativeToken.near_token_id,
        methodName: "ft_metadata",
      }),
    },
    { attachedDeposit: parseNEAR("3"), gas: 300_000_000_000_000n.toString() }
  );

  // Import factory at the time testdao was created
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

  await omftContract.call(
    nativeToken.near_token_id,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: 1_500_0000000000_0000000000n.toString(),
    }
  );

  // Import factory at the time testdao was created
  const factoryContract = await worker.rootAccount.importContract({
    mainnetContract: SPUTNIK_DAO_FACTORY_ID,
  });

  await factoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "new",
    {},
    { gas: 300_000_000_000_000 }
  );

  // Create testdao

  const creatorAccount = await worker.rootAccount.createSubAccount(
    "testcreator"
  );

  const create_testdao_args = {
    name: daoName,
    args: Buffer.from(
      JSON.stringify({
        config: {
          name: daoName,
          purpose: "creating dao treasury",
          metadata: "",
        },
        policy: {
          roles: [
            {
              kind: {
                Group: [creatorAccount.accountId],
              },
              name: "Create Requests",
              permissions: [
                "call:AddProposal",
                "transfer:AddProposal",
                "config:Finalize",
              ],
              vote_policy: {},
            },
            {
              kind: {
                Group: [creatorAccount.accountId],
              },
              name: "Manage Members",
              permissions: [
                "config:*",
                "policy:*",
                "add_member_to_role:*",
                "remove_member_from_role:*",
              ],
              vote_policy: {},
            },
            {
              kind: {
                Group: [creatorAccount.accountId],
              },
              name: "Vote",
              permissions: ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
              vote_policy: {},
            },
          ],
          default_vote_policy: {
            weight_kind: "RoleWeight",
            quorum: "0",
            threshold: [1, 2],
          },
          proposal_bond: "100000000000000000000000",
          proposal_period: "604800000000000",
          bounty_bond: "100000000000000000000000",
          bounty_forgiveness_period: "604800000000000",
        },
      })
    ).toString("base64"),
  };

  await creatorAccount.call(
    SPUTNIK_DAO_FACTORY_ID,
    "create",
    create_testdao_args,
    {
      gas: 300_000_000_000_000,
      attachedDeposit: parseNEAR("6"),
    }
  );

  const daoAccount = new Account(`${daoName}.${SPUTNIK_DAO_FACTORY_ID}`);

  // Available tokens: https://api-mng-console.chaindefuser.com/api/tokens

  const depositAddress = (
    await fetch("https://bridge.chaindefuser.com/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "deposit_address",
        params: [
          {
            account_id: daoAccount,
            chain: "eth:1", // CHAIN_TYPE:CHAIN_ID
          },
        ],
      }),
    }).then((r) => r.json())
  ).result.address;
  expect(depositAddress).toEqual("0xC710Ddfde07A865CcEAd280f3b1C30a4F865d987");

  await omftContract.call(
    omftContract.accountId,
    "ft_deposit",
    {
      owner_id: "intents.near",
      token: "eth",
      amount: 1_000_000_000_000_000_000n.toString(),
      msg: JSON.stringify({ receiver_id: daoAccount }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "eth",
        chainId: "1",
        txHash:
          "0xc6b7ecd5c7517a8f56ac7ec9befed7d26a459fc97c7d5cd7598d4e19b5a806b7",
      })}`,
    },
    {
      attachedDeposit: parseNEAR("0.00125"),
      gas: 300_000_000_000_000n.toString(),
    }
  );

  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount.accountId,
      token_ids: [tokenId],
    })
  ).toEqual([1_000_000_000_000_000_000n.toString()]);

  await worker.tearDown();
});

/**
 * Note on the real deposit transaction test:
 *
 * One of the test cases refers to a real deposit transaction that occurred on Ethereum. In this test, the actual Ethereum transaction hash is used in the `memo` field when calling `ft_deposit` on the omft contract:
 *
 *   Ethereum txHash: 0x1718836745367397dd6906344a8d1ce4fcf34109ddae6403b8f07761d6df7fff
 *
 * This Ethereum transaction triggered a cross-chain deposit, which resulted in an `ft_deposit` transaction on NEAR. The corresponding NEAR transaction can be found here:
 *   https://nearblocks.io/txns/6F48rXLYCxRDP26i6BwhwrZPYZbJ2thpXqaJVorZ5Df4
 *
 * The test simulates the cross-chain deposit by providing the same parameters (including the txHash and receiver) as the real transaction, and then verifies that the correct NEAR account receives the expected token balance.
 *
 * To look up both transactions:
 *   - Use the Ethereum txHash above in a block explorer like https://etherscan.io/ to see the original deposit.
 *   - Use the NEAR transaction hash above in https://nearblocks.io/ to see the resulting deposit on NEAR.
 *
 * This approach allows the test to reproduce and validate the deposit flow as it happened in production, ensuring that the integration between Ethereum and NEAR via the bridge and intents contract works as expected. It also serves as a reference for how to handle real-world cross-chain deposits in a user interface or backend integration.
 */
test("deposit to near-intents from ethereum (referring to real deposit transaction)", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const availableTokens = (
    await fetch("https://api-mng-console.chaindefuser.com/api/tokens").then(
      (r) => r.json()
    )
  ).items;
  const tokenId = availableTokens.find(
    (token) => token.defuse_asset_id === "nep141:eth.omft.near"
  ).defuse_asset_id;

  const supportedTokens = await fetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: "dontcare",
      jsonrpc: "2.0",
      method: "supported_tokens",
      params: [
        {
          chains: [
            "eth:1", // Ethereum Mainnet
          ],
        },
      ],
    }),
  }).then((r) => r.json());

  const nativeToken = supportedTokens.result.tokens[0];
  expect(nativeToken.near_token_id).toEqual("eth.omft.near");

  expect(tokenId).toEqual("nep141:eth.omft.near");

  const worker = await Worker.init();
  const mainnet = await connect({
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.fastnear.com",
  });

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

  await omftContract.call(
    omftContract.accountId,
    "deploy_token",
    {
      token: "eth",
      metadata: await omftMainnetAccount.viewFunction({
        contractId: nativeToken.near_token_id,
        methodName: "ft_metadata",
      }),
    },
    { attachedDeposit: parseNEAR("3"), gas: 300_000_000_000_000n.toString() }
  );

  // Import factory at the time testdao was created
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

  await omftContract.call(
    nativeToken.near_token_id,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: 1_500_0000000000_0000000000n.toString(),
    }
  );

  const depositAccountId = "petersalomonsen.near";

  const depositAddress = (
    await fetch("https://bridge.chaindefuser.com/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "deposit_address",
        params: [
          {
            account_id: depositAccountId,
            chain: "eth:1", // CHAIN_TYPE:CHAIN_ID
          },
        ],
      }),
    }).then((r) => r.json())
  ).result.address;
  expect(depositAddress).toEqual("0xe18EFB7f81419bF1976aB48542F6E5047D885FB4");

  await omftContract.call(
    omftContract.accountId,
    "ft_deposit",
    {
      owner_id: "intents.near",
      token: "eth",
      amount: "10000000000000000",
      msg: '{"receiver_id":"' + depositAccountId + '"}',
      memo: 'BRIDGED_FROM:{"networkType":"eth","chainId":"1","txHash":"0x1718836745367397dd6906344a8d1ce4fcf34109ddae6403b8f07761d6df7fff"}',
    },
    {
      attachedDeposit: parseNEAR("0.00125"),
      gas: 300_000_000_000_000n.toString(),
    }
  );

  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: depositAccountId,
      token_ids: [tokenId],
    })
  ).toEqual([10000000000000000n.toString()]);

  await worker.tearDown();
});
