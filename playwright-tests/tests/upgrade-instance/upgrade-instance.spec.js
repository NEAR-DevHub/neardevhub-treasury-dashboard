import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { SandboxRPC } from "../../util/sandboxrpc";

test.describe("Admin is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should go to system upgrade page", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(200_000);
    const sandbox = new SandboxRPC();
    await sandbox.init();

    const widget_reference_account_id = "treasury-testing.near";
    await sandbox.setupWidgetReferenceAccount(widget_reference_account_id);

    await page.goto(
      `/${instanceAccount}/widget/app?page=settings&selectedTab=system-upgrade`
    );
    await expect(page.getByText("Web4 updates")).toBeVisible({
      timeout: 10_000,
    });

    await sandbox.quitSandbox();
  });
});
