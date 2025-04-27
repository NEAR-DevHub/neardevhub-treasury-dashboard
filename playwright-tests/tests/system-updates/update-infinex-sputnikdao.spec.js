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
  const daoContractId = "infinex.sputnik-dao.near";
  const web4ContractId = "treasury-infinex.near";
  const socialNearContractId = "social.near";

  await cacheCDN(page);
  const worker = await Worker.init();

  await worker.rootAccount.importContract({
    mainnetContract: daoContractId,
    withData: true,
    blockId: 130_365_841,
  });

  const factoryContract = await worker.rootAccount.importContract({
    mainnetContract: "sputnik-dao.near",
  });
  const sputnikDaoFactoryContractBytes = await fetch(
    "https://github.com/near-daos/sputnik-dao-contract/raw/refs/heads/main/sputnikdao-factory2/res/sputnikdao_factory2.wasm"
  ).then((r) => r.arrayBuffer());
  await factoryContract.call(
    SPUTNIK_DAO_FACTORY_ID,
    "new",
    {},
    { gas: 300000000000000 }
  );
  await factoryContract.deploy(sputnikDaoFactoryContractBytes);

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
  const userAccount = await worker.rootAccount.importContract({
    mainnetContract: "kmao.near",
  });
  const userAccount2 = await worker.rootAccount.importContract({
    mainnetContract: "theori.near",
  });

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

  await page.goto(
    `https://${web4ContractId}.page/?page=settings&tab=system-updates`
  );
  await page.waitForTimeout(500);
  await expect(await page.getByText("Available Updates")).toBeEnabled();
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible({ timeout: 15_000 });

  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).not.toBeVisible();

  await page.getByText("History").click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible();

  await page.waitForTimeout(500);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await worker.tearDown();
});
