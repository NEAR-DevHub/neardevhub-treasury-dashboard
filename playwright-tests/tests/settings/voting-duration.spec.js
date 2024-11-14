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
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    const newDurationDays = currentDurationDays + 3;
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill(newDurationDays.toString());

    await page.waitForTimeout(500);
    await page.getByText("Submit").click();

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Change proposal period",
        kind: {
          ChangePolicyUpdateParameters: {
            parameters: {
              proposal_period: (
                BigInt(newDurationDays) *
                60n *
                60n *
                24n *
                1_000_000_000n
              ).toString(),
            },
          },
        },
      },
    });
  });

  test("cancelling set voting duration should reset to original value", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=settings`);
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill((currentDurationDays + 3).toString());

    await page.waitForTimeout(500);
    await page.getByText("Cancel").click();

    await expect(
      await page.getByPlaceholder("Enter voting duration days")
    ).toHaveValue("7");
  });
});
