import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction";
import { updateDaoPolicyMembers } from "../../util/rpcmock";
import { getInstanceConfig } from "../../util/config.js";
import {
  CurrentTimestampInNanoseconds,
  mockInventory,
} from "../../util/inventory.js";
import os from "os";
import { mockPikespeakFTTokensResponse } from "../../util/pikespeak.js";

async function clickCreatePaymentRequestButton(page) {
  const createPaymentRequestButton = await page.getByRole("button", {
    name: "Create Request",
  });
  await expect(createPaymentRequestButton).toBeVisible({ timeout: 20_000 });
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
    await page.locator(".dropdown-item").first().click();
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

test.describe("admin connected", function () {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("different amount values should not throw any error", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(20_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ page });
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
    await updateDaoPolicyMembers({ page });
    await fillCreateForm(page, daoAccount, instanceAccount);

    await checkForErrorWithAmountField(page, "-34232", true);
    await checkForErrorWithAmountField(page, "1111111111111111", true);
  });

  test("should throw pikespeak error when response is 403", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(120_000);
    await updateDaoPolicyMembers({ page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await clickCreatePaymentRequestButton(page);
    expect(page.getByText("There has been some issue in")).toBeVisible({
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
    await updateDaoPolicyMembers({ page });
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

  // TODO: make sure 'submit' is disabled when incorrect receiver id is mentioned or empty amount or empty proposal name or empty token

  test("cancel form should clear existing values", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ page });
    await fillCreateForm(page, daoAccount, instanceAccount);
    const cancelBtn = page
      .locator(".offcanvas-body")
      .locator("button.btn-outline", { hasText: "Cancel" });
    await expect(cancelBtn).toBeAttached({ timeout: 10_000 });

    cancelBtn.click();
    await page.locator("button", { hasText: "Yes" }).click();

    await clickCreatePaymentRequestButton(page);

    // TODO: add a case where the form is a proposal selection instead of a manual title and summary
    expect(await page.getByTestId("proposal-title").inputValue()).toBe("");
    expect(await page.getByTestId("proposal-summary").inputValue()).toBe("");
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
    await updateDaoPolicyMembers({ page });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await fillCreateForm(page, daoAccount, instanceAccount);
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: `{"title":"Test proposal title","summary":"Test proposal summary","notes":${
          instanceConfig.showProposalSelection ? '""' : null
        }}`,
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
    await updateDaoPolicyMembers({ page });
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
              '{"title":"Fellowship Contributor report by Matias Benary for  2024-09-09  2024-09-29","summary":"Fellowship Contributor report by Matias Benary for  2024-09-09  2024-09-29","notes":null,"proposalId":215}',
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
            description: `{"title":"Test proposal title","summary":"Test proposal summary","notes":null}`,
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
    await page.route(
      "https://api3.nearblocks.io/v1/charts/latest",
      async (route) => {
        let json = {
          charts: [
            {
              date: "2024-10-12T00:00:00.000Z",
              near_price: nearPrice.toString(),
              txns: "6113720",
            },
          ],
        };
        await route.fulfill({ json });
      }
    );
    await mockPikespeakFTTokensResponse({ page, daoAccount });
    await updateDaoPolicyMembers({ page });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);

    await clickCreatePaymentRequestButton(page);

    const amountFromLinkedProposal = 3120 / nearPrice;

    if (instanceConfig.showProposalSelection === true) {
      const proposalSelect = page.locator(".dropdown-toggle").first();
      await expect(proposalSelect).toBeVisible();

      await expect(
        proposalSelect.getByText("Select", { exact: true })
      ).toBeVisible();

      await proposalSelect.click();
      const proposal = page.getByText("#173 Near Contract Standards");
      await proposal.click();
      expect(await page.getByPlaceholder("treasury.near").inputValue()).toBe(
        "robert.near"
      );

      expect(await page.getByTestId("total-amount").inputValue()).toBe(
        amountFromLinkedProposal.toString()
      );
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
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    const expectedTransactionModalObject = instanceConfig.showProposalSelection
      ? {
          proposal: {
            description:
              '{"title":"Near Contract Standards payment request by Robert","summary":"Contract Standards Work Group grant","notes":null,"proposalId":173}',
            kind: {
              Transfer: {
                token_id: "",
                receiver_id: "robert.near",
                amount: (
                  BigInt(amountFromLinkedProposal) *
                  10n ** 24n
                ).toString(),
              },
            },
          },
        }
      : {
          proposal: {
            description: `{"title":"Test proposal title","summary":"Test proposal summary","notes":null}`,
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
    const firstRow = page
      .locator(
        'tr[data-component="treasury-devdao.near/widget/pages.payments.Table"]'
      )
      .nth(1);
    await expect(firstRow).toContainText(
      expectedTransactionModalObject.proposal.kind.Transfer.receiver_id
    );

    const checkThatFormIsCleared = async () => {
      await page.getByRole("button", { name: " Create Request" }).click();

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
      await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
      await expect(submitBtn).toBeDisabled({ timeout: 10_000 });
    };
    await checkThatFormIsCleared();

    await page.reload();

    await checkThatFormIsCleared();
  });
});
