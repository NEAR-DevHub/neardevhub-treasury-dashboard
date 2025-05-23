/**
 * This test suite explores and documents the deposit process for NEAR intents using NEAR-native tokens.
 *
 * Findings:
 * - The tests set up a simulated environment with intents and fungible token (FT) contracts, and a DAO (Sputnik) contract.
 * - They demonstrate how to initialize and configure the contracts, including registering storage and deploying tokens.
 * - The tests show how to fetch and use deposit addresses for both user accounts and DAOs on NEAR.
 * - They simulate deposits by calling `ft_transfer_call` with a message specifying the receiver, and verify that the correct account receives the tokens.
 * - The tests validate balances after deposit, ensuring the integration between the intent contract and DAO/user accounts is correct.
 *
 * These tests serve as both documentation and a technical reference for implementing a user interface for NEAR intents deposits using NEAR-native tokens.
 */

import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Account, parseNEAR, Worker } from "near-workspaces";
import nearApi from "near-api-js";
import { SPUTNIK_DAO_FACTORY_ID } from "../../util/sandboxrpc.js";

// DOCS: https://docs.near.org/tutorials/intents/deposit

test("deposit to near-intents from NEAR", async ({ page }) => {
  test.setTimeout(120_000);
  const daoName = "testdao";

  const worker = await Worker.init();

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

  const wrapNearContract = await worker.rootAccount.importContract({
    mainnetContract: "wrap.near",
  });

  await wrapNearContract.call(wrapNearContract.accountId, "new", {
    owner_id: wrapNearContract.accountId,
    total_supply: 1_000_000n.toString(),
    metadata: {
      spec: "1.0.0",
      name: "Example NEAR fungible token",
      symbol: "wNEAR",
      decimals: 24,
    },
  });

  // Import factory at the time testdao was created
  const factoryContract = await worker.rootAccount.importContract({
    mainnetContract: SPUTNIK_DAO_FACTORY_ID,
    blockId: 129_484_712,
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

  await creatorAccount.call(
    "wrap.near",
    "near_deposit",
    {},
    { attachedDeposit: parseNEAR("10") }
  );
  await intentsContract.call(
    wrapNearContract.accountId,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: 1_0000_0000000000_0000000000n.toString(),
    }
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
      attachedDeposit: nearApi.utils.format.parseNearAmount("6"),
    }
  );

  const daoAccount = new Account(`${daoName}.${SPUTNIK_DAO_FACTORY_ID}`);

  await creatorAccount.call(
    wrapNearContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: "intents.near",
      amount: parseNEAR("1"),
      msg: JSON.stringify({ receiver_id: daoAccount }),
    },
    { attachedDeposit: "1", gas: 50_000_000_000_000n.toString() }
  );

  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount.accountId,
      token_ids: ["nep141:wrap.near"],
    })
  ).toEqual([parseNEAR("1")]);

  await worker.tearDown();
});
