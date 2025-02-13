import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction";
import { mockNearBalances, updateDaoPolicyMembers } from "../../util/rpcmock";
import { getInstanceConfig } from "../../util/config.js";
import {
  CurrentTimestampInNanoseconds,
  mockInventory,
} from "../../util/inventory.js";
import os from "os";
import { mockPikespeakFTTokensResponse } from "../../util/pikespeak.js";
import { mockNearPrice } from "../../util/nearblocks.js";
import {
  focusInputClearAndBlur,
  focusInputReplaceAndBlur,
} from "../../util/forms.js";
import { InsufficientBalance, toBase64 } from "../../util/lib.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";

async function clickCreatePaymentRequestButton(page) {
  const createPaymentRequestButton = await page.getByRole("button", {
    name: "Create Request",
  });
  await expect(createPaymentRequestButton).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_000);
  await createPaymentRequestButton.click();
  return createPaymentRequestButton;
}

async function fillCreateForm(page, daoAccount, instanceAccount) {
  await mockInventory({ page, account: daoAccount });
  const instanceConfig = await getInstanceConfig({ page, instanceAccount });
  await page.goto(`/${instanceAccount}/widget/app?page=payments`);

  await clickCreatePaymentRequestButton(page);

  if (instanceConfig.showProposalSelection === true) {
    const proposalSelect = await page.locator(".dropdown-toggle").first();
    await expect(proposalSelect).toBeVisible();
    await expect(
      await proposalSelect.getByText("Select", { exact: true })
    ).toBeVisible();

    await proposalSelect.click();

    await page.getByText("Add manual request").click();
  }
  await page.getByTestId("proposal-title").fill("Test proposal title");
  await page.getByTestId("proposal-summary").fill("Test proposal summary");

  await page.getByPlaceholder("treasury.near").fill("webassemblymusic.near");
  const totalAmountField = await page.getByTestId("total-amount");
  await totalAmountField.focus();
  await totalAmountField.pressSequentially("3");
  await totalAmountField.blur();

  const tokenSelect = await page.getByTestId("tokens-dropdown");
  await tokenSelect.click();
  await tokenSelect.getByText("NEAR").click();
}

const isMac = os.platform() === "darwin";

async function checkForErrorWithAmountField(
  page,
  value,
  selectNear = true,
  checkCopyPaste
) {
  const totalAmountField = await page.getByTestId("total-amount");
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

  const tokenSelect = await page.getByTestId("tokens-dropdown");
  await tokenSelect.click();
  if (selectNear) {
    await tokenSelect.locator(".dropdown-item").first().click();
  } else {
    await page
      .getByTestId("tokens-dropdown")
      .locator("div")
      .filter({ hasText: "USDC Tokens available:" })
      .nth(3)
      .click();
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
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await expect(page.getByText("Pending Requests")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Create Request",
      })
    ).toBeHidden();
  });
});

async function selectLockupAccount({ page, daoAccount, lockupContract }) {
  await page
    .locator(".offcanvas-body")
    .getByRole("button", { name: daoAccount })
    .click();
  await page.locator(".offcanvas-body").getByText(lockupContract).click();
}

test.describe.parallel("User logged in with different roles", function () {
  const roles = [
    {
      name: "Vote role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-vote-role.json",
    },
    {
      name: "Settings role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-settings-role.json",
    },
  ];

  for (const role of roles) {
    test.describe(`User with '${role.name}'`, function () {
      test.use({ storageState: role.storageState });

      test("should not see 'Create Request' action", async ({
        page,
        instanceAccount,
      }) => {
        test.setTimeout(60_000);
        await updateDaoPolicyMembers({ instanceAccount, page });
        await page.goto(`/${instanceAccount}/widget/app?page=payments`);
        await expect(page.getByText("Pending Requests")).toBeVisible({
          timeout: 20_000,
        });
        await expect(
          page.getByRole("button", {
            name: "Create Request",
          })
        ).toBeHidden();
      });
    });
  }
});

