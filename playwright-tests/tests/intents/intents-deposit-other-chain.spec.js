import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Account, parseNEAR, Worker } from "near-workspaces";
import { connect } from "near-api-js";
import { SPUTNIK_DAO_FACTORY_ID } from "../../util/sandboxrpc.js";

// DOCS: https://docs.near.org/tutorials/intents/deposit

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

  const ethTokenContract = await worker.rootAccount.importContract({
    mainnetContract: nativeToken.near_token_id,
  });

  const ethTokenMainnetAccount = await mainnet.account(
    ethTokenContract.accountId
  );
  await ethTokenContract.call(ethTokenContract.accountId, "new", {
    owner_id: ethTokenContract.accountId,
    total_supply: await ethTokenMainnetAccount.viewFunction({
      contractId: ethTokenContract.accountId,
      methodName: "ft_total_supply",
    }),
    metadata: await ethTokenMainnetAccount.viewFunction({
      contractId: ethTokenContract.accountId,
      methodName: "ft_metadata",
    }),
  });

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
            account_id: creatorAccount.accountId,
            chain: "eth:1", // CHAIN_TYPE:CHAIN_ID
          },
        ],
      }),
    }).then((r) => r.json())
  ).result.address;
  expect(depositAddress).toEqual("0x024A7281887f5a36688c6729942f1fF32424D245");

  await ethTokenContract.call(
    ethTokenContract.accountId,
    "ft_deposit",
    {
      owner_id: creatorAccount.accountId,
      amount: 10_000_000_000_000_000_000n.toString(),
    },
    { attachedDeposit: 1_500_0000000000_0000000000n.toString() }
  );

  await ethTokenContract.call(
    ethTokenContract.accountId,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: 1_500_0000000000_0000000000n.toString(),
    }
  );

  await creatorAccount.call(
    ethTokenContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: "intents.near",
      amount: 1_000_000_000_000_000_000n.toString(),
      msg: "",
    },
    { attachedDeposit: "1", gas: 50_000_000_000_000n.toString() }
  );

  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: creatorAccount.accountId,
      token_ids: [tokenId],
    })
  ).toEqual([1_000_000_000_000_000_000n.toString()]);

  await creatorAccount.call(
    intentsContract,
    "mt_transfer",
    {
      receiver_id: daoAccount.accountId,
      amount: 1_000_000_000_000_000_000n.toString(),
      token_id: tokenId,
    },
    {
      attachedDeposit: "1",
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
