import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction";
import { mockNearBalances, updateDaoPolicyMembers } from "../../util/rpcmock";
import { getInstanceConfig } from "../../util/config.js";
import { mockInventory } from "../../util/inventory.js";
import { mockPikespeakFTTokensResponse } from "../../util/pikespeak.js";
import { mockNearPrice } from "../../util/nearblocks.js";
import { focusInputReplaceAndBlur } from "../../util/forms.js";
import { formatTimestamp, isMac, roles, toBase64 } from "../../util/lib.js";

const START_DATE = "2025-03-04";
const END_DATE = "2025-04-05";
const CLIFF_DATE = "2025-04-04";
const DEFAULT_ACCOUNT = "webassemblymusic.near";
const RECEIVER_ACCOUNT_WITH_LOCKUP = "infinex.sputnik-dao.near";
const NO_WHITELIST_ACCOUNT = "lockup-no-whitelist.near";
const createRequestButton = (page) =>
  page.getByText("Create Request", {
    exact: true,
  });

async function clickCreateLockupRequestButton(page) {
  await expect(createRequestButton(page)).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_000);
  await createRequestButton(page).click();
}

async function gotoForm(page, instanceAccount) {
  await page.waitForTimeout(6_000);
  await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
  await clickCreateLockupRequestButton(page);
}

async function fillCreateForm({
  page,
  daoAccount,
  receiverAccount = DEFAULT_ACCOUNT,
  instanceAccount,
  instanceConfig,
  submitBtn,
  startDate = START_DATE,
  endDate = END_DATE,
  cliffDate = CLIFF_DATE,
}) {
  await mockInventory({ page, account: daoAccount });
  await gotoForm(page, instanceAccount);

  await page.getByPlaceholder("recipient.near").fill(receiverAccount);
  const totalAmountField = await page.getByTestId("amount");
  await focusInputReplaceAndBlur({
    inputField: totalAmountField,
    newValue: "4",
  });
  await page.getByTestId("start-date").fill(startDate);
  await page.getByTestId("end-date").fill(endDate);
  await expect(submitBtn).toBeAttached({ timeout: 10_000 });
  await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });

  const allowCancelationElement = await page.getByTestId("allow-cancellation");
  const allowStakingElement = await page.getByTestId("allow-staking");

  if (!instanceConfig.allowLockupCancellation) {
    await expect(allowCancelationElement).toBeDisabled();
  } else {
    await expect(allowCancelationElement).toBeEnabled();
    await expect(allowCancelationElement).not.toBeChecked();
    await allowCancelationElement.check();
    await expect(allowCancelationElement).toBeChecked();
    await expect(await page.getByTestId("cliff-date")).toBeVisible();
    await page.getByTestId("cliff-date").fill(cliffDate);
  }

  await expect(allowStakingElement).not.toBeChecked();
  await allowStakingElement.check();
  await expect(allowStakingElement).toBeChecked();

  await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
}

async function checkForErrorWithAmountField(page, value, checkCopyPaste) {
  const totalAmountField = await page.getByTestId("amount");
  await totalAmountField.focus();
  // clear the textfield
  await totalAmountField.press(isMac ? "Meta+A" : "Control+A");
  await totalAmountField.press("Backspace");

  if (checkCopyPaste) {
    const copyText = "432rete,./.";
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, copyText);
    if (isMac) {
      await page.keyboard.down("Meta"); // Command key on macOS
      await page.keyboard.press("a");
      await page.keyboard.press("v");
      await page.keyboard.up("Meta");
    } else {
      await page.keyboard.down("Control"); // Control key on Windows/Linux
      await page.keyboard.press("a");
      await page.keyboard.press("v");
      await page.keyboard.up("Control");
    }
  } else {
    await totalAmountField.pressSequentially(value);
    await totalAmountField.blur();
  }

  // make sure there is no error
  const submitBtn = page
    .locator(".offcanvas-body")
    .getByRole("button", { name: "Submit" });
  expect(await submitBtn.isDisabled()).toBe(true);
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("User is not logged in", function () {
  test("should not see 'Create Request' action", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
    await expect(page.getByText("Pending Requests")).toBeVisible();
    await expect(createRequestButton(page)).toBeHidden();
  });
});

test.describe.parallel("User logged in with different roles", () => {
  for (const { name, storageState, canCreateRequest } of roles) {
    test.describe(`User with '${name}'`, () => {
      test.use({ storageState });

      test(`should ${
        canCreateRequest ? "see" : "not see"
      } 'Create Request' action`, async ({ page, instanceAccount }) => {
        test.setTimeout(100_000);

        await updateDaoPolicyMembers({
          instanceAccount,
          page,
          hasAllRole: canCreateRequest,
        });

        await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
        await expect(page.getByText("Pending Requests")).toBeVisible({
          timeout: 20_000,
        });

        if (canCreateRequest)
          await expect(createRequestButton(page)).toBeVisible();
        else await expect(createRequestButton(page)).toBeHidden();
      });
    });
  }
});

