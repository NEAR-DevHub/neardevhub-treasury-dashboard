import { test, expect } from "@playwright/test";
import { Worker } from "near-workspaces";
import nearApi from "near-api-js";
import { redirectWeb4 } from "../../util/web4";
import {
  setPageAuthSettings,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc";
import crypto from "crypto";
import { cacheCDN } from "../../util/test";

test("update infinex.sputnik-dao.near", async ({ page }) => {
  test.setTimeout(120_000);
  const daoName = "infinex";
  const daoContractId = `${daoName}.${SPUTNIK_DAO_FACTORY_ID}`;
  const web4ContractId = "treasury-infinex.near";
  const socialNearContractId = "social.near";

  await cacheCDN(page);

  const worker = await Worker.init();

  // Import factory at the time infinex was created
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

  // Create infinex

  const creatorAccount = await worker.rootAccount.importContract({
    mainnetContract: "megha19.near",
  });

  const userAccount = await worker.rootAccount.importContract({
    mainnetContract: "kmao.near",
  });
  const userAccount2 = await worker.rootAccount.importContract({
    mainnetContract: "theori.near",
  });

  const create_infinex_args = {
    name: "infinex",
    args: Buffer.from(
      JSON.stringify({
        purpose:
          "The safest way to get onchain\nYour Infinex Account is the easiest way to access the world of DeFi with robust multi-chain support, and unrivalled, non-custodial security.",
        bond: "100000000000000000000000",
        vote_period: "604800000000000",
        grace_period: "86400000000000",
        policy: {
          roles: [
            {
              name: "council",
              kind: {
                Group: [
                  creatorAccount.accountId,
                  userAccount.accountId,
                  userAccount2.accountId,
                ],
              },
              permissions: ["*:*"],
              vote_policy: {},
            },
            {
              name: "Create Requests",
              kind: {
                Group: [],
              },
              permissions: ["transfer:AddProposal", "call:AddProposal"],
              vote_policy: {},
            },
            {
              name: "Manage Members",
              kind: {
                Group: [],
              },
              permissions: [
                "remove_member_from_role:*",
                "add_member_to_role:*",
                "config:*",
                "policy:*",
              ],
              vote_policy: {},
            },
            {
              name: "Vote",
              kind: {
                Group: [],
              },
              permissions: ["*:VoteApprove", "*:VoteReject", "*:VoteRemove"],
              vote_policy: {
                config: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                policy: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                add_bounty: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                bounty_done: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                transfer: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                vote: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                remove_member_from_role: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                add_member_to_role: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                call: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                upgrade_self: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                upgrade_remote: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
                set_vote_token: {
                  quorum: "0",
                  threshold: [18, 100],
                  weight_kind: "RoleWeight",
                },
              },
            },
          ],
          default_vote_policy: {
            weight_kind: "RoleWeight",
            quorum: "0",
            threshold: [1, 2],
          },
          proposal_bond: "0",
          proposal_period: "604800000000000",
          bounty_bond: "100000000000000000000000",
          bounty_forgiveness_period: "604800000000000",
        },
        config: {
          purpose:
            "The safest way to get onchain\nYour Infinex Account is the easiest way to access the world of DeFi with robust multi-chain support, and unrivalled, non-custodial security.",
          name: "infinex",
          metadata:
            "eyJzb3VsQm91bmRUb2tlbklzc3VlciI6IiIsImxpbmtzIjpbImh0dHBzOi8vaW5maW5leC54eXovIl0sImZsYWdDb3ZlciI6Imh0dHBzOi8vaXBmcy5uZWFyLnNvY2lhbC9pcGZzL2JhZnliZWlhd3c0am9zcDdzcWh0dGVjdGJnMzZmczJpcGp3Y25kMmpzeXNkcnh4N3NqeTRkdjNnd3BxIiwiZmxhZ0xvZ28iOiJodHRwczovL2lwZnMubmVhci5zb2NpYWwvaXBmcy9iYWZrcmVpaHB6Znk3am9lc3N1dGVsZnZ0MjZxcXJkeng3M3NoaHZvZGVoMnkyN3N2dmlqbGVtZGd5bSIsImRpc3BsYXlOYW1lIjoiSW5maW5leCIsImxlZ2FsIjp7ImxlZ2FsU3RhdHVzIjoiIiwibGVnYWxMaW5rIjoiIn19",
        },
      })
    ).toString("base64"),
  };

  await creatorAccount.call(
    SPUTNIK_DAO_FACTORY_ID,
    "create",
    create_infinex_args,
    {
      gas: 300_000_000_000_000,
      attachedDeposit: nearApi.utils.format.parseNearAmount("6"),
    }
  );

  // Deploy the latest factory

  const sputnikDaoFactoryContractBytes = await fetch(
    "https://github.com/near-daos/sputnik-dao-contract/raw/refs/heads/main/sputnikdao-factory2/res/sputnikdao_factory2.wasm"
  ).then((r) => r.arrayBuffer());
  await factoryContract.deploy(sputnikDaoFactoryContractBytes);

  // Upload the latest sputnik dao contract

  const sputnikDaoContractBytes = Buffer.from(
    await fetch(
      "https://github.com/near-daos/sputnik-dao-contract/raw/refs/heads/main/sputnikdao2/res/sputnikdao2.wasm"
    ).then((r) => r.arrayBuffer())
  );
  await factoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "store",
    sputnikDaoContractBytes,
    {
      gas: 300000000000000,
      attachedDeposit: nearApi.utils.format.parseNearAmount("10"),
    }
  );

  // compute the hash of the new wasm and set_default_code_hash

  const codeHash = crypto
    .createHash("sha256")
    .update(sputnikDaoContractBytes)
    .digest("hex");

  const base58CodeHash = nearApi.utils.serialize.base_encode(
    Buffer.from(codeHash, "hex")
  );

  await factoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "set_default_code_hash",
    { code_hash: base58CodeHash },
    {
      gas: 300000000000000,
      attachedDeposit: nearApi.utils.format.parseNearAmount("3"),
    }
  );

  await worker.rootAccount.importContract({ mainnetContract: web4ContractId });

  const socialNear = await worker.rootAccount.importContract({
    mainnetContract: socialNearContractId,
  });
  await socialNear.call(socialNearContractId, "new", {});
  await socialNear.call(socialNearContractId, "set_status", { status: "Live" });

  await redirectWeb4({
    page,
    contractId: web4ContractId,
    treasury: daoContractId,
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
        return [
          {
            id: 1,
            createdDate: "2025-04-27",
            version: "n/a",
            type: "DAO contract",
            summary: "Update to latest sputnik-dao contract",
            details: "",
            votingRequired: true,
          }
      ];
      `,
    },
  });

  await page.goto(`https://${web4ContractId}.page/`);
  await setPageAuthSettings(
    page,
    userAccount.accountId,
    await userAccount.getKey()
  );

  await page.getByText("Review").click();

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.goto(
    `https://${web4ContractId}.page/?page=settings&tab=pending-requests`
  );

  await expect(
    await page.getByText("Upgrade sputnik-dao contract")
  ).toBeVisible();
  await page.getByRole("button", { name: "Details" }).click();
  await expect(
    await page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(await page.getByText("Confirm your vote")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(await page.getByText("Confirm transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(await page.getByText("Awaiting transaction")).not.toBeVisible({
    timeout: 15_000,
  });

  await setPageAuthSettings(
    page,
    userAccount2.accountId,
    await userAccount2.getKey()
  );

  await page.goto(
    `https://${web4ContractId}.page/?page=settings&tab=pending-requests`
  );

  await expect(
    await page.getByText("Upgrade sputnik-dao contract")
  ).toBeVisible();
  await page.getByRole("button", { name: "Details" }).click();
  await expect(
    await page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(await page.getByText("Confirm your vote")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(await page.getByText("Confirm transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(await page.getByText("Awaiting transaction")).not.toBeVisible({
    timeout: 15_000,
  });

  await expect(
    await page.getByText("The request has been successfully executed")
  ).toBeVisible({
    timeout: 15_000,
  });

  // Wait for transaction to finalize
  await page.waitForTimeout(2000);

  await page.goto(
    `https://${web4ContractId}.page/?page=settings&tab=system-updates`
  );

  await expect(await page.getByText("Available Updates")).toBeEnabled();
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible({ timeout: 15_000 });

  await page.getByText("Available Updates").click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).not.toBeVisible();

  await page.getByText("History").click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible();

  // Test some functionality
  await page.getByRole("link", { name: "Voting Duration" }).click();
  await page.getByPlaceholder("Enter voting duration days").click();
  await page.getByPlaceholder("Enter voting duration days").fill("10");
  await page.getByRole("button", { name: "Submit Request" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("link", { name: "View it" }).click();
  await expect(await page.getByText("Update policy - Voting")).toBeVisible();

  // Tear down

  await page.waitForTimeout(500);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await worker.tearDown();
});
