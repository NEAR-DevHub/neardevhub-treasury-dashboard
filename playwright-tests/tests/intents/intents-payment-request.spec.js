import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Account, parseNEAR, Worker } from "near-workspaces";
import { connect } from "near-api-js";
import {
  PROPOSAL_BOND,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc.js";

/**
 * The approach of calling `ft_withdraw`was verified manually like this.
 * near contract call-function as-transaction intents.near ft_withdraw json-args '{"receiver_id": "eth.omft.near", "amount": "10000000000000000", "token": "eth.omft.near", "memo": "WITHDRAW_TO:0xa029Ca6D14b97749889702eE16E7d168a1094aFE"}' prepaid-gas '100.0 Tgas' attached-deposit '1 yoctoNEAR' sign-as petersalomonsen.near network-config mainnet sign-with-keychain send
 *
 * It resulted in this transaction on NEAR: https://nearblocks.io/txns/HibaVVqfuNSDUyAeoNwSv7o83Vk6eGgonmygwiGTUdK9
 * And finally this on ETH: https://etherscan.io/tx/0x87ac2955fec4f0bfb039548397343f549e5736f5207e207f1b70991d57042e35
 *
 */
test("create payment request to transfer BTC", async ({ page }) => {
  test.setTimeout(120_000);
  const daoName = "testdao";

  const availableTokens = (
    await fetch("https://api-mng-console.chaindefuser.com/api/tokens").then(
      (r) => r.json()
    )
  ).items;
  const tokenId = availableTokens.find(
    (token) => token.defuse_asset_id === "nep141:btc.omft.near"
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
            "btc:mainnet", // Ethereum Mainnet
          ],
        },
      ],
    }),
  }).then((r) => r.json());

  const nativeToken = supportedTokens.result.tokens[0];
  expect(nativeToken.near_token_id).toEqual("btc.omft.near");

  expect(tokenId).toEqual("nep141:btc.omft.near");

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
      token: "btc",
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
          proposal_bond: PROPOSAL_BOND,
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
            chain: "btc:mainnet", // CHAIN_TYPE:CHAIN_ID
          },
        ],
      }),
    }).then((r) => r.json())
  ).result.address;

  expect(depositAddress).toEqual("1JBmcrzAPeAeQA9CRAuYEoKSE6RN8hu59x");

  await omftContract.call(
    omftContract.accountId,
    "ft_deposit",
    {
      owner_id: "intents.near",
      token: "btc",
      amount: 32_000_000_000_000_000_000n.toString(),
      msg: JSON.stringify({ receiver_id: daoAccount }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "btc",
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
  ).toEqual([32_000_000_000_000_000_000n.toString()]);

  const proposalId = await creatorAccount.call(
    daoAccount.accountId,
    "add_proposal",
    {
      proposal: {
        description: "Transfer BTC",
        kind: {
          FunctionCall: {
            receiver_id: intentsContract.accountId,
            actions: [
              {
                method_name: "ft_withdraw",
                args: Buffer.from(
                  JSON.stringify({
                    token: nativeToken.near_token_id, // This is btc.omft.near
                    receiver_id: nativeToken.near_token_id, // Should also be btc.omft.near
                    amount: 1_000_000_000_000_000_000n.toString(),
                    memo: "WITHDRAW_TO:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // Correct: BTC address here
                  })
                ).toString("base64"),
                deposit: 1n.toString(),
                gas: 30_000_000_000_000n.toString(),
              },
            ],
          },
        },
      },
    },
    {
      attachedDeposit: PROPOSAL_BOND,
    }
  );

  const result = await creatorAccount.callRaw(
    daoAccount.accountId,
    "act_proposal",
    {
      id: proposalId,
      action: "VoteApprove",
    },
    {
      gas: 300_000_000_000_000n.toString(), // Ensure enough gas for voting and potential execution
    }
  );

  expect(
    result.logsContain(
      `EVENT_JSON:{"standard":"nep245","version":"1.0.0","event":"mt_burn","data":[{"owner_id":"testdao.sputnik-dao.near","token_ids":["nep141:btc.omft.near"],"amounts":["1000000000000000000"],"memo":"withdraw"}]}`
    )
  ).toBeTruthy();
  expect(
    result.logsContain(
      `EVENT_JSON:{"standard":"nep141","version":"1.0.0","event":"ft_burn","data":[{"owner_id":"intents.near","amount":"1000000000000000000","memo":"WITHDRAW_TO:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"}]}`
    )
  ).toBeTruthy();
  expect(result.failed).toBeFalsy();

  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount.accountId,
      token_ids: [tokenId],
    })
  ).toEqual([31_000_000_000_000_000_000n.toString()]);

  await worker.tearDown();
});
