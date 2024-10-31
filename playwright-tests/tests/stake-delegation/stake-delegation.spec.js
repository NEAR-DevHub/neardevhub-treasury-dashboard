import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getInstanceConfig } from "../../util/config.js";
import { getTransactionModalObject } from "../../util/transaction";
import { utils } from "near-api-js";
import { updateDaoPolicyMembers } from "../../util/rpcmock.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  test("Should create stake delegation request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(30_000);
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    if (
      !instanceConfig.navbarLinks.find(
        (navbarLink) => navbarLink.href === "?page=stake-delegation"
      )
    ) {
      console.log("no stake delegation page configured for instance");
      return;
    }
    await updateDaoPolicyMembers({ page });
    await page.goto(`/${instanceAccount}/widget/app?page=stake-delegation`);
    await expect(
      await page.locator("div").filter({ hasText: /^Stake Delegation$/ })
    ).toBeVisible();
    const createRequestButton = await page.getByText("Create Request");
    await createRequestButton.click();
    await page.waitForTimeout(1000);
    const selectButtons = await page.locator("button", { hasText: "select" });
    while (selectButtons.count() < 2 || !selectButtons.first().isEnabled()) {
      await page.waitForTimeout(100);
    }

    const firstStakingPoolSelect = await selectButtons.first();

    await firstStakingPoolSelect.click();
    const stakingPoolAccount = await page
      .locator("div.fw-bold", { hasText: "poolv1.near" })
      .first()
      .innerText();
    await page.getByText("Use Max").click();
    const stakingAmount = await page
      .locator('input[placeholder="Enter amount"]')
      .first()
      .inputValue();
    const availableBalance = await page
      .locator("div.text-green", { hasText: "Available Balance" })
      .locator("+h6")
      .first()
      .innerText();
    await expect(stakingAmount).toBe(availableBalance);

    await page.getByRole("button", { name: "Submit" }).click();
    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: '{"isStakeRequest":true,"notes":null}',
        kind: {
          FunctionCall: {
            receiver_id: stakingPoolAccount,
            actions: [
              {
                method_name: "deposit_and_stake",
                args: "",
                deposit: utils.format.parseNearAmount(stakingAmount),
                gas: "200000000000000",
              },
            ],
          },
        },
      },
    });
    await page.waitForTimeout(500);
  });
});