test.describe("User is logged in", function () {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, daoAccount }) => {
    await mockNearPrice({ daoAccount, nearPrice: 5, page });
  });

  test("low account balance should show warning message, and not allow action ", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(100_000);
    await mockNearBalances({
      page,
      accountId: daoAccount,
      balance: BigInt(0.6 * 10 ** 24).toString(),
      storage: 8,
    });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await gotoForm(page, instanceAccount);
    const totalAmountField = await page.getByTestId("amount");
    await focusInputReplaceAndBlur({
      inputField: totalAmountField,
      newValue: "3",
    });
    await expect(page.getByText("Minimum amount is 3.5 NEAR")).toBeVisible();
  });

  test("should allow non existent implicit account as receiver account ", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(100_000);
    await updateDaoPolicyMembers({ instanceAccount, page });
    await gotoForm(page, instanceAccount);

    const receiveInput = page.getByPlaceholder("recipient.near");
    await receiveInput.fill("webass");
    const errorText = page.getByText("Please enter valid account ID");
    await expect(errorText).toBeVisible();
    receiveInput.fill(
      "e915ea0c6d5f8ccc417db891490246c6bcd8d0a2214cbcbfa3618a7ee6abe26b"
    );
    await expect(errorText).toBeHidden();
  });

  test("different amount values should not throw any error", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(100_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await gotoForm(page, instanceAccount);

    await checkForErrorWithAmountField(page, "1.2342");
    await checkForErrorWithAmountField(page, "35435435dfdsfsdfsd", false);
    await checkForErrorWithAmountField(page, "not an number");
    await checkForErrorWithAmountField(page, "0", false);
    await checkForErrorWithAmountField(page, "", true, true);
    await checkForErrorWithAmountField(page, "=-34232[]/", false);
  });

  test("should disable submit button on negative amount or numbers", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockInventory({ page, account: daoAccount });
    await gotoForm(page, instanceAccount);
    await checkForErrorWithAmountField(page, "-34232", true);
    await checkForErrorWithAmountField(page, "1111111111111111", true);
  });

  test("submit should be disabled when empty dates", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(100_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await fillCreateForm({
      page,
      daoAccount,
      instanceAccount,
      instanceConfig,
      submitBtn,
      startDate: "",
      endDate: "",
    });

    await expect(submitBtn).toBeDisabled();
  });

  test("submit should be disabled when receiver already has a lockup", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(100_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await fillCreateForm({
      page,
      daoAccount,
      receiverAccount: RECEIVER_ACCOUNT_WITH_LOCKUP,
      instanceAccount,
      instanceConfig,
      submitBtn,
    });

    await expect(submitBtn).toBeDisabled();
  });

  test.describe("With cancellation true", function () {
    test.use({
      contextOptions: {
        permissions: ["clipboard-read", "clipboard-write"],
      },
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin.json",
    });

    test("build lockup payment request with staking", async ({
      page,
      instanceAccount,
      daoAccount,
    }) => {
      test.setTimeout(100_000);
      await mockPikespeakFTTokensResponse({ page, daoAccount });
      await updateDaoPolicyMembers({ instanceAccount, page });
      await mockInventory({ page, account: daoAccount });

      const instanceConfig = await getInstanceConfig({ page, instanceAccount });
      if (!instanceConfig.allowLockupCancellation) return true;

      const submitBtn = page
        .locator(".offcanvas-body")
        .getByRole("button", { name: "Submit" });

      await fillCreateForm({
        page,
        daoAccount,
        instanceAccount,
        instanceConfig,
        submitBtn,
      });
      await submitBtn.click();

      const lockupArgs = toBase64({
        lockup_duration: "0",
        owner_account_id: DEFAULT_ACCOUNT,
        vesting_schedule: {
          VestingSchedule: {
            cliff_timestamp: formatTimestamp(CLIFF_DATE || START_DATE).toString(),
            end_timestamp: formatTimestamp(END_DATE).toString(),
            start_timestamp: formatTimestamp(START_DATE).toString(),
          },
        },
      });

      expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: `Create lockup for ${DEFAULT_ACCOUNT}`,
          kind: {
            FunctionCall: {
              receiver_id: "lockup.near",
              actions: [
                {
                  method_name: "create",
                  args: lockupArgs,
                  deposit: "4000000000000000000000000",
                  gas: "150000000000000",
                },
              ],
            },
          },
        },
      });
    });

    test("build lockup payment request without staking", async ({
      page,
      instanceAccount,
      daoAccount,
    }) => {
      test.setTimeout(100_000);
      await mockPikespeakFTTokensResponse({ page, daoAccount });
      await updateDaoPolicyMembers({ instanceAccount, page });
      await mockInventory({ page, account: daoAccount });

      const instanceConfig = await getInstanceConfig({ page, instanceAccount });
      if (!instanceConfig.allowLockupCancellation) return true;

      const submitBtn = page
        .locator(".offcanvas-body")
        .getByRole("button", { name: "Submit" });

      await fillCreateForm({
        page,
        daoAccount,
        instanceAccount,
        instanceConfig,
        submitBtn,
      });
      const allowStakingElement = await page.getByTestId("allow-staking");
      await allowStakingElement.uncheck();
      await submitBtn.click();

      const lockupArgs = toBase64({
        lockup_duration: "0",
        owner_account_id: DEFAULT_ACCOUNT,
        whitelist_account_id: "lockup-no-whitelist.near",
        vesting_schedule: {
          VestingSchedule: {
            cliff_timestamp: formatTimestamp(CLIFF_DATE || START_DATE).toString(),
            end_timestamp: formatTimestamp(END_DATE).toString(),
            start_timestamp: formatTimestamp(START_DATE).toString(),
          },
        },
      });

      expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: `Create lockup for ${DEFAULT_ACCOUNT}`,
          kind: {
            FunctionCall: {
              receiver_id: "lockup.near",
              actions: [
                {
                  method_name: "create",
                  args: lockupArgs,
                  deposit: "4000000000000000000000000",
                  gas: "150000000000000",
                },
              ],
            },
          },
        },
      });
    });
  });

  test.describe("With cancellation false", function () {
    test.use({
      contextOptions: {
        permissions: ["clipboard-read", "clipboard-write"],
      },
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin.json",
    });

    test.beforeEach(async ({ page, daoAccount, instanceAccount }) => {
      test.setTimeout(100_000);
      await mockPikespeakFTTokensResponse({ page, daoAccount });
      await updateDaoPolicyMembers({ instanceAccount, page });
      await mockInventory({ page, account: daoAccount });
      const instanceConfig = await getInstanceConfig({ page, instanceAccount });
      const submitBtn = page
        .locator(".offcanvas-body")
        .getByRole("button", { name: "Submit" });

      await fillCreateForm({
        page,
        daoAccount,
        instanceAccount,
        instanceConfig,
        submitBtn,
      });
    });

    test("build lockup payment request with staking", async ({ page }) => {
      const submitBtn = page
        .locator(".offcanvas-body")
        .getByRole("button", { name: "Submit" });
      const allowCancelationElement = await page.getByTestId(
        "allow-cancellation"
      );
      await allowCancelationElement.uncheck();
      await submitBtn.click();

      const lockupArgs = toBase64({
        lockup_duration: "0",
        owner_account_id: DEFAULT_ACCOUNT,
        lockup_timestamp: formatTimestamp(START_DATE).toString(),
        release_duration: (
          formatTimestamp(END_DATE) - formatTimestamp(START_DATE)
        ).toString(),
      });

      expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: `Create lockup for ${DEFAULT_ACCOUNT}`,
          kind: {
            FunctionCall: {
              receiver_id: "lockup.near",
              actions: [
                {
                  method_name: "create",
                  args: lockupArgs,
                  deposit: "4000000000000000000000000",
                  gas: "150000000000000",
                },
              ],
            },
          },
        },
      });
    });

    test("build lockup payment request without staking", async ({ page }) => {
      const submitBtn = page
        .locator(".offcanvas-body")
        .getByRole("button", { name: "Submit" });
      const allowCancelationElement = await page.getByTestId(
        "allow-cancellation"
      );
      await allowCancelationElement.uncheck();
      const allowStakingElement = await page.getByTestId("allow-staking");
      await allowStakingElement.uncheck();
      await submitBtn.click();

      const lockupArgs = toBase64({
        lockup_duration: "0",
        owner_account_id: DEFAULT_ACCOUNT,
        whitelist_account_id: NO_WHITELIST_ACCOUNT,
        lockup_timestamp: formatTimestamp(START_DATE).toString(),
        release_duration: (
          formatTimestamp(END_DATE) - formatTimestamp(START_DATE)
        ).toString(),
      });

      expect(await getTransactionModalObject(page)).toEqual({
        proposal: {
          description: `Create lockup for ${DEFAULT_ACCOUNT}`,
          kind: {
            FunctionCall: {
              receiver_id: "lockup.near",
              actions: [
                {
                  method_name: "create",
                  args: lockupArgs,
                  deposit: "4000000000000000000000000",
                  gas: "150000000000000",
                },
              ],
            },
          },
        },
      });
    });
  });
});
