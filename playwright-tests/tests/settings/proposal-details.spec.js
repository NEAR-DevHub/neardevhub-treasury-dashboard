import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import {
  CurrentTimestampInNanoseconds,
  SettingsMemberProposalData,
  SettingsVotingDurationProposalData,
  SettingsVotingThresholdProposalData,
  SettingsThemeProposalData,
  OldSettingsProposalData,
} from "../../util/inventory.js";
import { mockRpcRequest } from "../../util/rpcmock.js";

const RequestType = {
  MEMBERS: "Members",
  VOTING_THRESHOLD: "Voting Threshold",
  VOTING_DURATION: "Voting Duration",
  THEME: "Theme",
  OTHER: "Settings",
};

function getProposalDataByType(type) {
  switch (type) {
    case RequestType.MEMBERS:
      return SettingsMemberProposalData;
    case RequestType.VOTING_DURATION:
      return SettingsVotingDurationProposalData;
    case RequestType.VOTING_THRESHOLD:
      return SettingsVotingThresholdProposalData;
    case RequestType.THEME:
      return SettingsThemeProposalData;
    default:
      return OldSettingsProposalData;
  }
}

async function mockSettingsProposals({ page, status, type }) {
  await page.route(/\/proposals\/.*\?.*proposal_types=.*/, async (route) => {
    const proposal = getProposalDataByType(type);
    let originalResult = [JSON.parse(JSON.stringify(proposal))];
    originalResult[0].id = 0;
    originalResult[0].status = status;
    originalResult[0].submission_time = CurrentTimestampInNanoseconds;
    await route.fulfill({
      json: {
        proposals: originalResult,
        total: 1,
      },
    });
  });
}

async function mockSettingProposal({ page, status, type }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_proposal",
    },
    modifyOriginalResultFunction: () => {
      const proposal = getProposalDataByType(type);
      let originalResult = JSON.parse(JSON.stringify(proposal));
      originalResult.id = 0;
      originalResult.status = status;
      if (status === "InProgress") {
        originalResult.submission_time = CurrentTimestampInNanoseconds;
      }
      return originalResult;
    },
  });
}

const proposalStatuses = [
  { status: "Approved", type: RequestType.THEME },
  { status: "Rejected", type: RequestType.VOTING_DURATION },
  { status: "Failed", type: RequestType.VOTING_THRESHOLD },
  { status: "Expired", type: RequestType.MEMBERS },
  { status: "InProgress", type: RequestType.OTHER },
];

async function readClipboard({ page, expectedText }) {
  const copiedText = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedText).toBe(expectedText);
}

async function checkProposalDetailPage({
  page,
  status,
  type,
  isCompactVersion,
  instanceAccount,
}) {
  const notInProgress = status !== "InProgress";
  const requestStatus = page.getByText(
    `Request ${status === "Approved" ? "Executed" : status}`
  );
  if (notInProgress) {
    await expect(requestStatus).toBeVisible({ timeout: 20_000 });
  } else {
    await expect(requestStatus).toBeHidden({ timeout: 20_000 });
  }
  await expect(
    page.locator("label").filter({ hasText: "Transaction Details" })
  ).toBeVisible();

  switch (type) {
    case RequestType.MEMBERS: {
      await expect(page.getByText("Assigned Roles")).toBeVisible();
      break;
    }
    case RequestType.VOTING_DURATION: {
      await expect(page.getByText("Old Duration")).toBeVisible();
      await expect(page.getByText("New Duration")).toBeVisible();
      break;
    }
    case RequestType.VOTING_THRESHOLD: {
      await expect(page.getByText("Old Threshold")).toBeVisible();
      await expect(page.getByText("New Threshold")).toBeVisible();
      break;
    }
    case RequestType.THEME: {
      await expect(page.getByText("Logo:")).toBeVisible();
      await expect(page.getByText("Primary Color")).toBeVisible();
      await expect(page.getByText("Theme:")).toBeVisible();

      break;
    }
  }
  if (isCompactVersion) {
    const highlightedProposalRow = page.locator("tr").nth(1);
    await expect(highlightedProposalRow).toHaveClass(
      "cursor-pointer proposal-row bg-highlight"
    );
    const heading = page.getByRole("heading", { name: "#0" });
    await expect(heading).toBeVisible();
    if (!notInProgress || status === "Approved") {
      await page.getByRole("link", { name: "" }).click();
      const backBtn = await page.getByRole("button", { name: " Back" });
      await backBtn.click();
      const newUrl = await page.url();
      await expect(newUrl).toBe(
        `http://localhost:8080/${instanceAccount}/widget/app?page=settings` +
          (notInProgress ? "&tab=history" : "")
      );
    } else {
      const cancelBtn = await page.locator(".cursor-pointer > .bi").first();
      await cancelBtn.click();
      await expect(heading).toBeHidden();
      await expect(highlightedProposalRow).not.toHaveClass("bg-highlight");
    }
  } else {
    const copyLink = await page.getByText("Copy link");
    await copyLink.click();
    await readClipboard({
      page,
      expectedText: `https://near.social/${instanceAccount}/widget/app?page=settings&id=0`,
    });
    const backBtn = await page.getByRole("button", { name: " Back" });
    await backBtn.click();
    const newUrl = await page.url();
    await expect(newUrl).toBe(
      `http://localhost:8080/${instanceAccount}/widget/app?page=settings`
    );
  }
}

test.describe
  .parallel("should display settings proposals of different status correctly", () => {
  test.use({
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  });
  proposalStatuses.forEach(({ status, type }) => {
    test(`proposal with status '${status}' should be displayed correctly`, async ({
      page,
      instanceAccount,
    }) => {
      const notInProgress = status !== "InProgress";
      await mockSettingsProposals({ page, status, type });
      await page.goto(`/${instanceAccount}/widget/app?page=settings`);
      await page.waitForTimeout(10_000);
      if (notInProgress) {
        await page.getByText("History", { exact: true }).click();
        await page.waitForTimeout(5_000);
      }
      const proposalCell = page.getByTestId("proposal-request-#0");
      await expect(proposalCell).toBeVisible({ timeout: 20_000 });
      await mockSettingProposal({ page, status, type });
      await proposalCell.click();

      await checkProposalDetailPage({
        page,
        status,
        instanceAccount,
        isCompactVersion: true,
        type,
      });
    });
  });

  test(`proposal details link should open correctly`, async ({
    page,
    instanceAccount,
  }) => {
    const status = "Approved";
    await mockSettingProposal({
      page,
      status,
      type: RequestType.MEMBERS,
    });
    await page.goto(`/${instanceAccount}/widget/app?page=settings&id=0`);
    await checkProposalDetailPage({
      page,
      status,
      instanceAccount,
      isCompactVersion: false,
    });
  });
});
