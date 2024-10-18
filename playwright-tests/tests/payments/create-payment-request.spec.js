import { expect } from "@playwright/test";
import { test } from "../../util/test.js";

import {
  getTransactionModalObject,
  mockTransactionSubmitRPCResponses,
} from "../../util/transaction";
import { mockRpcRequest } from "../../util/rpcmock";
import { setDontAskAgainCacheValues } from "../../util/cache";
import { getInstanceConfig } from "../../util/config.js";
import { mockInventory } from "../../util/inventory.js";

async function clickCreatePaymentRequestButton(page) {
  const createPaymentRequestButton = await page.getByRole("button", {
    name: "Create Request",
  });
  await expect(createPaymentRequestButton).toBeVisible({timeout: 10_000});
  await createPaymentRequestButton.click();
  return createPaymentRequestButton;
}

async function fillCreateForm(page, daoAccount, instanceAccount) {
  await mockInventory({ page, account: daoAccount });
  const instanceConfig = await getInstanceConfig({ page, instanceAccount });
  await page.goto(`/${instanceAccount}/widget/app?page=payments`);

  await clickCreatePaymentRequestButton(page);

  if (instanceConfig.showProposalSelection === true) {
    const proposalSelect = await page.locator(".dropdown-toggle").first();
    await expect(proposalSelect).toBeVisible();
    await expect(
      await proposalSelect.getByText("Select", { exact: true })
    ).toBeVisible();

    await proposalSelect.click();

    await page.getByText("Add manual request").click();
  }
  await page.getByTestId("proposal-title").fill("Test proposal title");
  await page.getByTestId("proposal-summary").fill("Test proposal summary");

  await page.getByPlaceholder("treasury.near").fill("webassemblymusic.near");
  const totalAmountField = await page.getByTestId("total-amount");
  await totalAmountField.focus();
  await totalAmountField.pressSequentially("3");
  await totalAmountField.blur();

  const tokenSelect = await page.getByTestId("tokens-dropdown");
  await tokenSelect.click();
  await tokenSelect.getByText("NEAR").click();
}

