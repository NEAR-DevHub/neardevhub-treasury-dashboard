import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getInstanceConfig } from "../../util/config.js";
import {
  getTransactionModalObject
} from "../../util/transaction";

test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  test("Should create stake delegation request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await expect(await page.getByText('Stake Delegation')).toBeVisible();
    const createRequestButton = await page.getByText('Create Request');
    await createRequestButton.click();
    const firstStakingPoolSelect = await page.locator("button", {hasText: "select"}).first();
    
    await firstStakingPoolSelect.click();
    const stakingPoolAccount = await page.locator("div.fw-bold", {hasText: "poolv1.near"}).first().innerText();
    await page.getByText('Use Max').click();
    const stakingAmount = await page.getByTestId('total-amount').inputValue();
    const availableBalance = await page.locator('div.text-green', {hasText: "Available Balance"}).locator("+h6").first().innerText();
    await expect(stakingAmount).toBe(availableBalance);

    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(await getTransactionModalObject(page)).toEqual({    
      "proposal": {
        "description": "{\"isStakeRequest\":true,\"notes\":null}",
        "kind": {
          "FunctionCall": {
            "receiver_id": stakingPoolAccount,
            "actions": [
              {
                "method_name": "deposit_and_stake",
                "args": "",
                "deposit": (BigInt(Number(stakingAmount) * 1000_000) * 1_00000000_0000000000n).toString(),
                "gas": "200000000000000"
              }
            ]
          }
        }
      }
    });
  });
});
