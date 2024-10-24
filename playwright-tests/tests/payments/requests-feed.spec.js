import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import { mockRpcRequest } from "../../util/rpcmock";
import { transferProposalData } from "../../util/inventory.js";

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
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposals",
      },
      modifyOriginalResultFunction: () => {
        let originalResult = [
          JSON.parse(JSON.stringify(transferProposalData)),
          JSON.parse(JSON.stringify(transferProposalData)),
        ];
        originalResult[0].id = 0;
        originalResult[1].id = 1;
        // non expired request
        originalResult[0].submission_time = "1729783791239912448";
        // expired request
        originalResult[1].submission_time = "1715761329133693174";
        return originalResult;
      },
    });

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
});
