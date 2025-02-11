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

async function navigateToThemePage({ page, instanceAccount }) {
  await page.goto(
    `/${instanceAccount}/widget/app?page=settings&selectedTab=theme-logo`
  );
  await updateDaoPolicyMembers({ instanceAccount, page });
  await updateDaoConfig({ page });
  await page.waitForTimeout(5_000);
  await page.getByTestId("Theme & Logo", { exact: true }).click();
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
  ];

  for (const role of roles) {
    test.describe(`User with '${role.name}'`, function () {
      test.use({ storageState: role.storageState });

      test("should not be able to change config", async ({
        page,
        instanceAccount,
      }) => {
        test.setTimeout(60_000);
        await updateDaoPolicyMembers({ instanceAccount, page });
        await navigateToThemePage({ page, instanceAccount });
        await expect(page.locator("input[type='color']")).toBeDisabled();
        await expect(
          page.getByRole("button", { name: "Submit Request" })
        ).toBeDisabled({ timeout: 20_000 });
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
    await expect(submitBtn).toBeDisabled(submitBtn);
    await logoInput.setInputFiles(path.join(__dirname, "./assets/valid.jpg"));
    await submitBtn.click();
    await expect(page.getByText("Processing your request ...")).toBeVisible();

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

  test("should be able to change color and theme", async ({ page }) => {
    test.setTimeout(150_000);
    const newColor = "#0000";
    await page.getByRole("textbox").nth(1).fill(newColor);
    await page.getByTestId("dropdown-btn").click();
    await page.getByText("Light").click();
    await page.getByRole("button", { name: "Submit Request" }).click();
    await expect(page.getByText("Processing your request ...")).toBeVisible();
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

  test("should display a transaction error toast when the transaction confirmation modal is canceled", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.getByRole("button", { name: "Submit Request" }).click();
    await expect(page.getByText("Processing your request ...")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).nth(1).click();
    await expect(
      page.getByText(
        "Something went wrong. Please try resubmitting the request"
      )
    ).toBeVisible({ timeout: 30_000 });
  });
});