test.describe("User is logged in", function () {
  const signedUser = "theori.near";
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, daoAccount }) => {
    await mockNearPrice({ daoAccount, nearPrice: 5, page });
  });

  test("low account balance should show warning modal, and allow action ", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await mockNearBalances({
      page,
      accountId: signedUser,
      balance: BigInt(0.6 * 10 ** 24).toString(),
      storage: 8,
    });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await expect(
      page.getByText(
        "Please add more NEAR to your account soon to avoid any issues completing actions on your treasury"
      )
    ).toBeVisible();
  });

  test("insufficient account balance should show warning modal, disallow action ", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockNearBalances({
      page,
      accountId: signedUser,
      balance: InsufficientBalance,
      storage: 8,
    });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await expect(
      page.getByText(
        "Hey Ori, you don't have enough NEAR to complete actions on your treasury."
      )
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Create Request",
      })
      .click();
    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
  });

  test("different amount values should not throw any error", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);

    await clickCreatePaymentRequestButton(page);
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
    await fillCreateForm(page, daoAccount, instanceAccount);

    await checkForErrorWithAmountField(page, "-34232", true);
    await checkForErrorWithAmountField(page, "1111111111111111", true);
  });

  test("should throw pikespeak error when response is 403", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(120_000);
    await updateDaoPolicyMembers({ instanceAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await clickCreatePaymentRequestButton(page);
    await expect(
      page.getByText("There has been some issue in fetching FT tokens data.")
    ).toBeVisible({
      timeout: 60_000,
    });
  });

  test("tokens dropdown should show all tokens, after selecting one should allow change", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await clickCreatePaymentRequestButton(page);
    const tokenSelect = page.getByTestId("tokens-dropdown");
    await tokenSelect.click();
    await tokenSelect.getByText("NEAR").click();
    await tokenSelect.click();
    await tokenSelect.getByText("USDC").click();
    await tokenSelect.click();
    await tokenSelect.getByText("USDT").click();
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    expect(await submitBtn.isDisabled()).toBe(true);
  });

  test("submit should be disabled when incorrect receiver id is mentioned or empty amount or empty proposal name or empty token", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);

    await clickCreatePaymentRequestButton(page);

    if (instanceConfig.showProposalSelection === true) {
      const proposalSelect = await page.locator(".dropdown-toggle").first();
      await expect(proposalSelect).toBeVisible();
      await expect(
        await proposalSelect.getByText("Select", { exact: true })
      ).toBeVisible();

      await proposalSelect.click();

      await page.getByText("Add manual request").click();
    }
    await page.getByTestId("proposal-title").fill("Test proposal title");
    await page.getByTestId("proposal-summary").fill("Test proposal summary");

    await page.getByPlaceholder("treasury.near").fill("webassemblymusic.near");
    const totalAmountField = await page.getByTestId("total-amount");
    await focusInputReplaceAndBlur({
      inputField: totalAmountField,
      newValue: "3",
    });

    const submitBtn = async () => {
      const btn = page
        .locator(".offcanvas-body")
        .getByRole("button", { name: "Submit" });
      return btn;
    };
    await expect(await submitBtn()).toBeDisabled();

    const tokenSelect = await page.getByTestId("tokens-dropdown");
    await tokenSelect.click();
    await tokenSelect.getByText("NEAR").click();
    await expect(await submitBtn()).toBeEnabled();

    const proposalTitle = page.getByTestId("proposal-title");
    await focusInputClearAndBlur({ inputField: proposalTitle });

    await expect(await submitBtn()).toBeDisabled();
    await focusInputReplaceAndBlur({
      inputField: proposalTitle,
      newValue: "blabla",
    });
    await expect(await submitBtn()).toBeEnabled();

    const recipientInput = page.getByPlaceholder("treasury.near");
    await focusInputReplaceAndBlur({
      inputField: recipientInput,
      newValue: "webassemblymusic.nea",
    });

    await expect(await submitBtn()).toBeDisabled();
    await focusInputClearAndBlur({ inputField: recipientInput });

    await expect(await submitBtn()).toBeDisabled();
    await focusInputReplaceAndBlur({
      inputField: recipientInput,
      newValue: "webassemblymusic.near",
    });
    await expect(await submitBtn()).toBeEnabled();

    await focusInputClearAndBlur({ inputField: totalAmountField });
    await expect(await submitBtn()).toBeDisabled();
    await focusInputReplaceAndBlur({
      inputField: totalAmountField,
      newValue: "aa",
    });
    await expect(await submitBtn()).toBeDisabled();
    await focusInputReplaceAndBlur({
      inputField: totalAmountField,
      newValue: "1",
    });
    await expect(await submitBtn()).toBeEnabled();
  });

  test("cancel form should clear existing values", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await fillCreateForm(page, daoAccount, instanceAccount);
    const cancelBtn = page.getByRole("button", { name: "Cancel" });
    await expect(cancelBtn).toBeAttached({ timeout: 10_000 });

    cancelBtn.click();
    await page.locator("button", { hasText: "Yes" }).click();

    await clickCreatePaymentRequestButton(page);

    if (daoAccount === "infinex.sputnik-dao.near") {
      expect(await page.getByTestId("proposal-title").inputValue()).toBe("");
      expect(await page.getByTestId("proposal-summary").inputValue()).toBe("");
    }
    expect(await page.getByPlaceholder("treasury.near").inputValue()).toBe("");
    expect(await page.getByTestId("total-amount").inputValue()).toBe("");
  });

  test("cancel form with linked proposal should clear existing values", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const nearPrice = 4;
    const amountFromLinkedProposal = 3120 / nearPrice;

    await mockNearPrice({ daoAccount, nearPrice, page });
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    if (instanceConfig.showProposalSelection === false) {
      console.log(
        "Skip testing linked proposal, since instance does not support proposal selection"
      );
      return;
    }

    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });

    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await clickCreatePaymentRequestButton(page);

    const proposalSelect = page.locator(".dropdown-toggle").first();
    await expect(proposalSelect).toBeVisible();

    await expect(
      proposalSelect.getByText("Select", { exact: true })
    ).toBeVisible();

    await proposalSelect.click();
    await page
      .getByPlaceholder("Search by id or title")
      .pressSequentially("173");
    const proposal = await page.getByText("#173 Near Contract Standards");
    await proposal.click();
    expect(await page.getByPlaceholder("treasury.near").inputValue()).toBe(
      "robert.near"
    );

    expect(await page.getByTestId("total-amount").inputValue()).toBe(
      amountFromLinkedProposal.toString()
    );

    const cancelBtn = page.getByRole("button", { name: "Cancel" });
    await expect(cancelBtn).toBeAttached({ timeout: 10_000 });

    cancelBtn.click();
    await page.locator("button", { hasText: "Yes" }).click();

    await clickCreatePaymentRequestButton(page);

    await expect(await page.locator(".dropdown-toggle").first()).toHaveText(
      "Select"
    );
    expect(await page.getByPlaceholder("treasury.near").inputValue()).toBe("");
    expect(await page.getByTestId("total-amount").inputValue()).toBe("");
  });

  test("create manual payment request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await fillCreateForm(page, daoAccount, instanceAccount);
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description:
          "* Title: Test proposal title <br>* Summary: Test proposal summary",
        kind: {
          Transfer: {
            token_id: "",
            receiver_id: "webassemblymusic.near",
            amount: "3000000000000000000000000",
          },
        },
      },
    });
  });

  test("create USDC transfer payment request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await mockInventory({ page, account: daoAccount });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);

    await clickCreatePaymentRequestButton(page);

    if (instanceConfig.showProposalSelection === true) {
      const proposalSelect = page.locator(".dropdown-toggle").first();
      await expect(proposalSelect).toBeVisible();
      await expect(
        proposalSelect.getByText("Select", { exact: true })
      ).toBeVisible();

      await proposalSelect.click();

      await page
        .getByPlaceholder("Search by id or title")
        .fill("215 Fellowship");
      const proposal = page.getByText(
        "#215 Fellowship Contributor report by Matias Benary for 2024-09-09 2024-09-29"
      );
      await proposal.click();
      expect(await page.getByPlaceholder("treasury.near").inputValue()).toBe(
        "maguila.near"
      );
      expect(await page.getByTestId("total-amount").inputValue()).toBe("3150");
    } else {
      await page.getByTestId("proposal-title").fill("Test proposal title");
      await page.getByTestId("proposal-summary").fill("Test proposal summary");

      await page
        .getByPlaceholder("treasury.near")
        .fill("webassemblymusic.near");
      const tokenSelect = page.getByTestId("tokens-dropdown");
      await tokenSelect.click();
      await tokenSelect.getByText("USDC").click();

      const totalAmountField = page.getByTestId("total-amount");
      await totalAmountField.focus();
      await totalAmountField.pressSequentially("3150");
      await totalAmountField.blur();
    }
    await page.waitForTimeout(5_000);
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    const expectedTransactionModalObject = instanceConfig.showProposalSelection
      ? {
          proposal: {
            description:
              "* Title: Fellowship Contributor report by Matias Benary for  2024-09-09  2024-09-29 <br>* Summary: Fellowship Contributor report by Matias Benary for  2024-09-09  2024-09-29 <br>* Proposal Id: 215",
            kind: {
              Transfer: {
                amount: "3150000000",
                receiver_id: "maguila.near",
                token_id: "usdt.tether-token.near",
              },
            },
          },
        }
      : {
          proposal: {
            description:
              "* Title: Test proposal title <br>* Summary: Test proposal summary",
            kind: {
              Transfer: {
                amount: "3150000000",
                receiver_id: "webassemblymusic.near",
                token_id:
                  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
              },
            },
          },
        };
    expect(await getTransactionModalObject(page)).toEqual(
      expectedTransactionModalObject
    );
  });

  test("create lockup payment request using sandboxRPC", async ({
    page,
    instanceAccount,
    daoAccount,
    lockupContract,
  }) => {
    test.setTimeout(250_000);
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    if (!instanceConfig.lockupContract) {
      console.log("no lockup contract found for instance");
      return test.skip();
    }
    const daoName = daoAccount.split(".")[0];
    const sandbox = new SandboxRPC();
    const proposalTitle = "Test proposal title";
    const proposalSummary = "Test proposal summary";
    const receiverAccount = daoAccount;
    const description = `* Title: ${proposalTitle} <br>* Summary: ${proposalSummary} <br>* Proposal Action: transfer`;
    await sandbox.init();
    await sandbox.attachRoutes(page);
    await sandbox.setupSandboxForSputnikDao(daoName);
    await sandbox.setupLockupContract(daoName);
    await updateDaoPolicyMembers({ instanceAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await clickCreatePaymentRequestButton(page);
    await selectLockupAccount({ page, daoAccount, lockupContract });
    await page.getByTestId("proposal-title").fill(proposalTitle);
    await page.getByTestId("proposal-summary").fill(proposalSummary);

    await page.getByPlaceholder("treasury.near").fill(receiverAccount);
    const totalAmountField = await page.getByTestId("total-amount");
    await totalAmountField.focus();
    await totalAmountField.pressSequentially("3");
    await totalAmountField.blur();

    const tokenSelect = await page.getByTestId("tokens-dropdown");
    await tokenSelect.click();
    await tokenSelect.getByText("NEAR").click();
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description,
        kind: {
          FunctionCall: {
            receiver_id: lockupContract,
            actions: [
              {
                method_name: "transfer",
                args: toBase64({
                  amount: "3000000000000000000000000",
                  receiver_id: receiverAccount,
                }),
                deposit: "0",
                gas: 270000000000000,
              },
            ],
          },
        },
      },
    });
    page.evaluate(async () => {
      const selector = await document.querySelector("near-social-viewer")
        .selectorPromise;

      const wallet = await selector.wallet();

      return new Promise((resolve) => {
        wallet["signAndSendTransaction"] = async (transaction) => {
          resolve(transaction);
          return new Promise((transactionSentPromiseResolve) => {
            window.transactionSentPromiseResolve =
              transactionSentPromiseResolve;
          });
        };
      });
    });
    const transactionResult = await sandbox.addFunctionCallProposal({
      method_name: "transfer",
      functionArgs: toBase64({
        amount: "3000000000000000000000000",
        receiver_id: receiverAccount,
      }),
      receiver_id: lockupContract,
      description,
      daoName,
    });
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.evaluate(async (transactionResult) => {
      window.transactionSentPromiseResolve(transactionResult);
    }, transactionResult);
    const lastProposalId = await sandbox.getLastProposalId(daoName);
    await expect(page.locator("div.modal-body code").nth(0)).toBeAttached({
      attached: false,
      timeout: 10_000,
    });
    await expect(page.locator(".spinner-border")).toBeAttached({
      attached: false,
      timeout: 10_000,
    });
    await expect(page.locator(".offcanvas-body")).toBeVisible({
      visible: false,
    });
    await expect(
      page
        .getByRole("cell", { name: `${lastProposalId - 1}`, exact: true })
        .first()
    ).toBeVisible({ timeout: 20_000 });
    await sandbox.quitSandbox();
  });

  test("submit action should show transaction loader and handle cancellation correctly", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(100_000);
    await fillCreateForm(page, daoAccount, instanceAccount);
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();
    const loader = page.getByText("Awaiting transaction confirmation...");
    await expect(loader).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    await page.getByRole("button", { name: "Close" }).nth(1).click();
    await page
      .locator(".toast-body")
      .getByRole("button", { name: "Cancel" })
      .click();
    await expect(loader).toBeHidden();
    await expect(submitBtn).toBeEnabled();
  });
});

