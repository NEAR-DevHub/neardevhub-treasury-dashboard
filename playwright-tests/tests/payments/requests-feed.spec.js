import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import { mockRpcRequest } from "../../util/rpcmock";
import {
  CurrentTimestampInNanoseconds,
  NearnFTProposal,
  NearnFTProposalWithStorage,
  TransferProposalData,
} from "../../util/inventory.js";

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("payment requests feed", function () {
  test("expect expired request to be in history", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_last_proposal_id",
      },
      modifyOriginalResultFunction: (originalResult) => {
        originalResult = 1;
        return originalResult;
      },
    });

    await page.route(
      /https:\/\/sputnik-indexer-divine-fog-3863\.fly\.dev\/proposals\/.*\?.*category=payments/,
      async (route) => {
        let originalResult = {
          proposals: [
            JSON.parse(JSON.stringify(TransferProposalData)),
            JSON.parse(JSON.stringify(TransferProposalData)),
          ],
          total: 2,
        };
        originalResult.proposals[0].id = 0;
        originalResult.proposals[1].id = 1;
        // non expired request
        originalResult[0].submission_time = CurrentTimestampInNanoseconds;
        // expired request
        originalResult[1].submission_time = "1715761329133693174";
        await route.fulfill({ json: originalResult });
      }
    );

    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await page.waitForTimeout(10_000);
    await expect(
      page.getByRole("cell", { name: "0", exact: true })
    ).toBeVisible({ timeout: 20_000 });
    await page.getByText("History").click();
    await expect(
      page.getByRole("cell", { name: "1", exact: true })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Expired")).toBeVisible({ timeout: 20_000 });
  });
  test("export action should not be visible in pending requests tab", async ({
    page,
    instanceAccount,
  }) => {
    test.setTimeout(60_000);

    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await expect(page.getByText("Pending Requests")).toBeVisible();
    await expect(
      page.getByRole("button", { name: " Export as CSV" })
    ).toBeHidden();
  });

  test("should export transaction history", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    await page.goto(`/${instanceAccount}/widget/app?page=payments&tab=history`);
    const exportLink = page.locator('a[download="proposals.csv"]');
    await expect(exportLink).toBeVisible();
    const href = await exportLink.getAttribute("href");
    expect(href).toContain(`/proposals/${daoAccount}?category=payments`);
  });

  test("should display the NEARN proposal correctly", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    await page.route(
      /https:\/\/sputnik-indexer-divine-fog-3863\.fly\.dev\/proposals\/.*\?.*category=payments/,
      async (route) => {
        await route.fulfill({
          json: {
            proposals: [
              JSON.parse(
                JSON.stringify({
                  ...NearnFTProposal,
                  submission_time: CurrentTimestampInNanoseconds,
                })
              ),
              JSON.parse(
                JSON.stringify({
                  ...NearnFTProposalWithStorage,
                  submission_time: CurrentTimestampInNanoseconds,
                })
              ),
            ],
            total: 2,
          },
        });
      }
    );

    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await page.waitForTimeout(10_000);
    if (!daoAccount.includes("infinex")) {
      await expect(page.getByRole("link", { name: "#48 " })).toBeVisible();
      await expect(page.getByRole("link", { name: "#47 " })).toBeVisible();
    }
    await expect(
      page.getByText("@new-address-super-secret.near")
    ).toBeVisible();
    await expect(page.getByText("@yurtur.near")).toBeVisible();
    await expect(page.getByText("USDt")).toBeVisible();
    await expect(page.getByText("USDC")).toBeVisible();
    await expect(page.getByText("nearn-io.near")).toHaveCount(2);
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: () => {
        return JSON.parse(JSON.stringify(NearnFTProposalWithStorage));
      },
    });
    await page.getByTestId("proposal-request-#2").click();
    await expect(
      page.getByRole("heading", {
        name: "NEARN payment to Artur-Yurii Korchynskyi for the listing",
      })
    ).toBeVisible();
    await expect(page.getByText("1 USDt")).toBeVisible();
    await expect(page.getByText("Expires At")).toBeVisible();
    await expect(page.getByRole("heading", { name: "#2" })).toBeVisible();
    await page.locator(".cursor-pointer > .bi").first().click();
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: () => {
        return JSON.parse(JSON.stringify(NearnFTProposal));
      },
    });
    await page.getByTestId("proposal-request-#1").click();
    await expect(
      page.getByRole("heading", {
        name: "NEARN payment to megha for the listing",
      })
    ).toBeVisible();
    await expect(page.getByText("1 USDC")).toBeVisible();
    await expect(page.getByText("Expires At")).toBeVisible();
    await expect(page.getByRole("heading", { name: "#1" })).toBeVisible();
  });
});
