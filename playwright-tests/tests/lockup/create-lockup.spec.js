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

// Test constants
const TEST_DATES = {
  start: "2025-03-04",
  end: "2025-04-05",
  cliff: "2025-04-04",
  startAt0: "2025-03-04:00:00:00",
  endAt0: "2025-04-05:00:00:00",
  cliffAt0: "2025-04-04:00:00:00",
};

const TEST_ACCOUNTS = {
  default: "webassemblymusic.near",
  withExistingLockup: "infinex.sputnik-dao.near",
  noWhitelist: "lockup-no-whitelist.near",
};

// Page utilities
const createRequestButton = (page) =>
  page.getByText("Create Request", { exact: true });

const getSubmitButton = (page) =>
  page.locator(".offcanvas-body").getByRole("button", { name: "Submit" });

// Test helpers
async function navigateToLockupPage(page, instanceAccount) {
  await page.waitForTimeout(6_000);
  await page.goto(`/${instanceAccount}/widget/app?page=lockup`);
}

async function clickCreateLockupRequestButton(page) {
  await expect(createRequestButton(page)).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_000);
  await createRequestButton(page).click();
}

async function setupFormEnvironment({ page, daoAccount, instanceAccount }) {
  await mockPikespeakFTTokensResponse({ page, daoAccount });
  await updateDaoPolicyMembers({ instanceAccount, page });
  await mockInventory({ page, account: daoAccount });
  await mockNearPrice({ daoAccount, nearPrice: 5, page });
  return await getInstanceConfig({ page, instanceAccount });
}

async function gotoLockupFormPage(page, instanceAccount) {
  await navigateToLockupPage(page, instanceAccount);
  await clickCreateLockupRequestButton(page);
}

/**
 * Form interaction helpers
 */
async function fillReceiverAccount(page, receiverAccount) {
  await page.getByPlaceholder("recipient.near").fill(receiverAccount);
}

async function fillAmount(page, amount = "4") {
  const totalAmountField = await page.getByTestId("amount");
  await focusInputReplaceAndBlur({
    inputField: totalAmountField,
    newValue: amount,
  });
}

async function fillDates(page, { startDate, endDate, cliffDate }) {
  await page.getByTestId("start-date").fill(startDate);
  await page.getByTestId("end-date").fill(endDate);
  if (cliffDate && (await page.getByTestId("cliff-date").isVisible())) {
    await page.getByTestId("cliff-date").fill(cliffDate);
  }
}

async function setCancellationOption(page, enableCancellation = true) {
  const allowCancelationElement = await page.getByTestId("allow-cancellation");

  if (await allowCancelationElement.isDisabled()) {
    return false; // Can't change if disabled
  }

  const isCurrentlyChecked = await allowCancelationElement.isChecked();
  if (isCurrentlyChecked !== enableCancellation) {
    if (enableCancellation) {
      await allowCancelationElement.check();
    } else {
      await allowCancelationElement.uncheck();
    }
  }
  await expect(allowCancelationElement).toBeChecked({
    checked: enableCancellation,
  });
  return true;
}

async function setStakingOption(page, enableStaking = true) {
  const allowStakingElement = await page.getByTestId("allow-staking");
  const isCurrentlyChecked = await allowStakingElement.isChecked();

  if (isCurrentlyChecked !== enableStaking) {
    if (enableStaking) {
      await allowStakingElement.check();
    } else {
      await allowStakingElement.uncheck();
    }
  }
  await expect(allowStakingElement).toBeChecked({ checked: enableStaking });
}

/**
 * Creates expected lockup arguments based on parameters
 */
async function buildExpectedLockupArgs({
  receiverAccount = TEST_ACCOUNTS.default,
  enableCancellation = true,
  enableStaking = true,
  startDate = TEST_DATES.startAt0,
  endDate = TEST_DATES.endAt0,
  cliffDate = TEST_DATES.cliffAt0,
}) {
  if (enableCancellation) {
    // With cancellation - using vesting schedule
    return toBase64({
      lockup_duration: "0",
      owner_account_id: receiverAccount,
      ...(enableStaking
        ? {}
        : { whitelist_account_id: TEST_ACCOUNTS.noWhitelist }),
      vesting_schedule: {
        VestingSchedule: {
          cliff_timestamp: formatTimestamp(cliffDate || startDate).toString(),
          end_timestamp: formatTimestamp(endDate).toString(),
          start_timestamp: formatTimestamp(startDate).toString(),
        },
      },
    });
  } else {
    // Without cancellation - using lockup_timestamp + release_duration
    return toBase64({
      lockup_duration: "0",
      owner_account_id: receiverAccount,
      ...(enableStaking
        ? {}
        : { whitelist_account_id: TEST_ACCOUNTS.noWhitelist }),
      lockup_timestamp: formatTimestamp(startDate).toString(),
      release_duration: (
        formatTimestamp(endDate) - formatTimestamp(startDate)
      ).toString(),
    });
  }
}