test.describe("admin with function access keys", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });
  test("create NEAR transfer payment request, and after submission it should be visible in pending request, and the form should be cleared", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    const nearPrice = 4;
    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await mockNearPrice({ daoAccount, nearPrice, page });
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ instanceAccount, page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);

    await clickCreatePaymentRequestButton(page);

    const usdAmountFromLinkedProposal = 3120;
    const nearAmountFromLinkedProposal = 3120 / nearPrice;

    if (instanceConfig.showProposalSelection === true) {
      const proposalSelect = page.locator(".dropdown-toggle").first();
      await expect(proposalSelect).toBeVisible();

      await expect(
        proposalSelect.getByText("Select", { exact: true })
      ).toBeVisible();

      await proposalSelect.click();
      await page
        .getByPlaceholder("Search by id or title")
        .pressSequentially("173");
      const proposal = page.getByText("#173 Near Contract Standards");
      await proposal.click();
      expect(await page.getByPlaceholder("treasury.near").inputValue()).toBe(
        "robert.near"
      );

      expect(await page.getByTestId("total-amount").inputValue()).toBe(
        nearAmountFromLinkedProposal.toString()
      );
      await expect(
        page.getByText(`$${usdAmountFromLinkedProposal.toLocaleString()}.00`)
      ).toBeVisible();
      await expect(page.getByText(`$${nearPrice}.00`)).toBeVisible();
    } else {
      await page.getByTestId("proposal-title").fill("Test proposal title");
      await page.getByTestId("proposal-summary").fill("Test proposal summary");

      await page
        .getByPlaceholder("treasury.near")
        .fill("webassemblymusic.near");
      const tokenSelect = page.getByTestId("tokens-dropdown");
      await tokenSelect.click();
      await tokenSelect.getByText("NEAR").click();

      const totalAmountField = page.getByTestId("total-amount");
      await totalAmountField.focus();
      await totalAmountField.pressSequentially("20");
      await totalAmountField.blur();
    }
    const submitBtn = await page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeEnabled({ timeout: 20_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 20_000 });
    await submitBtn.click();

    const expectedTransactionModalObject = instanceConfig.showProposalSelection
      ? {
          proposal: {
            description:
              "* Title: Near Contract Standards payment request by Robert <br>* Summary: Contract Standards Work Group grant <br>* Proposal Id: 173",
            kind: {
              Transfer: {
                token_id: "",
                receiver_id: "robert.near",
                amount: (
                  BigInt(nearAmountFromLinkedProposal) *
                  10n ** 24n
                ).toString(),
              },
            },
          },
        }
      : {
          proposal: {
            description:
              "* Title: Test proposal title <br>* Summary: Test proposal summary",
            kind: {
              Transfer: {
                amount: (20n * 10n ** 24n).toString(),
                receiver_id: "webassemblymusic.near",
                token_id: "",
              },
            },
          },
        };

    expect(await getTransactionModalObject(page)).toEqual(
      expectedTransactionModalObject
    );

    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
    let isTransactionCompleted = false;
    let retryCountAfterComplete = 0;
    let newProposalId;
    await mockTransactionSubmitRPCResponses(
      page,
      async ({
        route,
        request,
        transaction_completed,
        last_receiver_id,
        requestPostData,
      }) => {
        isTransactionCompleted = transaction_completed;
        if (
          isTransactionCompleted &&
          requestPostData.params &&
          requestPostData.params.method_name === "get_last_proposal_id"
        ) {
          const response = await route.fetch();
          const json = await response.json();
          let result = JSON.parse(
            new TextDecoder().decode(new Uint8Array(json.result.result))
          );
          if (retryCountAfterComplete === 2) {
            result++;
            newProposalId = result;
          } else {
            retryCountAfterComplete++;
          }

          json.result.result = Array.from(
            new TextEncoder().encode(JSON.stringify(result))
          );
          await route.fulfill({ response, json });
        } else if (
          isTransactionCompleted &&
          newProposalId &&
          requestPostData.params &&
          requestPostData.params.method_name === "get_proposals"
        ) {
          const response = await route.fetch();
          const json = await response.json();
          let result = JSON.parse(
            new TextDecoder().decode(new Uint8Array(json.result.result))
          );

          result.push({
            id: newProposalId,
            proposer: "tfdevhub.near",
            description: expectedTransactionModalObject.proposal.description,
            kind: {
              Transfer: {
                token_id:
                  expectedTransactionModalObject.proposal.kind.Transfer
                    .token_id,
                receiver_id:
                  expectedTransactionModalObject.proposal.kind.Transfer
                    .receiver_id,
                amount:
                  expectedTransactionModalObject.proposal.kind.Transfer.amount,
                msg: null,
              },
            },
            status: "InProgress",
            vote_counts: {},
            votes: {},
            submission_time: CurrentTimestampInNanoseconds,
          });

          json.result.result = Array.from(
            new TextEncoder().encode(JSON.stringify(result))
          );
          await route.fulfill({ response, json });
        } else {
          await route.fallback();
        }
      }
    );

    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.locator("div.modal-body code")).toBeAttached({
      attached: false,
      timeout: 10_000,
    });
    await expect(page.locator(".spinner-border")).toBeAttached({
      attached: false,
      timeout: 10_000,
    });
    await expect(page.locator(".offcanvas-body")).toBeVisible({
      visible: false,
    });
    await expect(
      page.getByRole("cell", { name: `${newProposalId}`, exact: true })
    ).toBeVisible({ timeout: 10_000 });
    const widgetsAccount =
      (instanceAccount.includes("testing") ? "test-widgets" : "widgets") +
      ".treasury-factory.near";
    const firstRow = page
      .locator(
        `tr[data-component="${widgetsAccount}/widget/pages.payments.Table"]`
      )
      .nth(1);
    await expect(firstRow).toContainText(
      expectedTransactionModalObject.proposal.kind.Transfer.receiver_id
    );

    const checkThatFormIsCleared = async () => {
      await page.getByRole("button", { name: " Create Request" }).click();

      if (instanceConfig.showProposalSelection === true) {
        const proposalSelect = page.locator(".dropdown-toggle").first();
        await expect(proposalSelect).toBeVisible();

        await expect(
          proposalSelect.getByText("Select", { exact: true })
        ).toBeVisible();
      } else {
        await expect(page.getByTestId("proposal-title")).toHaveText("");
        await expect(page.getByTestId("proposal-summary")).toHaveText("");

        await expect(page.getByPlaceholder("treasury.near")).toBeVisible();

        await expect(page.getByTestId("total-amount")).toHaveText("");
      }
      const submitBtn = page.getByRole("button", { name: "Submit" });
      await expect(submitBtn).toBeAttached({ timeout: 10_000 });
      await expect(submitBtn).toBeDisabled({ timeout: 10_000 });
    };
    await checkThatFormIsCleared();

    await page.reload();

    await checkThatFormIsCleared();
  });
});
