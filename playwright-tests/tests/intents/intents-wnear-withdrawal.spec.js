/**
 * This test verifies how wNEAR withdrawal should work through the intents contract
 * without UI complexity - just direct contract calls.
 */

import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Account, parseNEAR, Worker } from "near-workspaces";
import { connect } from "near-api-js";
import {
  PROPOSAL_BOND,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc.js";

test("create payment request to transfer wNEAR to NEAR account", async () => {
  test.setTimeout(120_000);
  const daoName = "testdao";

  const worker = await Worker.init();

  // Set up wNEAR contract
  const wrapNearContract = await worker.rootAccount.importContract({
    mainnetContract: "wrap.near",
  });

  await wrapNearContract.call(wrapNearContract.accountId, "new", {
    owner_id: wrapNearContract.accountId,
    total_supply: parseNEAR("1000000000"),
    metadata: {
      spec: "ft-1.0.0",
      name: "Wrapped NEAR fungible token",
      symbol: "wNEAR",
      decimals: 24,
    },
  });

  // Set up intents contract
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

  // Register storage for intents contract on wNEAR
  await intentsContract.call(
    wrapNearContract.accountId,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: parseNEAR("0.01"),
    }
  );

  // Import factory
  const factoryContract = await worker.rootAccount.importContract({
    mainnetContract: SPUTNIK_DAO_FACTORY_ID,
  });

  await factoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "new",
    {},
    { gas: 300_000_000_000_000 }
  );

  // Create creator account and fund it
  const creatorAccount = await worker.rootAccount.createSubAccount(
    "testcreator"
  );

  // Fund the creator account so it can make deposits
  await worker.rootAccount.transfer(creatorAccount.accountId, parseNEAR("150"));

  // Create recipient account that will receive wNEAR
  const recipientAccount = await worker.rootAccount.createSubAccount(
    "recipient"
  );

  // Register storage for recipient on wNEAR contract
  await recipientAccount.call(
    wrapNearContract.accountId,
    "storage_deposit",
    {
      account_id: recipientAccount.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: parseNEAR("0.01"),
    }
  );

  // Deposit NEAR into wNEAR contract to get wNEAR tokens
  await creatorAccount.call(
    wrapNearContract.accountId,
    "near_deposit",
    {},
    { attachedDeposit: parseNEAR("100") }
  );

  // Create DAO
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

  // Transfer wNEAR to intents contract for the DAO using ft_transfer_call
  await creatorAccount.call(
    wrapNearContract.accountId,
    "ft_transfer_call",
    {
      receiver_id: intentsContract.accountId,
      amount: parseNEAR("50"), // 50 wNEAR
      msg: JSON.stringify({ receiver_id: daoAccount.accountId }),
    },
    { attachedDeposit: "1", gas: "50000000000000" }
  );

  // Verify that the DAO has wNEAR balance in intents contract
  const initialIntentsBalance = await intentsContract.view("mt_balance_of", {
    account_id: daoAccount.accountId,
    token_id: "nep141:wrap.near",
  });
  expect(initialIntentsBalance).toBe(parseNEAR("50"));
  console.log("DAO wNEAR balance in intents:", initialIntentsBalance);

  // Get initial wNEAR balance of recipient
  const initialRecipientBalance = await wrapNearContract.view("ft_balance_of", {
    account_id: recipientAccount.accountId,
  });
  console.log("Recipient initial wNEAR balance:", initialRecipientBalance);

  // Create proposal to withdraw wNEAR to recipient account
  const proposalId = await creatorAccount.call(
    daoAccount.accountId,
    "add_proposal",
    {
      proposal: {
        description: "Transfer wNEAR to recipient",
        kind: {
          FunctionCall: {
            receiver_id: intentsContract.accountId,
            actions: [
              {
                method_name: "ft_withdraw",
                args: Buffer.from(
                  JSON.stringify({
                    token: "wrap.near",
                    receiver_id: recipientAccount.accountId, // Direct transfer to NEAR account
                    amount: parseNEAR("25"), // 25 wNEAR
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

  console.log("Created proposal ID:", proposalId);

  // Vote and execute the proposal
  const result = await creatorAccount.callRaw(
    daoAccount.accountId,
    "act_proposal",
    {
      id: proposalId,
      action: "VoteApprove",
    },
    {
      gas: 300_000_000_000_000n.toString(),
    }
  );

  console.log(
    "Proposal execution result:",
    result.failed ? "FAILED" : "SUCCESS"
  );
  if (result.failed) {
    console.log("Failure reason:", result.receiptFailures);
  }

  expect(result.failed).toBeFalsy();

  // Check final balances
  const finalIntentsBalance = await intentsContract.view("mt_balance_of", {
    account_id: daoAccount.accountId,
    token_id: "nep141:wrap.near",
  });

  const finalRecipientBalance = await wrapNearContract.view("ft_balance_of", {
    account_id: recipientAccount.accountId,
  });

  console.log("DAO final wNEAR balance in intents:", finalIntentsBalance);
  console.log("Recipient final wNEAR balance:", finalRecipientBalance);

  // Verify the withdrawal worked
  expect(finalIntentsBalance).toBe(parseNEAR("25")); // 50 - 25 = 25
  expect(finalRecipientBalance).toBe(parseNEAR("25")); // 0 + 25 = 25

  await worker.tearDown();
});
