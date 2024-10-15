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

async function fillCreateForm(page, daoAccount, instanceAccount) {
  await mockInventory({ page, account: daoAccount });
  const instanceConfig = await getInstanceConfig({ page, instanceAccount });
  await page.goto(`/${instanceAccount}/widget/app?page=payments`);

  const createPaymentRequestButton = await page.getByRole("button", {
    name: "Create Request",
  });
  await expect(createPaymentRequestButton).toBeVisible();
  await createPaymentRequestButton.click();

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
    storageState: "playwright-tests/storage-states/wallet-connected-admin.json",
  });
  // TODO
  // test("different amount values should not throw any error", async ({
  //   page,
  //   instanceAccount,
  //   daoAccount,
  // }) => {
  // });

  // test("cancel form should clear existing values", async ({
  //   page,
  //   instanceAccount,
  //   daoAccount,
  // }) => {
  //   test.setTimeout(60_000);
  // });

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
    submitBtn.click();

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

  // TODO: add the checks after form submission completion
  test("create NEAR transfer payment request and should clear form after submission", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
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

    const createPaymentRequestButton = await page.getByRole("button", {
      name: "Create Request",
    });

    await expect(createPaymentRequestButton).toBeVisible();
    await createPaymentRequestButton.click();

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
    submitBtn.click();

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
  });

  test("create USDC transfer payment request", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    const instanceConfig = await getInstanceConfig({ page, instanceAccount });
    await mockInventory({ page, account: daoAccount });
    await page.goto(`/${instanceAccount}/widget/app?page=payments`);

    const createPaymentRequestButton = await page.getByRole("button", {
      name: "Create Request",
    });
    await expect(createPaymentRequestButton).toBeVisible();
    await createPaymentRequestButton.click();

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
    submitBtn.click();

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
