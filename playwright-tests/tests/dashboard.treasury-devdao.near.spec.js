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

    const loginCard = await page.getByText("Login Below Connect Wallet");
    await loginCard.waitFor({ state: "visible" });
    expect(await loginCard.isVisible()).toBeTruthy();
  });
});

test.describe("Wallet is connected with moderator account", () => {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-moderator.json",
  });

  test("should go to payment request moderator page", async ({ page }) => {
    await page.goto(
      "/dashboard.treasury-devdao.near/widget/neardevhub-trustees.components.pages.app"
    );

    let isVideoRecorded = (await page.video()) ? true : false;

    const dashboardHeader = await page.getByText("DevDAO Dashboard");
    await dashboardHeader.waitFor({ state: "visible" });
    expect(await dashboardHeader.isVisible()).toBeTruthy();
    await page.getByText("Moderators").click();
    const createPaymentRequestTab = await page.getByRole("link", {
      name: "Create Payment Request",
    });
    await createPaymentRequestTab.waitFor({ state: "visible" });
    expect(await createPaymentRequestTab.isVisible()).toBeTruthy();

    if (isVideoRecorded) await page.waitForTimeout(500);

    await page.getByText("Seach proposals").click();

    const firstProposal = await page.getByText("Id 0 : title");
    await firstProposal.waitFor({ state: "visible" });
    if (isVideoRecorded) await page.waitForTimeout(500);

    const searchById = await page.getByPlaceholder("Search by Id");
    await searchById.click();
    expect(await searchById.isVisible()).toBeTruthy();
    if (isVideoRecorded) await page.waitForTimeout(500);

    await page.getByText("Id 0 : title").click();
    expect(await searchById.isVisible()).toBeFalsy();

    if (isVideoRecorded) await page.waitForTimeout(500);
    await page.getByText("Id 0 : title").click();
    await searchById.waitFor({ state: "visible" });
    expect(await searchById.isVisible()).toBeTruthy();

    if (isVideoRecorded) await page.waitForTimeout(500);

    await page.locator(".dropdown-toggle").first().click();
    expect(await searchById.isVisible()).toBeFalsy();

    if (isVideoRecorded) await page.waitForTimeout(500);
  });
});
