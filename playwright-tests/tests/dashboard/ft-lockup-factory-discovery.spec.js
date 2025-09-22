import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  FT_FACTORY_LOCKUP_CONTRACT_ID,
  SandboxRPC,
} from "../../util/sandboxrpc.js";

async function mockFtMetadata({ page }) {
  await page.route(/.*ft-token-metadata.*/, async (route) => {
    await route.fulfill({
      json: {
        contract: "usdt.tether-token.near",
        name: "Tether USD",
        symbol: "USDt",
        decimals: 6,
        icon: "",
        price: "1",
      },
    });
  });
}

test("should discover FT lockup instances created by factory contract using sandbox", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(210_000);

  const sandbox = new SandboxRPC();
  await sandbox.init();
  await sandbox.attachRoutes(page);

  const daoName = daoAccount.split(".")[0];
  await sandbox.setupSandboxForSputnikDao(daoName);

  const ftContract = await sandbox.near.account("usdt.tether-token.near");
  const lockupFactory = await sandbox.near.account(
    FT_FACTORY_LOCKUP_CONTRACT_ID
  );
  const createdLockupInstance = await sandbox.near.account(
    `test-lockup-instance.${FT_FACTORY_LOCKUP_CONTRACT_ID}`
  );

  // Add the DAO account to the lockup instance
  const startTimestamp = Math.floor(Date.now() / 1000).toString();
  await sandbox.account.functionCall({
    contractId: createdLockupInstance.accountId,
    methodName: "add_account",
    args: {
      account_id: daoAccount,
      start_timestamp: startTimestamp,
      session_interval: "86400",
      session_num: 5,
      release_per_session: "20000000", // 20 USDT
    },
  });

  // Register storage for FT contract (for lockup instance)
  await sandbox.account.functionCall({
    contractId: ftContract.accountId,
    methodName: "storage_deposit",
    args: {
      account_id: createdLockupInstance.accountId,
      registration_only: true,
    },
    attachedDeposit: BigInt(0.00125 * 10 ** 24),
    gas: "300000000000000",
  });

  // Transfer FT tokens to the lockup instance
  await sandbox.account.functionCall({
    contractId: ftContract.accountId,
    methodName: "ft_transfer_call",
    args: {
      receiver_id: createdLockupInstance.accountId,
      amount: "100000000", // 100 USDT
      msg: daoAccount,
    },
    attachedDeposit: "1",
    gas: "300000000000000",
  });

  await mockFtMetadata({ page });
  await page.goto(`/${instanceAccount}/widget/app`);
  await page.waitForTimeout(5_000);

  // Verify that the FT lockup portfolio is discovered and displayed
  await expect(
    page.getByText("Wallet: " + createdLockupInstance.accountId)
  ).toBeVisible();

  // Verify the lockup details are shown
  await expect(page.getByText("Original Allocated Amount")).toBeVisible();
  await expect(page.getByText("$100.00")).toBeVisible(); // 100 USDT

  // Expand the details
  await page.getByText("Original Allocated Amount").click();

  // Verify expanded details
  await expect(page.getByText("Unreleased 100 USDt")).toBeVisible();
  await expect(page.getByText("Unclaimed 0 USDt")).toBeVisible();
  await expect(page.getByText("Claimed 0 USDt", { exact: true })).toBeVisible();

  // Verify lockup details
  await expect(page.getByText("Start Date")).toBeVisible();
  await expect(page.getByText("Rounds")).toBeVisible();
  await expect(page.getByText("0 / 5")).toBeVisible();
  await expect(page.getByText("Release Interval")).toBeVisible();
  await expect(page.getByText("Every day")).toBeVisible();
  await expect(page.getByText("Next Claim Date")).toBeVisible();

  // Verify no claim funds section (since unclaimed is 0)
  await expect(
    page.getByText("🎉 You have funds available to claim")
  ).not.toBeVisible();

  await sandbox.quitSandbox();
});