test.describe("admin connected", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });

  // TODO : like special characters, string, empty value, large values with commas, paste invalid text, selecting NEAR token should not throw any error
  // test("different amount values should not throw any error", async ({
  //   page,
  //   instanceAccount,
  //   daoAccount,
  // }) => {
  // });

  // TODO : token dropdown should show all tokens, even after selecting one

  // TODO: make sure 'submit' is disabled when incorrect receiver id is mentioned or empty amount or empty proposal name or empty token

  test("cancel form should clear existing values", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await fillCreateForm(page, daoAccount, instanceAccount);
    const cancelBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Cancel" });
    await expect(cancelBtn).toBeAttached({ timeout: 10_000 });

    cancelBtn.click();
    await page.getByRole("button", { name: "Yes" }).click();

    await clickCreatePaymentRequestButton(page);

    // TODO: add a case where the form is a proposal selection instead of a manual title and summary
    expect(await page.getByTestId("proposal-title").inputValue()).toBe("");
    expect(await page.getByTestId("proposal-summary").inputValue()).toBe("");
    expect(await page.getByPlaceholder("treasury.near").inputValue()).toBe("");
    expect(await page.getByTestId("total-amount").inputValue()).toBe("");
  });

  test("create manual payment request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    await fillCreateForm(page, daoAccount, instanceAccount);
    const submitBtn = page
      .locator(".offcanvas-body")
      .getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    await expect(await getTransactionModalObject(page)).toEqual({
      proposal: {
        description: `{"title":"Test proposal title","summary":"Test proposal summary","notes":${
          instanceConfig.showProposalSelection ? '""' : null
        }}`,
        kind: {
          Transfer: {
            token_id: "",
            receiver_id: "webassemblymusic.near",
            amount: "3000000000000000000000000",
          },
        },
      },
    });
  });

  test("create NEAR transfer payment request, and after submission it should be visible in pending request, and the form should be cleared", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const nearPrice = 4;

    await mockInventory({ page, account: daoAccount });
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await page.route(
      "https://api3.nearblocks.io/v1/charts/latest",
      async (route) => {
        let json = {
          charts: [
            {
              date: "2024-10-12T00:00:00.000Z",
              near_price: nearPrice.toString(),
              txns: "6113720",
            },
          ],
        };
        await route.fulfill({ json });
      }
    );
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);

    await clickCreatePaymentRequestButton(page);

    const amountFromLinkedProposal = 3120 / nearPrice;

    if (instanceConfig.showProposalSelection === true) {
      const proposalSelect = await page.locator(".dropdown-toggle").first();
      await expect(proposalSelect).toBeVisible();

      await expect(
        await proposalSelect.getByText("Select", { exact: true })
      ).toBeVisible();

      await proposalSelect.click();
      const proposal = await page.getByText("#173 Near Contract Standards");
      await proposal.click();
      await expect(
        await page.getByPlaceholder("treasury.near").inputValue()
      ).toBe("robert.near");

      await expect(await page.getByTestId("total-amount").inputValue()).toBe(
        amountFromLinkedProposal.toString()
      );
    } else {
      await page.getByTestId("proposal-title").fill("Test proposal title");
      await page.getByTestId("proposal-summary").fill("Test proposal summary");

      await page
        .getByPlaceholder("treasury.near")
        .fill("webassemblymusic.near");
      const tokenSelect = await page.getByTestId("tokens-dropdown");
      await tokenSelect.click();
      await tokenSelect.getByText("NEAR").click();

      const totalAmountField = await page.getByTestId("total-amount");
      await totalAmountField.focus();
      await totalAmountField.pressSequentially("20");
      await totalAmountField.blur();
    }
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    const expectedTransactionModalObject = instanceConfig.showProposalSelection
      ? {
          proposal: {
            description:
              '{"title":"Near Contract Standards payment request by Robert","summary":"Contract Standards Work Group grant","notes":null,"proposalId":173}',
            kind: {
              Transfer: {
                token_id: "",
                receiver_id: "robert.near",
                amount: (
                  BigInt(amountFromLinkedProposal) *
                  10n ** 24n
                ).toString(),
              },
            },
          },
        }
      : {
          proposal: {
            description: `{"title":"Test proposal title","summary":"Test proposal summary","notes":null}`,
            kind: {
              Transfer: {
                amount: (20n * 10n ** 24n).toString(),
                receiver_id: "webassemblymusic.near",
                token_id: "",
              },
            },
          },
        };

    await expect(await getTransactionModalObject(page)).toEqual(
      expectedTransactionModalObject
    );

    let isTransactionCompleted = false;
    let retryCountAfterComplete = 0;
    let newProposalId;
    await mockTransactionSubmitRPCResponses(
      page,
      async ({
        route,
        request,
        transaction_completed,
        last_receiver_id,
        requestPostData,
      }) => {
        isTransactionCompleted = transaction_completed;
        if (
          isTransactionCompleted &&
          requestPostData.params &&
          requestPostData.params.method_name === "get_last_proposal_id"
        ) {
          const response = await route.fetch();
          const json = await response.json();
          let result = JSON.parse(
            new TextDecoder().decode(new Uint8Array(json.result.result))
          );
          if (retryCountAfterComplete === 2) {
            result++;
            newProposalId = result;
          } else {
            retryCountAfterComplete++;
          }

          json.result.result = Array.from(
            new TextEncoder().encode(JSON.stringify(result))
          );
          await route.fulfill({ response, json });
        } else if (
          isTransactionCompleted &&
          newProposalId &&
          requestPostData.params &&
          requestPostData.params.method_name === "get_proposals"
        ) {
          const response = await route.fetch();
          const json = await response.json();
          let result = JSON.parse(
            new TextDecoder().decode(new Uint8Array(json.result.result))
          );

          result.push({
            id: newProposalId,
            proposer: "tfdevhub.near",
            description: expectedTransactionModalObject.proposal.description,
            kind: {
              Transfer: {
                token_id:
                  expectedTransactionModalObject.proposal.kind.Transfer
                    .token_id,
                receiver_id:
                  expectedTransactionModalObject.proposal.kind.Transfer
                    .receiver_id,
                amount:
                  expectedTransactionModalObject.proposal.kind.Transfer.amount,
                msg: null,
              },
            },
            status: "InProgress",
            vote_counts: {},
            votes: {},
            submission_time: "1729004234137594481",
          });

          json.result.result = Array.from(
            new TextEncoder().encode(JSON.stringify(result))
          );
          await route.fulfill({ response, json });
        } else {
          await route.fallback();
        }
      }
    );

    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(await page.locator("div.modal-body code")).toBeAttached({
      attached: false,
      timeout: 10_000,
    });
    await expect(await page.locator(".spinner-border")).toBeAttached({
      attached: false,
      timeout: 10_000,
    });
    await expect(await page.locator(".offcanvas-body")).toBeVisible({
      visible: false,
    });
    await expect(
      await page.getByRole("cell", { name: `${newProposalId}`, exact: true })
    ).toBeVisible({ timeout: 10_000 });
    const firstRow = await page
      .locator(
        'tr[data-component="treasury-devdao.near/widget/pages.payments.Table"]'
      )
      .nth(1);
    await expect(firstRow).toContainText(
      expectedTransactionModalObject.proposal.kind.Transfer.receiver_id
    );

    const checkThatFormIsCleared = async () => {
      await page.getByRole("button", { name: " Create Request" }).click();

      if (instanceConfig.showProposalSelection === true) {
        const proposalSelect = await page.locator(".dropdown-toggle").first();
        await expect(proposalSelect).toBeVisible();

        await expect(
          await proposalSelect.getByText("Select", { exact: true })
        ).toBeVisible();
      } else {
        await expect(await page.getByTestId("proposal-title")).toHaveText("");
        await expect(await page.getByTestId("proposal-summary")).toHaveText("");

        await expect(
          await page.getByPlaceholder("treasury.near")
        ).toBeVisible();

        await expect(await page.getByTestId("total-amount")).toHaveText("");
      }
      const submitBtn = page.getByRole("button", { name: "Submit" });
      await expect(submitBtn).toBeAttached({ timeout: 10_000 });
      await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
      await expect(submitBtn).toBeDisabled({ timeout: 10_000 });
    };
    await checkThatFormIsCleared();

    await page.reload();

    await checkThatFormIsCleared();
  });

  test("create USDC transfer payment request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await mockInventory({ page, account: daoAccount });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);

    await clickCreatePaymentRequestButton(page);

    if (instanceConfig.showProposalSelection === true) {
      const proposalSelect = await page.locator(".dropdown-toggle").first();
      await expect(proposalSelect).toBeVisible();
      await expect(
        await proposalSelect.getByText("Select", { exact: true })
      ).toBeVisible();

      await proposalSelect.click();

      await page
        .getByPlaceholder("Search by id or title")
        .fill("215 Fellowship");
      const proposal = await page.getByText(
        "#215 Fellowship Contributor report by Matias Benary for 2024-09-09 2024-09-29"
      );
      await proposal.click();
      await expect(
        await page.getByPlaceholder("treasury.near").inputValue()
      ).toBe("maguila.near");
      await expect(await page.getByTestId("total-amount").inputValue()).toBe(
        "3150"
      );
    } else {
      await page.getByTestId("proposal-title").fill("Test proposal title");
      await page.getByTestId("proposal-summary").fill("Test proposal summary");

      await page
        .getByPlaceholder("treasury.near")
        .fill("webassemblymusic.near");
      const tokenSelect = await page.getByTestId("tokens-dropdown");
      await tokenSelect.click();
      await tokenSelect.getByText("USDC").click();

      const totalAmountField = await page.getByTestId("total-amount");
      await totalAmountField.focus();
      await totalAmountField.pressSequentially("3150");
      await totalAmountField.blur();
    }
    const submitBtn = page.getByRole("button", { name: "Submit" });
    await expect(submitBtn).toBeAttached({ timeout: 10_000 });
    await submitBtn.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await submitBtn.click();

    const expectedTransactionModalObject = instanceConfig.showProposalSelection
      ? {
          proposal: {
            description:
              '{"title":"Fellowship Contributor report by Matias Benary for  2024-09-09  2024-09-29","summary":"Fellowship Contributor report by Matias Benary for  2024-09-09  2024-09-29","notes":null,"proposalId":215}',
            kind: {
              Transfer: {
                amount: "3150000000",
                receiver_id: "maguila.near",
                token_id: "usdt.tether-token.near",
              },
            },
          },
        }
      : {
          proposal: {
            description: `{"title":"Test proposal title","summary":"Test proposal summary","notes":null}`,
            kind: {
              Transfer: {
                amount: "3150000000",
                receiver_id: "webassemblymusic.near",
                token_id:
                  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
              },
            },
          },
        };
    await expect(await getTransactionModalObject(page)).toEqual(
      expectedTransactionModalObject
    );
  });
});

