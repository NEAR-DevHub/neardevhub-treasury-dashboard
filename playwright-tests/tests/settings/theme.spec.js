import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction.js";
import {
  mockRpcRequest,
  updateDaoPolicyMembers,
  mockNearBalances,
} from "../../util/rpcmock.js";
import path from "path";
import { fileURLToPath } from "url";
import { InsufficientBalance } from "../../util/lib.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

const metadata = {
  flagLogo:
    "https://ipfs.near.social/ipfs/bafkreiboarigt5w26y5jyxyl4au7r2dl76o5lrm2jqjgqpooakck5xsojq",
  displayName: "testing-astradao",
  primaryColor: "#2f5483",
  theme: "dark",
};

const config = {
  name: "testing-astradao",
  metadata: toBase64(metadata),
};

async function updateDaoConfig({ page }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_config",
    },
    modifyOriginalResultFunction: () => {
      return config;
    },
  });
}

async function navigateToThemePage({ page, instanceAccount, hasAllRole }) {
  await page.goto(
    `/${instanceAccount}/widget/app?page=settings&tab=theme-logo`
  );
  await updateDaoPolicyMembers({ instanceAccount, page, hasAllRole });
  await updateDaoConfig({ page });
  await page.waitForTimeout(5_000);
  await expect(page.getByText("Theme & Logo").nth(1)).toBeVisible();
}

test.describe.parallel("User logged in with different roles", function () {
  const roles = [
    {
      name: "Create role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-create-role.json",
    },
    {
      name: "Vote role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-vote-role.json",
    },
    {
      name: "All role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-all-role.json",
      hasAllRole: true,
    },
  ];

  for (const { name, storageState, hasAllRole } of roles) {
    test.describe(`User with '${name}'`, function () {
      test.use({ storageState: storageState });

      test("should only allow authorized users to change config", async ({
        page,
        instanceAccount,
      }) => {
        test.setTimeout(60_000);
        await navigateToThemePage({ page, instanceAccount, hasAllRole });
        const colorInput = page.locator("input[type='color']");
        const submitButton = page.getByRole("button", {
          name: "Submit Request",
        });

        if (hasAllRole) {
          await expect(colorInput).toBeEnabled();
        } else {
          await expect(colorInput).toBeDisabled();
          await expect(submitButton).toBeDisabled({ timeout: 20_000 });
        }
      });
    });
  }
});

test.describe("User is logged in", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test.beforeEach(async ({ page, instanceAccount }, testInfo) => {
    if (testInfo.title.includes("insufficient account balance")) {
      await mockNearBalances({
        page,
        accountId: "theori.near",
        balance: InsufficientBalance,
        storage: 8,
      });
    }
    await navigateToThemePage({ page, instanceAccount });
  });

  test("insufficient account balance should show warning modal, disallow action ", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await expect(
      page.getByText(
        "Hey Ori, you don't have enough NEAR to complete actions on your treasury."
      )
    ).toBeVisible();
    const colorInput = page.getByRole("textbox").nth(1);
    await colorInput.fill("#000");
    await page
      .getByText("Submit Request", {
        exact: true,
      })
      .click();
    await expect(
      page
        .getByText("Please add more funds to your account and try again")
        .nth(1)
    ).toBeVisible();
  });

  test("should be able to upload image, should show error with incorrect width and allow correct one", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await expect(
      page.frameLocator("iframe").getByRole("button", { name: "Upload Logo" })
    ).toBeVisible();
    await page.route("https://ipfs.near.social/add", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ cid: "simple_cid_1" }),
      });
    });

    const logoInput = await page
      .frameLocator("iframe")
      .locator("input[type=file]");
    const submitBtn = await page.getByRole("button", {
      name: "Submit Request",
    });
    // invalid image
    await logoInput.setInputFiles(path.join(__dirname, "./assets/invalid.png"));
    await expect(
      page.getByText(
        "Invalid logo. Please upload a PNG, JPG, or SVG file for your logo that is exactly 256x256 px"
      )
    ).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    await logoInput.setInputFiles(path.join(__dirname, "./assets/valid.jpg"));
    await submitBtn.click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "* Title: Update Config - Theme & logo",
        kind: {
          ChangeConfig: {
            config: {
              ...config,
              metadata: toBase64({
                ...metadata,
                flagLogo: "https://ipfs.near.social/ipfs/simple_cid_1",
              }),
            },
          },
        },
      },
    });
  });

  test("should show error when upload image fails", async ({ page }) => {
    test.setTimeout(150_000);
    await expect(
      page.frameLocator("iframe").getByRole("button", { name: "Upload Logo" })
    ).toBeVisible();
    await page.route("https://ipfs.near.social/add", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "" }),
      });
    });
    const submitBtn = await page.getByRole("button", {
      name: "Submit Request",
    });
    const logoInput = await page
      .frameLocator("iframe")
      .locator("input[type=file]");
    await logoInput.setInputFiles(path.join(__dirname, "./assets/valid.jpg"));
    await expect(submitBtn).toBeDisabled();
    await expect(
      page.getByText("Error occured while uploading image, please try again.")
    ).toBeVisible();
  });

  test("should be able to change color and theme", async ({ page }) => {
    test.setTimeout(150_000);
    const newColor = "#0000";
    await page.getByRole("textbox").nth(1).fill(newColor);
    await page.getByTestId("dropdown-btn").click();
    await page.getByText("Light").click();
    await page.getByRole("button", { name: "Submit Request" }).click();
    await expect(
      page.getByText("Awaiting transaction confirmation...")
    ).toBeVisible();
    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "* Title: Update Config - Theme & logo",
        kind: {
          ChangeConfig: {
            config: {
              ...config,
              metadata: toBase64({
                ...metadata,
                primaryColor: newColor,
                theme: "light",
              }),
            },
          },
        },
      },
    });
  });

  test("submit action should show transaction loader and handle cancellation correctly", async ({
    page,
  }) => {
    test.setTimeout(100_000);
    const colorInput = page.getByRole("textbox").nth(1);
    await colorInput.fill("#000");
    const submitBtn = page.getByRole("button", { name: "Submit Request" });
    await submitBtn.click();
    const loader = page.getByText("Awaiting transaction confirmation...");
    await expect(loader).toBeVisible();
    await expect(submitBtn).toBeDisabled();
    await page.getByRole("button", { name: "Close" }).nth(1).click();
    await page
      .locator(".toast-body")
      .getByRole("button", { name: "Cancel" })
      .click();
    await expect(loader).toBeHidden();
    await expect(submitBtn).toBeEnabled();
  });

  test("should toggle action buttons based on form changes", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    // Reference action buttons
    const submitRequestButton = page.getByText("Submit Request");
    const cancelButton = page.getByRole("button", { name: "Cancel" });

    // Initially, both buttons should be disabled
    await expect(submitRequestButton).toBeDisabled();
    await expect(cancelButton).toBeDisabled();

    // Changing color input should enable the buttons
    const colorInput = page.getByRole("textbox").nth(1);
    await colorInput.fill("#000");

    await expect(submitRequestButton).toBeEnabled();
    await expect(cancelButton).toBeEnabled();

    // Clicking the cancel button should reset the form and disable both buttons
    await cancelButton.click();
    await expect(submitRequestButton).toBeDisabled();
    await expect(cancelButton).toBeDisabled();
  });
});
