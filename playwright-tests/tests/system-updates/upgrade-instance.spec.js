import { expect } from "@playwright/test";
import { overlayMessage, removeOverlayMessage, test } from "../../util/test.js";
import { Worker, parseNEAR } from "near-workspaces";
import {
  PROPOSAL_BOND,
  SPUTNIK_DAO_FACTORY_ID,
  TREASURY_FACTORY_ACCOUNT_ID,
} from "../../util/sandboxrpc.js";
import { Indexer } from "../../util/indexer.js";
import { redirectWeb4 } from "../../util/web4.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";

test("should update treasury factory with new web4 contract and self upgrade instance", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(150_000);
  const socialNearContractId = "social.near";

  const worker = await Worker.init();
  const indexer = new Indexer(worker.provider.connection.url);
  await indexer.init();
  await indexer.attachIndexerRoutes(page);

  const creatorAccount = await worker.rootAccount.importContract({
    mainnetContract: "megha19.near",
  });

  const daoName = daoAccount.split(".")[0];
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

  const sputnikDaoFactoryContract = await worker.rootAccount.importContract({
    mainnetContract: SPUTNIK_DAO_FACTORY_ID,
  });
  await sputnikDaoFactoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "new",
    {},
    { gas: 300_000_000_000_000 }
  );

  await worker.rootAccount.transfer(creatorAccount.accountId, parseNEAR("100"));
  await creatorAccount.call(
    SPUTNIK_DAO_FACTORY_ID,
    "create",
    create_testdao_args,
    {
      gas: 300_000_000_000_000,
      attachedDeposit: parseNEAR("6"),
    }
  );

  const socialNear = await worker.rootAccount.importContract({
    mainnetContract: socialNearContractId,
  });
  await socialNear.call(socialNearContractId, "new", {});
  await socialNear.call(socialNearContractId, "set_status", { status: "Live" });

  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  const web4FactoryContract = await worker.rootAccount.importContract({
    mainnetContract: TREASURY_FACTORY_ACCOUNT_ID,
  });

  // The initial update that is already applied, so should automatically be dismissed when visiting the updates page
  const modifiedWidgets = {
    "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
    return [
      {
        id: 1,
        createdDate: "2025-03-28",
        version: "n/a",
        type: "Web4 Contract",
        summary: "Fixed dark theme, added lockup to all instances",
        details: "",
        votingRequired: false,
      }
  ];
  `,
  };

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });

  await page.goto(`https://${instanceAccount}.page/`);

  // Normal users should not see the update banner
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible();
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled({
    timeout: 20_000,
  });

  await page.locator("#dropdownIcon").click();
  await expect(await page.getByText("Select Gateway")).toBeVisible();
  await page.waitForTimeout(500);
  await page.locator("#dropdownIcon").click();

  await expect(page.getByText("Web4 Contract")).not.toBeVisible({
    timeout: 10_000,
  });

  // Visiting the updates page above should have automatically marked the web4 contract as up to date, and notification banner should disappear
  await page.goto(`https://${instanceAccount}.page/`);
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await overlayMessage(
    page,
    "Development team is deploying new treasury factory with updated web4 contract"
  );

  const result = await worker.provider.query({
    request_type: "view_code",
    account_id: TREASURY_FACTORY_ACCOUNT_ID,
    finality: "final",
  });
  const currentCode = Buffer.from(result.code_base64, "base64");
  // Convert the binary to a string and search for "Select Gateway"
  const searchString = "Select Gateway";
  const replaceString = "Gateway Select";

  const searchBuffer = Buffer.from(searchString, "utf-8");
  const replaceBuffer = Buffer.from(replaceString, "utf-8");

  const index = currentCode.indexOf(searchBuffer);
  if (index === -1) {
    console.error(`String "${searchString}" not found in the WASM binary.`);
    return;
  }

  // Replace the string in the binary
  replaceBuffer.copy(currentCode, index);

  // Deploy new treasury factory with updated web4 contract
  await web4FactoryContract.deploy(currentCode);
  await removeOverlayMessage(page);
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
      return [
        {
            id: 99999999,
            createdDate: "2025-04-05",
            version: "n/a",
            type: "Web4 Contract",
            summary: "contract update test",
            votingRequired: false
        }
    ];
    `,
    },
    callWidgetNodeURLForContractWidgets: false,
  });
  await page.goto(`https://${instanceAccount}.page/`);

  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(page.getByText("Web4 Contract")).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.reload();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(page.getByText("Web4 Contract")).not.toBeVisible({
    timeout: 10_000,
  });

  await page.locator("#dropdownIcon").click();
  await expect(await page.getByText("Gateway Select")).toBeVisible({
    timeout: 15_000,
  });

  await page.waitForTimeout(500);
  await page.goto(`https://${instanceAccount}.page/`);

  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await page.getByText("Settings").click();
  await page.getByText("System updates").click();
  await page.getByText("History").click();
  await expect(page.getByText("2025-04-05")).toBeVisible();
  await expect(page.getByText("99999999")).toBeVisible();
  await expect(page.getByText("contract update test")).toBeVisible();

  await page.waitForTimeout(500);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await worker.tearDown();
});
