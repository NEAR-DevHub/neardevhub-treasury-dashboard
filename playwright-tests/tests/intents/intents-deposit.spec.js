import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker } from "near-workspaces";
import nearApi from "near-api-js";
import { redirectWeb4 } from "../../util/web4";
import {
  setPageAuthSettings,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc";
import crypto from "crypto";


// DOCS: https://docs.near.org/tutorials/intents/deposit


test("deposit to near-intents for testdao.sputnik-dao.near", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const daoName = "testdao";

  const worker = await Worker.init();

  // Import factory at the time testdao was created
  const intentsContract = await worker.rootAccount.importContract({
    mainnetContract: "intents.near"
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


  // Available tokens: https://api-mng-console.chaindefuser.com/api/tokens

  await worker.tearDown();
});
