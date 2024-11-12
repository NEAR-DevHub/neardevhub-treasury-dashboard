import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction.js";

test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should set voting duration", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    await page.getByPlaceholder("Enter voting duration days").fill("10");

    await page.waitForTimeout(500);
    await page.getByText("Submit").click();

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Change proposal period",
        kind: {
          ChangePolicyUpdateParameters: {
            parameters: {
              proposal_period: "864000000000000",
            },
          },
        },
      },
    });
  });
});
