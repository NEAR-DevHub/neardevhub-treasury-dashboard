import { expect } from "@playwright/test";
import { test } from "../util/test.js";
import { getTransactionModalObject } from "../util/transaction.js";
import { SandboxRPC } from "../util/sandboxrpc.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("admin connected", function () {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should go to treasury self creation page", async ({
    page,
    factoryAccount,
  }) => {
    const accName = Math.random().toString(36).slice(2, 7);

    const setupSandboxTxnProcessing = async () => {
      // const sandbox = new SandboxRPC();
      // await sandbox.init();
      // await sandbox.attachRoutes(page);
    };

    // innitial step
    await page.goto(`/${factoryAccount}/widget/app`);
    await expect(
      await page.locator("h3", { hasText: "Confirm your wallet" })
    ).toBeVisible();
    await page
      .locator("a.active", {
        hasText: "Yes, use this wallet and continue",
      })
      .click();

    // create application account name step
    await expect(
      await page.locator("h3", { hasText: "Create Application Account" })
    ).toBeVisible();
    await page.locator("input.account-input").fill(accName);
    await page.locator("a", { hasText: "Next" }).click();

    // create sputnik dao account step
    await expect(
      await page.locator("h3", { hasText: "Create Sputnik DAO Account" })
    ).toBeVisible();
    await page.locator("input.account-input").fill(accName);
    await page.locator("a", { hasText: "Next" }).click();

    // add members step
    await expect(
      await page.locator("h3", { hasText: "Add Members" })
    ).toBeVisible();
    await page.locator("a", { hasText: "Next" }).click();

    // confirm transaction step
    await expect(
      await page.locator("h3", { hasText: "Summary" })
    ).toBeVisible();

    const submitBtn = page.locator("button", { hasText: "Confirm and Create" });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // bos txn confirmation modal
    await expect(
      await page.locator(".modal-title h4", { hasText: "Confirm Transaction" })
    ).toBeVisible();
    await page.locator("button", { hasText: "Confirm" }).click();

    await setupSandboxTxnProcessing();
  });
});
