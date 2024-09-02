import { test, expect } from "@playwright/test";
import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction";
import { mockRpcRequest } from "../../util/rpcmock";
import { setDontAskAgainCacheValues } from "../../util/cache";

test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  test("create manual payment request", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/treasury-devdao.near/widget/app?page=payments");

    const createPaymentRequestButton = await page.getByRole("button", {
      name: "Create Request",
    });
    await expect(createPaymentRequestButton).toBeVisible();
    await createPaymentRequestButton.click();

    const proposalSelect = await page.locator(".dropdown-toggle").first();
    await expect(proposalSelect).toBeVisible();
    await expect(
      await proposalSelect.getByText("Select", { exact: true })
    ).toBeVisible();

    await proposalSelect.click();
    await page.getByText("Add manual request").click();
    await page.getByTestId("proposal-title").fill("Test proposal title");
    await page.getByTestId("proposal-summary").fill("Test proposal summary");

    await page.getByPlaceholder("treasury.near").fill("webassemblymusic.near");
    await page.getByTestId("total-amount").fill("3");

    const tokenSelect = await page.getByTestId("tokens-dropdown");
    await tokenSelect.click();
    await tokenSelect.getByText("NEAR").click();

    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    submitBtn.click();

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description:
          '{"title":"Test proposal title","summary":"Test proposal summary","notes":""}',
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
  test("create payment request", async ({ page }) => {
    await page.goto("/treasury-devdao.near/widget/app?page=payments");

    const createPaymentRequestButton = await page.getByRole("button", {
      name: "Create Request",
    });
    await expect(createPaymentRequestButton).toBeVisible();
    await createPaymentRequestButton.click();
    const proposalSelect = await page.locator(".dropdown-toggle").first();
    await expect(proposalSelect).toBeVisible();
    await expect(
      await proposalSelect.getByText("Select", { exact: true })
    ).toBeVisible();

    await proposalSelect.click();
    const proposal = await page.getByText("#173 Near Contract Standards");
    await proposal.click();
    await expect(
      await page.getByPlaceholder("treasury.near").inputValue()
    ).toBe("robert.near");
    await expect(await page.getByTestId("total-amount").inputValue()).toBe(
      "3120"
    );
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    submitBtn.click();

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description:
          '{"title":"Near Contract Standards payment request by Robert","summary":"Contract Standards Work Group grant","notes":null,"proposalId":173}',
        kind: {
          Transfer: {
            token_id: "",
            receiver_id: "robert.near",
            amount: "3120000000000000000000000000",
          },
        },
      },
    });
  });
});

test.describe("don't ask again", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });
  test("approve payment request", async ({ page }) => {
    test.setTimeout(60_000);
    const contractId = "testing-astradao.sputnik-dao.near";
    let isTransactionCompleted = false;
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposals",
      },
      modifyOriginalResultFunction: (originalResult) => {
        if (isTransactionCompleted) {
          originalResult[0].status = "Approved";
        } else {
          originalResult[0].status = "InProgress";
        }
        originalResult[0].kind = "Transfer";
        return originalResult.slice(0, 1);
      },
    });
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        console.log("get_proposal", originalResult);
        if (isTransactionCompleted) {
          originalResult.votes["theori.near"] = "Approve";
        }
        return originalResult;
      },
    });
    await page.goto("/treasury-devdao.near/widget/app?page=payments");
    await setDontAskAgainCacheValues({
      page,
      widgetSrc: "treasury-devdao.near/widget/components.VoteActions",
      contractId,
      methodName: "act_proposal",
    });

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
        await route.fallback();
      }
    );
    const approveButton = await page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 10000 });
    await approveButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(approveButton).toBeDisabled();

    const transaction_toast = await page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
    await expect(transaction_toast).not.toBeVisible();
    await page
      .locator("li")
      .filter({ hasText: "History" })
      .locator("div")
      .click();
    await expect(await page.getByText("Funded").first()).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(1_000);
  });
});
