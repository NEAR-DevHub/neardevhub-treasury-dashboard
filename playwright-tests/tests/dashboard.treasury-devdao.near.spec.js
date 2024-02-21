import { test, expect } from "@playwright/test";

test.describe("Wallet is not connected", () => {
  test("should go to trustees dashboard and show login page", async ({
    page,
  }) => {
    await page.goto(
      "/dashboard.treasury-devdao.near/widget/neardevhub-trustees.components.pages.app"
    );

    const dashboardHeader = await page.getByText("DevDAO Dashboard");
    await dashboardHeader.waitFor({ state: "visible" });
    expect(await dashboardHeader.isVisible()).toBeTruthy();

    const loginCard = await page.getByText('Login Below Connect Wallet');
    await loginCard.waitFor({ state: "visible" });
    expect(await loginCard.isVisible()).toBeTruthy();
  });
});

test.describe("Wallet is connected with moderator account", () => {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-moderator.json",
  });

  test("should go to trustees dashboard and show login page", async ({
    page,
  }) => {
    await page.goto(
      "/dashboard.treasury-devdao.near/widget/neardevhub-trustees.components.pages.app"
    );

    const dashboardHeader = await page.getByText("DevDAO Dashboard");
    await dashboardHeader.waitFor({ state: "visible" });
    expect(await dashboardHeader.isVisible()).toBeTruthy();
    await page.getByText('Moderators').click();
    const createPaymentRequestTab = await page.getByRole('link', { name: 'Create Payment Request' });
    await createPaymentRequestTab.waitFor({ state: "visible" });
    expect(await createPaymentRequestTab.isVisible()).toBeTruthy();
  });
});
