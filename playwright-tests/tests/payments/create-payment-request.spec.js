import { test, expect } from "@playwright/test";
import { getTransactionModalObject } from "../../util/transaction";

test("should go to trustees dashboard", async ({ page }) => {
    await page.goto("/treasury-devdao.near/widget/app?page=payments");

    const createPaymentRequestButton = await page.getByRole('button', { name: ' Create Request' });
    await expect(createPaymentRequestButton).toBeVisible();
    await createPaymentRequestButton.click();
    const proposalSelect = await page.locator('.dropdown-toggle').first();
    await proposalSelect.click();
    const proposal = await page.getByText('#173 Near Contract Standards');
    await proposal.click();
    await expect(await page.getByTestId('receiver').inputValue()).toBe("robert.near");
    await expect(await page.getByTestId('total-amount').inputValue()).toBe("3120");
    await page.getByRole('button', { name: 'Submit' }).click();


    await expect(await getTransactionModalObject(page)).toEqual({
        "proposal": {
            "description": "{\"title\":\"Near Contract Standards payment request by Robert\",\"summary\":\"Contract Standards Work Group grant\",\"notes\":null,\"proposalId\":173}",
            "kind": {
                "Transfer": {
                    "token_id": "",
                    "receiver_id": "robert.near",
                    "amount": "3120000000000000000000000000"
                }
            }
        }
    });
});
