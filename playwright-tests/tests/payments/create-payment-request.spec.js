import { test, expect } from "@playwright/test";
import { getTransactionModalObject, mockTransactionSubmitRPCResponses } from "../../util/transaction";
import { mockRpcRequest } from "../../util/rpcmock";
import { setDontAskAgainCacheValues } from "../../util/cache";

test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  test("create payment request", async ({ page }) => {
    await page.goto("/treasury-devdao.near/widget/app?page=payments");

    const createPaymentRequestButton = await page.getByRole("button", {
      name: " Create Request",
    });
    await expect(createPaymentRequestButton).toBeVisible();
    await createPaymentRequestButton.click();
    const proposalSelect = await page.locator(".dropdown-toggle").first();
    await proposalSelect.click();
    const proposal = await page.getByText("#173 Near Contract Standards");
    await proposal.click();
    await expect(await page.getByTestId("receiver").inputValue()).toBe(
      "robert.near"
    );
    await expect(await page.getByTestId("total-amount").inputValue()).toBe(
      "3120"
    );
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(await page.getByText("Deposit: 0.1 NEAR")).toBeVisible();
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
    storageState: "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });
  test("approve payment request", async ({ page }) => {
    const contractId = "testing-astradao.sputnik-dao.near";
    await page.goto("/treasury-devdao.near/widget/app?page=payments");
    await setDontAskAgainCacheValues({page, widgetSrc: "treasury-devdao.near/widget/components.VoteActions",
        contractId, methodName: "act_proposal"});

    let isTransactionCompleted = false;
    await mockRpcRequest({
      page, filterParams: {
        "method_name": "get_proposals",
      }, modifyOriginalResultFunction: (originalResult) => {
        if (isTransactionCompleted) {
          originalResult[0].status = "Approved";
        } else {
          originalResult[0].status = "InProgress";
        }
        originalResult[0].kind = "Transfer";
        return originalResult.slice(0, 1);
      }
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
    const approveButton = await page.getByRole('button', { name: 'Approve' })
    await expect(approveButton).toBeEnabled();
    await approveButton.click();
    await expect(approveButton).toBeDisabled();


    const transaction_toast = await page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
    await expect(transaction_toast).not.toBeVisible();

  });
});


