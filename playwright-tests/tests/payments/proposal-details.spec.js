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

async function readClipboard({ page, expectedText }) {
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toBe(expectedText);
}

async function checkProposalDetailPage({
  page,
  status,
  isCompactVersion,
  instanceAccount,
}) {
  const notInProgress = status !== "InProgress";
  if (notInProgress) {
    await expect(
      page.getByText(
        `Payment request ${status === "Approved" ? "Funded" : status}`
      )
    ).toBeVisible({ timeout: 20_000 });
  }
  const copyReceiverAddr = await page.getByText("Copy Address");
  await expect(copyReceiverAddr).toBeVisible();
  await copyReceiverAddr.click();
  await readClipboard({ page, expectedText: "megha19.near" });

  if (isCompactVersion) {
    const highlightedProposalRow = page.locator("tr").nth(1);
    await expect(highlightedProposalRow).toHaveClass(
      "cursor-pointer proposal-row bg-highlight"
    );
    const heading = page.getByRole("heading", { name: "#1" });
    await expect(heading).toBeVisible();
    const cancelBtn = await page.locator(".cursor-pointer > .bi").first();
    await cancelBtn.click();
    await expect(heading).toBeHidden();
    await expect(highlightedProposalRow).not.toHaveClass("bg-highlight");
  } else {
    const copyLink = await page.getByText("Copy link");
    await copyLink.click();
    await readClipboard({
      page,
      expectedText: `https://near.social/${instanceAccount}/widget/app?page=payments&id=1`,
    });
    const backBtn = await page.getByRole("button", { name: " Back" });
    await backBtn.click();
    const newUrl = await page.url();
    await expect(newUrl).toBe(
      `http://localhost:8080/${instanceAccount}/widget/app?page=payments`
    );
  }
}

test.describe
  .parallel("should display proposals of different status correctly", () => {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  });
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

      await checkProposalDetailPage({
        page,
        status,
        instanceAccount,
        isCompactVersion: true,
      });
    });
  });

  test(`proposal details link should open correctly`, async ({
    page,
    instanceAccount,
  }) => {
    const status = "Approved";
    await mockPaymentProposal({ page, status });
    await page.goto(`/${instanceAccount}/widget/app?page=payments&id=1`);
    await checkProposalDetailPage({
      page,
      status,
      instanceAccount,
      isCompactVersion: false,
    });
  });
});
