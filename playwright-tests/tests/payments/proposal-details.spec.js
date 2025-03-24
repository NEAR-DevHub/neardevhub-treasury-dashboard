import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  CurrentTimestampInNanoseconds,
  TransferProposalData,
} from "../../util/inventory.js";
import { mockRpcRequest } from "../../util/rpcmock.js";

async function mockPaymentProposals({ page, status }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposals",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = [JSON.parse(JSON.stringify(TransferProposalData))];
      originalResult[0].id = 1;
      originalResult[0].status = status;
      originalResult[0].submission_time = CurrentTimestampInNanoseconds;
      return originalResult;
    },
  });
}

async function mockPaymentProposal({ page, status }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: () => {
      let originalResult = JSON.parse(JSON.stringify(TransferProposalData));
      originalResult.id = 1;
      originalResult.status = status;
      return originalResult;
    },
  });
}

const proposalStatuses = [
  "Approved",
  "Rejected",
  "Failed",
  "Expired",
  "InProgress",
];

test.describe
  .parallel("should display proposals of different status correctly", () => {
  proposalStatuses.forEach((status) => {
    test(`proposal with status '${status}' should be displayed correctly`, async ({
      page,
      instanceAccount,
    }) => {
      const notInProgress = status !== "InProgress";
      await mockPaymentProposals({ page, status });
      await page.goto(`/${instanceAccount}/widget/app?page=payments`);
      await page.waitForTimeout(10_000);

      if (notInProgress) {
        await page.getByText("History", { exact: true }).click();
        await page.waitForTimeout(5_000);
      }

      const proposalCell = page.getByTestId("proposal-request-#1");
      await expect(proposalCell).toBeVisible({ timeout: 20_000 });
      await mockPaymentProposal({ page, status });
      await proposalCell.click();

      await expect(page.getByRole("heading", { name: "#1" })).toBeVisible();
      if (notInProgress) {
        await expect(
          page.getByText(
            `Payment request ${status === "Approved" ? "Funded" : status}`
          )
        ).toBeVisible();
      }
    });
  });
});
