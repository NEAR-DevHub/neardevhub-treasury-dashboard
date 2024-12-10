import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { getTransactionModalObject } from "../../util/transaction.js";
import { SandboxRPC } from "../../util/sandboxrpc.js";
import { mockRpcRequest } from "../../util/rpcmock.js";
import { getInstanceConfig } from "../../util/config.js";

async function goToSettingsAndCheckIfVotingDurationIsAvailable({
  page,
  instanceAccount,
  instanceConfig,
}) {
  await page.goto(`/${instanceAccount}/widget/app?page=settings`);

  if (!instanceConfig.showVotingDurationConfiguration) {
    await expect(
      await page.locator(".link", { hasText: "Members" })
    ).toBeVisible();
    await expect(await page.getByText("Voting Duration")).not.toBeVisible();
    return false;
  } else {
    return true;
  }
}

test.afterEach(async ({ page }, testInfo) => {
  console.log(`Finished ${testInfo.title} with status ${testInfo.status}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test.describe("admin connected", function () {
  test.use({
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });

  test("should set voting duration", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });

    await page.goto(`/${instanceAccount}/widget/app?page=settings`);

    if (
      !(await goToSettingsAndCheckIfVotingDurationIsAvailable({
        page,
        instanceAccount,
        instanceConfig,
      }))
    ) {
      return;
    }
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    const newDurationDays = Number(currentDurationDays) + 3;
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill(newDurationDays.toString());

    await page.waitForTimeout(500);
    await page.locator("button", { hasText: "Submit" }).click();

    await page
      .locator(".modalfooter button", { hasText: "Yes, proceed" })
      .click();

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: "Change proposal period",
        kind: {
          ChangePolicyUpdateParameters: {
            parameters: {
              proposal_period: (
                BigInt(newDurationDays) *
                60n *
                60n *
                24n *
                1_000_000_000n
              ).toString(),
            },
          },
        },
      },
    });
  });

  test("cancelling set voting duration should reset to original value", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });

    await page.goto(`/${instanceAccount}/widget/app?page=settings`);

    if (
      !(await goToSettingsAndCheckIfVotingDurationIsAvailable({
        page,
        instanceAccount,
        instanceConfig,
      }))
    ) {
      return;
    }
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill((Number(currentDurationDays) + 3).toString());

    await page.waitForTimeout(500);
    await page.getByText("Cancel").click();

    await expect(
      await page.getByPlaceholder("Enter voting duration days")
    ).toHaveValue(currentDurationDays);
  });

  test("should show confirmation toast when submitting voting duration change request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const daoName = daoAccount.split(".")[0];

    const sandbox = new SandboxRPC();
    await sandbox.init();
    await sandbox.attachRoutes(page);
    await sandbox.setupSandboxForSputnikDao(daoName);

    await sandbox.addPaymentRequestProposal({
      title: "Test payment",
      summary: "Pay something",
      amount: "56000000",
      receiver_id: "webassemblymusic.near",
      daoName,
    });

    const instanceConfig = await getInstanceConfig({ page, instanceAccount });

    if (
      !(await goToSettingsAndCheckIfVotingDurationIsAvailable({
        page,
        instanceAccount,
        instanceConfig,
      }))
    ) {
      return;
    }
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();
    const newDurationDays = Number(currentDurationDays) + 3;
    await page
      .getByPlaceholder("Enter voting duration days")
      .fill(newDurationDays.toString());

    await page.waitForTimeout(500);
    await page.locator("button", { hasText: "Submit" }).click();

    await page
      .locator(".modalfooter button", { hasText: "Yes, proceed" })
      .click();

    const transactionToSendPromise = page.evaluate(async () => {
      const selector = await document.querySelector("near-social-viewer")
        .selectorPromise;

      const wallet = await selector.wallet();

      return new Promise((resolve) => {
        wallet.signAndSendTransactions = async (transactions) => {
          resolve(transactions.transactions[0]);
          return await new Promise(
            (transactionSentPromiseResolve) =>
              (window.transactionSentPromiseResolve =
                transactionSentPromiseResolve)
          );
        };
      });
    });

    await page.getByRole("button", { name: "Confirm" }).click();

    const transactionToSend = await transactionToSendPromise;

    const transactionResult = await sandbox.account.functionCall({
      contractId: daoAccount,
      methodName: "add_proposal",
      args: transactionToSend.actions[0].params.args,
      attachedDeposit: transactionToSend.actions[0].params.deposit,
    });

    await page.evaluate((transactionResult) => {
      window.transactionSentPromiseResolve(transactionResult);
    }, transactionResult);
    await expect(await page.locator(".toast-header")).toBeVisible();
    await expect(await page.locator(".toast-body")).toBeVisible();
    await expect(await page.locator(".toast-body")).toHaveText(
      "Voting duration change request submitted"
    );

    await sandbox.quitSandbox();
  });

  test("changing voting duration should show changed expiry dates for pending proposals", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(150_000);
    const lastProposalId = 100;
    const proposals = [];
    for (let id = 0; id <= lastProposalId; id++) {
      proposals.push({
        id,
        proposer: "neardevgov.near",
        description: `Add tester${id}.near as council member`,
        kind: {
          AddMemberToRole: {
            member_id: `tester${id}.near`,
            role: "council",
          },
        },
        status: ["InProgress", "Approved", "Expired"][id % 3],
        vote_counts: { council: [1, 0, 0] },
        votes: { "neardevgov.near": "Approve" },
        submission_time: (
          BigInt(new Date().getTime()) * 1_000_000n -
          BigInt(lastProposalId - id) * 1_000_000_000n * 60n * 60n * 4n
        ).toString(),
      });
    }
    await mockRpcRequest({
      page,
      filterParams: {
        account_id: daoAccount,
      },
      modifyOriginalResultFunction: (originalResult, postData, args) => {
        if (postData.params.method_name === "get_proposals") {
          return proposals.slice(args.from_index, args.from_index + args.limit);
        } else if (postData.params.method_name === "get_last_proposal_id") {
          return lastProposalId;
        } else if (postData.params.method_name === "get_policy") {
          originalResult.proposal_period = (
            7n * // 7 days
            24n *
            60n *
            60n *
            1_000_000_000n
          ).toString();
          return originalResult;
        } else {
          return originalResult;
        }
      },
    });

    const instanceConfig = await getInstanceConfig({ page, instanceAccount });

    if (
      !(await goToSettingsAndCheckIfVotingDurationIsAvailable({
        page,
        instanceAccount,
        instanceConfig,
      }))
    ) {
      return;
    }
    await page.getByText("Voting Duration").first().click();

    await page.waitForTimeout(500);
    const currentDurationDays = await page
      .getByPlaceholder("Enter voting duration days")
      .inputValue();

    let newDurationDays = Number(currentDurationDays) + 3;
    while (newDurationDays > 0) {
      await page
        .getByPlaceholder("Enter voting duration days")
        .fill(newDurationDays.toString());

      const checkExpectedNewAffectedProposals = async () => {
        const expectedNewExpiredProposals = proposals
          .filter(
            (proposal) =>
              Number(BigInt(proposal.submission_time) / 1_000_000n) +
                currentDurationDays * 24 * 60 * 60 * 1000 >
                new Date().getTime() &&
              Number(BigInt(proposal.submission_time) / 1_000_000n) +
                newDurationDays * 24 * 60 * 60 * 1000 <
                new Date().getTime() &&
              proposal.status === "InProgress"
          )
          .reverse();
        const expectedNewActiveProposals = proposals
          .filter(
            (proposal) =>
              Number(BigInt(proposal.submission_time) / 1_000_000n) +
                currentDurationDays * 24 * 60 * 60 * 1000 <
                new Date().getTime() &&
              Number(BigInt(proposal.submission_time) / 1_000_000n) +
                newDurationDays * 24 * 60 * 60 * 1000 >
                new Date().getTime() &&
              proposal.status === "InProgress"
          )
          .reverse();
        const expectedUnaffectedActiveProposals = proposals
          .filter(
            (proposal) =>
              Number(BigInt(proposal.submission_time) / 1_000_000n) +
                currentDurationDays * 24 * 60 * 60 * 1000 >
                new Date().getTime() &&
              Number(BigInt(proposal.submission_time) / 1_000_000n) +
                newDurationDays * 24 * 60 * 60 * 1000 >
                new Date().getTime() &&
              proposal.status === "InProgress"
          )
          .reverse();
        if (newDurationDays > currentDurationDays) {
          expect(expectedNewActiveProposals.length).toBeGreaterThanOrEqual(0);
          expect(expectedNewExpiredProposals.length).toBe(0);
        } else if (newDurationDays < currentDurationDays) {
          expect(expectedNewActiveProposals.length).toBe(0);
          expect(expectedNewExpiredProposals.length).toBeGreaterThanOrEqual(0);
        } else {
          expect(expectedNewActiveProposals.length).toBe(0);
          expect(expectedNewExpiredProposals.length).toBe(0);
          await expect(
            await page.getByRole("button", { name: "Submit Request" })
          ).toBeDisabled();
          return;
        }

        await page.waitForTimeout(300);
        await expect(
          await page.getByRole("button", { name: "Submit Request" })
        ).toBeEnabled();
        await page.getByRole("button", { name: "Submit Request" }).click();

        if (expectedUnaffectedActiveProposals.length > 0) {
          await expect(
            page.getByText(
              `${expectedUnaffectedActiveProposals.length} pending requests`
            )
          ).toBeVisible();
        }
        if (expectedNewExpiredProposals.length > 0) {
          await expect(
            await page.getByText(
              `${expectedNewExpiredProposals.length} active requests`
            )
          ).toBeVisible();
          await expect(
            page.getByRole("heading", {
              name: "Impact of changing voting duration",
            })
          ).toBeVisible();
          await expect(
            await page.locator(".proposal-that-will-expire")
          ).toHaveCount(expectedNewExpiredProposals.length);
          const visibleProposalIds = await page
            .locator(".proposal-that-will-expire td:first-child")
            .allInnerTexts();
          expect(visibleProposalIds).toEqual(
            expectedNewExpiredProposals.map((proposal) =>
              proposal.id.toString()
            )
          );
          await page
            .locator(".modalfooter button", { hasText: "Cancel" })
            .click();
          await expect(
            page.getByRole("heading", {
              name: "Impact of changing voting duration",
            })
          ).not.toBeVisible();
        } else if (expectedNewActiveProposals.length > 0) {
          await expect(
            await page.getByText(`${expectedNewActiveProposals.length} expired`)
          ).toBeVisible();
          await expect(
            page.getByRole("heading", {
              name: "Impact of changing voting duration",
            })
          ).toBeVisible();
          await expect(
            await page.locator(".proposal-that-will-be-active")
          ).toHaveCount(expectedNewActiveProposals.length);
          const visibleProposalIds = await page
            .locator(".proposal-that-will-be-active td:first-child")
            .allInnerTexts();
          expect(visibleProposalIds).toEqual(
            expectedNewActiveProposals.map((proposal) => proposal.id.toString())
          );
          await page
            .locator(".modalfooter button", { hasText: "Cancel" })
            .click();
          await expect(
            page.getByRole("heading", {
              name: "Impact of changing voting duration",
            })
          ).not.toBeVisible();
        } else {
          await expect(
            await page.getByText("Confirm Transaction")
          ).toBeVisible();
          await page.locator("button", { hasText: "Close" }).click();
          await expect(
            await page.getByText("Confirm Transaction")
          ).not.toBeVisible();
        }
      };
      await checkExpectedNewAffectedProposals();
      await page.waitForTimeout(500);
      newDurationDays--;
    }
  });
});
