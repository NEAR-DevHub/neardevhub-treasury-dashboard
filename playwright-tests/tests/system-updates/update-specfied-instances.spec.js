import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import { KeyPairEd25519 } from "near-workspaces";

test("should show system-update for targeted instance", async ({ page }) => {
  const contractId = "treasury-testing-infinex.near";

  await redirectWeb4({
    contractId,
    page,
    callWidgetNodeURLForContractWidgets: true,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
    return [
      {
        id: 1,
        createdDate: "2025-03-25",
        version: "n/a",
        type: "DAO contract",
        summary: "Update to latest sputnik-dao contract",
        details: "",
        instances: ["infinex.near", "treasury-testing-infinex.near"],
        votingRequired: true,
      }
  ];
  `,
    },
  });

  // Mock the RPC calls to return different contract codes
  await page.route(
    "https://rpc.mainnet.fastnear.com/",
    async (route, request) => {
      const requestBody = request.postDataJSON();

      if (
        requestBody.method === "query" &&
        requestBody.params.request_type === "call_function" &&
        requestBody.params.method_name === "get_default_code_hash" &&
        requestBody.params.account_id === "sputnik-dao.near"
      ) {
        // Return a different hash for the factory default to ensure update is shown
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: requestBody.id,
            result: {
              result: [
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
                19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
              ],
            },
          }),
        });
      } else {
        await route.fallback();
      }
    }
  );

  await page.goto(`https://${contractId}.page/?page=settings`);
  await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

  await expect(page.getByText("New system update published")).toBeVisible();

  await page.getByRole("link", { name: "Review" }).click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible({ timeout: 15_000 });
});

test("should not show system-update for others than targeted instances", async ({
  page,
}) => {
  const contractId = "treasury-testing-infinex.near";
  await redirectWeb4({
    contractId,
    page,
    callWidgetNodeURLForContractWidgets: true,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
      return [
        {
          id: 1,
          createdDate: "2025-03-25",
          version: "n/a",
          type: "DAO contract",
          summary: "Update to latest sputnik-dao contract",
          details: "",
          instances: ["infinex.near", "treasury-devdao.near"],
          votingRequired: true,
        }
    ];
    `,
    },
  });
  await page.goto(`https://${contractId}.page/?page=settings`);
  await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

  await expect(
    page.getByText("New system updates published")
  ).not.toBeVisible();

  await page.getByRole("link", { name: "System updates" }).click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).not.toBeVisible();
});

test("should show system-update if no target instances specified", async ({
  page,
}) => {
  const contractId = "treasury-testing-infinex.near";

  await redirectWeb4({
    contractId,
    page,
    callWidgetNodeURLForContractWidgets: true,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
      return [
        {
          id: 1,
          createdDate: "2025-03-25",
          version: "n/a",
          type: "DAO contract",
          summary: "Update to latest sputnik-dao contract",
          details: "",
          votingRequired: true,
        }
    ];
    `,
    },
  });

  // Mock the RPC calls to return different contract codes
  await page.route(
    "https://rpc.mainnet.fastnear.com/",
    async (route, request) => {
      const requestBody = request.postDataJSON();

      if (
        requestBody.method === "query" &&
        requestBody.params.request_type === "call_function" &&
        requestBody.params.method_name === "get_default_code_hash" &&
        requestBody.params.account_id === "sputnik-dao.near"
      ) {
        // Return a different hash for the factory default
        // The result should be an array of numbers (bytes)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: requestBody.id,
            result: {
              result: [
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
                19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
              ],
            },
          }),
        });
      } else {
        await route.fallback();
      }
    }
  );
  await page.goto(`https://${contractId}.page/?page=settings`);
  await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

  await expect(page.getByText("New system update published")).toBeVisible();

  await page.getByRole("link", { name: "Review" }).click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible({ timeout: 15_000 });
});