test.describe("don't ask again", function () {
  test.use({
    storageState:
      "playwright-tests/storage-states/wallet-connected-admin-with-accesskey.json",
  });
  test("approve payment request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(60_000);
    const contractId = daoAccount;
    let isTransactionCompleted = false;
    await page.route(
      `https://api3.nearblocks.io/v1/account/${daoAccount}/inventory`,
      async (route, request) => {
        await route.fulfill({
          json: {
            inventory: {
              fts: [
                {
                  contract: "usdt.tether-token.near",
                  amount: "4500000",
                  ft_meta: {
                    name: "Tether USD",
                    symbol: "USDt",
                    decimals: 6,
                    icon: "data:image/svg+xml,%3Csvg width='111' height='90' viewBox='0 0 111 90' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M24.4825 0.862305H88.0496C89.5663 0.862305 90.9675 1.64827 91.7239 2.92338L110.244 34.1419C111.204 35.7609 110.919 37.8043 109.549 39.1171L58.5729 87.9703C56.9216 89.5528 54.2652 89.5528 52.6139 87.9703L1.70699 39.1831C0.305262 37.8398 0.0427812 35.7367 1.07354 34.1077L20.8696 2.82322C21.6406 1.60483 23.0087 0.862305 24.4825 0.862305ZM79.8419 14.8003V23.5597H61.7343V29.6329C74.4518 30.2819 83.9934 32.9475 84.0642 36.1425L84.0638 42.803C83.993 45.998 74.4518 48.6635 61.7343 49.3125V64.2168H49.7105V49.3125C36.9929 48.6635 27.4513 45.998 27.3805 42.803L27.381 36.1425C27.4517 32.9475 36.9929 30.2819 49.7105 29.6329V23.5597H31.6028V14.8003H79.8419ZM55.7224 44.7367C69.2943 44.7367 80.6382 42.4827 83.4143 39.4727C81.0601 36.9202 72.5448 34.9114 61.7343 34.3597V40.7183C59.7966 40.8172 57.7852 40.8693 55.7224 40.8693C53.6595 40.8693 51.6481 40.8172 49.7105 40.7183V34.3597C38.8999 34.9114 30.3846 36.9202 28.0304 39.4727C30.8066 42.4827 42.1504 44.7367 55.7224 44.7367Z' fill='%23009393'/%3E%3C/svg%3E",
                    reference: null,
                    price: 1,
                  },
                },
                {
                  contract:
                    "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
                  amount: "1500000",
                  ft_meta: {
                    name: "USDC",
                    symbol: "USDC",
                    decimals: 6,
                    icon: "",
                    reference: null,
                    price: 1,
                  },
                },
              ],
              nfts: [],
            },
          },
        });
      }
    );
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposals",
      },
      modifyOriginalResultFunction: (originalResult) => {
        if (isTransactionCompleted) {
          originalResult[0].status = "Approved";
        } else {
          originalResult[0].status = "InProgress";
        }
        originalResult[0].kind = "Transfer";
        return originalResult.slice(0, 1);
      },
    });
    await mockRpcRequest({
      page,
      filterParams: {
        method_name: "get_proposal",
      },
      modifyOriginalResultFunction: (originalResult) => {
        console.log("get_proposal", originalResult);
        if (isTransactionCompleted) {
          originalResult.votes["theori.near"] = "Approve";
        }
        return originalResult;
      },
    });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);
    await setDontAskAgainCacheValues({
      page,
      widgetSrc: "treasury-devdao.near/widget/components.VoteActions",
      contractId,
      methodName: "act_proposal",
    });

    await mockTransactionSubmitRPCResponses(
      page,
      async ({
        route,
        request,
        transaction_completed,
        last_receiver_id,
        requestPostData,
      }) => {
        isTransactionCompleted = transaction_completed;
        await route.fallback();
      }
    );
    const approveButton = await page
      .getByRole("button", {
        name: "Approve",
      })
      .first();
    await expect(approveButton).toBeEnabled({ timeout: 10000 });
    await approveButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(approveButton).toBeDisabled();

    const transaction_toast = await page.getByText(
      `Calling contract ${contractId} with method act_proposal`
    );
    await expect(transaction_toast).toBeVisible();

    await transaction_toast.waitFor({ state: "detached", timeout: 10000 });
    await expect(transaction_toast).not.toBeVisible();
    await page
      .locator("li")
      .filter({ hasText: "History" })
      .locator("div")
      .click();
    await expect(await page.getByText("Funded").first()).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(1_000);
  });
});
