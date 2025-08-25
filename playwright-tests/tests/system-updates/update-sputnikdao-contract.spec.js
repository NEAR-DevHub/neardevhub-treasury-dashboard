import { expect } from "@playwright/test";
import { overlayMessage, removeOverlayMessage, test } from "../../util/test.js";
import { Worker, parseNEAR } from "near-workspaces";
import {
  PROPOSAL_BOND,
  SPUTNIK_DAO_FACTORY_ID,
} from "../../util/sandboxrpc.js";
import nearApi from "near-api-js";
import crypto from "crypto";
import { Indexer } from "../../util/indexer.js";
import { redirectWeb4 } from "../../util/web4.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";

test("should update sputnik-dao contract", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(180_000);
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

  const modifiedWidgets = {
    "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `  return [
    {
      id: 1,
      createdDate: "2025-03-25",
      version: "n/a",
      type: "DAO contract",
      summary: "Update to latest sputnik-dao contract",
      details: "",
      votingRequired: true,
    }
];`,
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
  await page.goto(`https://${instanceAccount}.page`);

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

  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).not.toBeVisible({
    timeout: 10_000,
  });

  await page.goto(`https://${instanceAccount}.page/`);
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await overlayMessage(
    page,
    "Development team is uploading a new sputnik-dao contract"
  );

  const result = await worker.provider.query({
    request_type: "view_code",
    account_id: daoAccount,
    finality: "final",
  });
  const currentCode = Buffer.from(result.code_base64, "base64");
  const versionResult = (
    await worker.provider.viewCall(
      daoAccount,
      "version",
      {},
      { finality: "final" }
    )
  ).result;

  const version = Buffer.from(versionResult, "base64").toString("utf-8");

  // Convert the binary to a string and search for "Select Gateway"
  const searchString = version;
  const replaceString = "1" + version.substring(0, version.length - 1);

  const searchBuffer = Buffer.from(searchString, "utf-8");
  const replaceBuffer = Buffer.from(replaceString, "utf-8");

  const index = currentCode.indexOf(searchBuffer);
  if (index === -1) {
    console.error(`String "${searchString}" not found in the WASM binary.`);
    return;
  }

  // Replace the string in the binary
  replaceBuffer.copy(currentCode, index);

  // Store the new wasm in the factory
  await sputnikDaoFactoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "store",
    currentCode,
    {
      gas: 300000000000000,
      attachedDeposit: parseNEAR("10"),
    }
  );

  // compute the hash of the new wasm and set_default_code_hash
  const codeHash = crypto
    .createHash("sha256")
    .update(currentCode)
    .digest("hex");

  const base58CodeHash = nearApi.utils.serialize.base_encode(
    Buffer.from(codeHash, "hex")
  );

  await sputnikDaoFactoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "set_default_code_hash",
    { code_hash: base58CodeHash },
    {
      gas: 300000000000000,
      attachedDeposit: parseNEAR("3"),
    }
  );

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
        id: 2,
        createdDate: "2025-04-25",
        version: "n/a",
        type: "DAO contract",
        summary: "Update to latest sputnik-dao contract",
        details: "",
        votingRequired: true,
      }
  ];
  `,
    },
    callWidgetNodeURLForContractWidgets: false,
  });
  await removeOverlayMessage(page);
  await page.goto(`https://${instanceAccount}.page/`);

  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.reload();
  await expect(
    await page.getByRole("button", { name: "Review", disabled: true })
  ).toBeVisible();
  await expect(
    page.getByText("New system updates published")
  ).not.toBeVisible();

  await page.goto(
    `https://${instanceAccount}.page/?page=settings&tab=pending-requests`
  );

  await expect(
    await page.getByText("Upgrade sputnik-dao contract")
  ).toBeVisible();

  await page.getByTestId("proposal-request-#0").click();
  await page.getByRole("button", { name: "Reject" }).nth(1).click();
  await expect(
    await page.getByRole("heading", { name: "Confirm your vote" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(await page.getByText("Confirm transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(await page.getByText("Awaiting transaction")).not.toBeVisible({
    timeout: 15_000,
  });

  // After the upgrade proposal was rejected, it should be possible to create a new upgrade proposal based on the same update

  await page.goto(
    `https://${instanceAccount}.page/?page=settings&tab=system-updates`
  );

  await expect(page.getByText("New system update published")).toBeVisible();
  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.reload();
  await expect(
    await page.getByRole("button", { name: "Review", disabled: true })
  ).toBeVisible();
  await expect(
    page.getByText("New system updates published")
  ).not.toBeVisible();

  await page.goto(`https://${instanceAccount}.page/?page=settings&id=1`);

  await expect(
    await page.getByText("Upgrade sputnik-dao contract")
  ).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(await page.getByText("Confirm your vote")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(await page.getByText("Confirm transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(await page.getByText("Awaiting transaction")).not.toBeVisible({
    timeout: 15_000,
  });
  // The update should now have been moved to the history

  await page.goto(
    `https://${instanceAccount}.page/?page=settings&tab=system-updates`
  );
  await page.waitForTimeout(500);
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
  ).toBeVisible({ timeout: 15_000 });

  await page.waitForTimeout(500);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await worker.tearDown();
});