/**
 * Verify the transaction modal shows the correct lockup proposal
 */
async function verifyLockupTransaction(
  page,
  {
    receiverAccount = TEST_ACCOUNTS.default,
    enableCancellation = true,
    enableStaking = true,
    amount = "4",
    startDate = TEST_DATES.startAt0,
    endDate = TEST_DATES.endAt0,
    cliffDate = TEST_DATES.cliffAt0,
  }
) {
  const lockupArgs = await buildExpectedLockupArgs({
    receiverAccount,
    enableCancellation,
    enableStaking,
    startDate,
    endDate,
    cliffDate,
  });

  const expectedDeposit = amount + "000000000000000000000000";
  const expectedObj = {
    proposal: {
      description: `Create lockup for ${receiverAccount}`,
      kind: {
        FunctionCall: {
          receiver_id: "lockup.near",
          actions: [
            {
              method_name: "create",
              args: lockupArgs,
              deposit: expectedDeposit,
              gas: "150000000000000",
            },
          ],
        },
      },
    },
  };

  expect(await getTransactionModalObject(page)).toEqual(expectedObj);
}

/**
 * Fill the entire lockup creation form with default or specified values
 */
async function fillLockupForm({
  page,
  daoAccount,
  instanceAccount,
  instanceConfig,
  receiverAccount = TEST_ACCOUNTS.default,
  amount = "4",
  startDate = TEST_DATES.start,
  endDate = TEST_DATES.end,
  cliffDate = TEST_DATES.cliff,
  enableCancellation = true,
  enableStaking = true,
}) {
  // Initialize form
  await mockInventory({ page, account: daoAccount });
  await gotoLockupFormPage(page, instanceAccount);

  // Fill form fields
  await fillReceiverAccount(page, receiverAccount);
  await fillAmount(page, amount);
  await fillDates(page, { startDate, endDate, cliffDate });

  // Get submit button and ensure it's visible
  const submitBtn = getSubmitButton(page);
  await expect(submitBtn).toBeAttached({ timeout: 10_000 });
  await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });

  // Configure options
  const cancellationChanged = await setCancellationOption(
    page,
    enableCancellation
  );
  if (cancellationChanged && enableCancellation) {
    // Only set cliff date if cancellation was enabled and it wasn't before
    await page.getByTestId("cliff-date").fill(cliffDate);
  }
  await setStakingOption(page, enableStaking);

  // Ensure submit button is still visible
  await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });

  return submitBtn;
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("Lockup Creation", () => {
  test.describe("Access Control", () => {
    test("Anonymous user should not see 'Create Request' action", async ({
      page,
      instanceAccount,
    }) => {
      test.setTimeout(60_000);
      await navigateToLockupPage(page, instanceAccount);
      await expect(page.getByText("Pending Requests")).toBeVisible();
      await expect(createRequestButton(page)).toBeHidden();
    });

    for (const { name, storageState, canCreateRequest } of roles) {
      test.describe(`User with '${name}' role`, () => {
        test.use({ storageState });

        test(`${
          canCreateRequest ? "can" : "cannot"
        } create lockup requests`, async ({ page, instanceAccount }) => {
          test.setTimeout(100_000);

          await updateDaoPolicyMembers({
            instanceAccount,
            page,
            hasAllRole: canCreateRequest,
          });

          await navigateToLockupPage(page, instanceAccount);
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

  test.describe("Form Validation", () => {
    test.use({
      contextOptions: {
        permissions: ["clipboard-read", "clipboard-write"],
      },
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin.json",
    });

    test("Low account balance should show warning message and disable submit", async ({
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
      await gotoLockupFormPage(page, instanceAccount);

      const totalAmountField = await page.getByTestId("amount");
      await focusInputReplaceAndBlur({
        inputField: totalAmountField,
        newValue: "3",
      });

      await expect(page.getByText("Minimum amount is 3.5 NEAR")).toBeVisible();
    });

    test("Should allow non-existent implicit account as receiver", async ({
      page,
      instanceAccount,
    }) => {
      test.setTimeout(100_000);
      await updateDaoPolicyMembers({ instanceAccount, page });
      await gotoLockupFormPage(page, instanceAccount);

      const receiveInput = page.getByPlaceholder("recipient.near");
      await receiveInput.fill("webass");
      const errorText = page.getByText("Please enter valid account ID");
      await expect(errorText).toBeVisible();

      receiveInput.fill(
        "e915ea0c6d5f8ccc417db891490246c6bcd8d0a2214cbcbfa3618a7ee6abe26b"
      );
      await expect(errorText).toBeHidden();
    });

    test("Submit should be disabled when dates are empty", async ({
      page,
      instanceAccount,
      daoAccount,
    }) => {
      test.setTimeout(100_000);
      const instanceConfig = await setupFormEnvironment({
        page,
        daoAccount,
        instanceAccount,
      });

      const submitBtn = await fillLockupForm({
        page,
        daoAccount,
        instanceAccount,
        instanceConfig,
        startDate: "",
        endDate: "",
      });

      await expect(submitBtn).toBeDisabled();
    });

    test("Submit should be disabled when receiver already has a lockup", async ({
      page,
      instanceAccount,
      daoAccount,
    }) => {
      test.setTimeout(100_000);
      const instanceConfig = await setupFormEnvironment({
        page,
        daoAccount,
        instanceAccount,
      });

      const submitBtn = await fillLockupForm({
        page,
        daoAccount,
        instanceAccount,
        instanceConfig,
        receiverAccount: TEST_ACCOUNTS.withExistingLockup,
      });

      await expect(submitBtn).toBeDisabled();
    });

    test("Amount field validates different input types correctly", async ({
      page,
      instanceAccount,
      daoAccount,
    }) => {
      test.setTimeout(100_000);
      await updateDaoPolicyMembers({ instanceAccount, page });
      await gotoLockupFormPage(page, instanceAccount);

      // Test validation for different amount formats
      const testCases = [
        { value: "3.5", shouldBeValid: true },
        { value: "1.2342", shouldBeValid: false },
        { value: "35435435dfdsfsdfsd", shouldBeValid: false },
        { value: "not an number", shouldBeValid: false },
        { value: "0", shouldBeValid: false },
        { value: "=-34232[]/", shouldBeValid: false },
        { value: "-34232", shouldBeValid: false },
        { value: "1111111111111111", shouldBeValid: false },
      ];

      const submitBtn = await fillLockupForm({
        page,
        daoAccount,
        instanceAccount,
      });

      for (const testCase of testCases) {
        const totalAmountField = await page.getByTestId("amount");
        await totalAmountField.focus();
        await totalAmountField.press(isMac ? "Meta+A" : "Control+A");
        await totalAmountField.press("Backspace");
        await totalAmountField.pressSequentially(testCase.value);
        await totalAmountField.blur();

        if (testCase.shouldBeValid) {
          await expect(submitBtn).not.toBeDisabled();
        } else {
          await expect(submitBtn).toBeDisabled();
        }
      }
    });
  });

  test.describe("Transaction Creation", () => {
    test.use({
      contextOptions: {
        permissions: ["clipboard-read", "clipboard-write"],
      },
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin.json",
    });

    test.beforeEach(async ({ page, daoAccount }) => {
      await mockNearPrice({ daoAccount, nearPrice: 5, page });
    });

    test.describe("With cancellation enabled", () => {
      test("Creates lockup with staking enabled", async ({
        page,
        instanceAccount,
        daoAccount,
      }) => {
        test.setTimeout(100_000);
        const instanceConfig = await setupFormEnvironment({
          page,
          daoAccount,
          instanceAccount,
        });

        if (!instanceConfig.allowLockupCancellation) {
          test.skip("This test requires lockup cancellation to be allowed");
        }

        const submitBtn = await fillLockupForm({
          page,
          daoAccount,
          instanceAccount,
          instanceConfig,
          enableCancellation: true,
          enableStaking: true,
        });
        await submitBtn.click();

        await verifyLockupTransaction(page, {
          enableCancellation: true,
          enableStaking: true,
        });
      });

      test("Creates lockup with staking disabled", async ({
        page,
        instanceAccount,
        daoAccount,
      }) => {
        test.setTimeout(100_000);
        const instanceConfig = await setupFormEnvironment({
          page,
          daoAccount,
          instanceAccount,
        });

        if (!instanceConfig.allowLockupCancellation) {
          test.skip("This test requires lockup cancellation to be allowed");
        }

        const submitBtn = await fillLockupForm({
          page,
          daoAccount,
          instanceAccount,
          instanceConfig,
          enableCancellation: true,
          enableStaking: false,
        });
        await submitBtn.click();

        await verifyLockupTransaction(page, {
          enableCancellation: true,
          enableStaking: false,
        });
      });
    });

    test.describe("With cancellation disabled", () => {
      test.beforeEach(async ({ page, daoAccount, instanceAccount }) => {
        test.setTimeout(100_000);
        const instanceConfig = await setupFormEnvironment({
          page,
          daoAccount,
          instanceAccount,
        });

        await fillLockupForm({
          page,
          daoAccount,
          instanceAccount,
          instanceConfig,
        });
      });

      test("Creates lockup with staking enabled", async ({ page }) => {
        const submitBtn = getSubmitButton(page);
        await setCancellationOption(page, false);
        await submitBtn.click();

        await verifyLockupTransaction(page, {
          enableCancellation: false,
          enableStaking: true,
        });
      });

      test("Creates lockup with staking disabled", async ({ page }) => {
        const submitBtn = getSubmitButton(page);
        await setCancellationOption(page, false);
        await setStakingOption(page, false);
        await submitBtn.click();

        await verifyLockupTransaction(page, {
          enableCancellation: false,
          enableStaking: false,
        });
      });
    });
  });
});
