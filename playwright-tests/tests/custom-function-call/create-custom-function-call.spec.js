import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { parseNEAR, Worker } from "near-workspaces";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4";
import { PROPOSAL_BOND, setPageAuthSettings } from "../../util/sandboxrpc";
import { Indexer } from "../../util/indexer.js";

async function setupIndexer(page, worker) {
  const indexer = new Indexer(worker.provider.connection.url);
  await indexer.init();
  await indexer.attachIndexerRoutes(page);
}

async function setupWorker({ daoAccount, instanceAccount, page }) {
  const daoName = daoAccount.split(".")?.[0];

  const worker = await Worker.init();

  const creatorAccount = await worker.rootAccount.importContract({
    mainnetContract: "theori.near",
  });
  await worker.rootAccount.transfer(creatorAccount.accountId, parseNEAR("100"));

  const create_testdao_args = {
    config: {
      name: daoName,
      purpose: "treasury",
      metadata: "",
    },
    policy: {
      roles: [
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Create Requests",
          permissions: [
            "call:AddProposal",
            "transfer:AddProposal",
            "config:Finalize",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Manage Members",
          permissions: [
            "config:*",
            "policy:*",
            "add_member_to_role:*",
            "remove_member_from_role:*",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: [creatorAccount.accountId],
          },
          name: "Vote",
          permissions: ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
          vote_policy: {},
        },
      ],
      default_vote_policy: {
        weight_kind: "RoleWeight",
        quorum: "0",
        threshold: [1, 2],
      },
      proposal_bond: PROPOSAL_BOND,
      proposal_period: "604800000000000",
      bounty_bond: "100000000000000000000000",
      bounty_forgiveness_period: "604800000000000",
    },
  };

  const daoContract = await worker.rootAccount.importContract({
    mainnetContract: daoAccount,
    initialBalance: parseNEAR("24"),
  });

  await daoContract.callRaw(daoAccount, "new", create_testdao_args, {
    gas: "300000000000000",
  });
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  const socialNear = await worker.rootAccount.importContract({
    mainnetContract: "social.near",
  });
  await socialNear.call("social.near", "new", {});

  await socialNear.call(
    socialNear.accountId,
    "set_status",
    { status: "Live" },
    { gas: "300000000000000" }
  );

  // Modify widgets to add custom-function-call to config and app
  const modifiedWidgets = {};

  // Add to config.data
  const configKey = `${instanceAccount}/widget/config.data`;
  const configContent = getLocalWidgetContent(configKey, {
    treasury: daoAccount,
    account: instanceAccount,
  });

  // Add custom-function-call to navbarLinks
  // Check if it already exists to avoid duplicates
  if (!configContent.includes('title: "Function Calls"')) {
    modifiedWidgets[configKey] = configContent.replace(
      `{
      title: "Settings",
      href: "?page=settings",
    },`,
      `{
      title: "Function Calls",
      href: "?page=function-calls",
    },
    {
      title: "Settings",
      href: "?page=settings",
    },`
    );
  } else {
    modifiedWidgets[configKey] = configContent;
  }

  // Add to app.jsx
  const appKey = `${instanceAccount}/widget/app`;
  const appContent = getLocalWidgetContent(appKey, {
    treasury: daoAccount,
    account: instanceAccount,
  });

  // Add custom-function-call case to app.jsx
  // Check if it already exists to avoid duplicates
  if (!appContent.includes('case "function-calls"')) {
    modifiedWidgets[appKey] = appContent.replace(
      `case "lockup": {`,
      `case "function-calls": {
      return (
        <Widget
          src={
            "test-widgets.treasury-factory.near/widget/pages.custom-function-call.index"
          }
          props={propsToSend}
        />
      );
    }

    case "lockup": {`
    );
  } else {
    modifiedWidgets[appKey] = appContent;
  }
  await setupIndexer(page, worker);
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });

  await page.goto(`https://${instanceAccount}.page/?page=function-calls`);

  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  await page.waitForTimeout(3_000);
  return { worker, creatorAccount };
}

async function clickCreateRequestButton(page) {
  await page.waitForTimeout(1_000);
  const createRequestButton = await page.getByRole("button", {
    name: "Create Request",
  });
  await expect(createRequestButton).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_000);
  await createRequestButton.click();
  return createRequestButton;
}

async function fillCustomFunctionCallForm(
  page,
  { contractId, methodName, args, gas, deposit, notes }
) {
  const canvasLocator = page.locator(".offcanvas-body");

  // Fill Contract ID
  await canvasLocator.getByTestId("contract-id-input").fill(contractId);

  // Fill Method Name (now indexed for first action)
  await canvasLocator.getByTestId("method-name-input-0").fill(methodName);

  // Fill Arguments (optional, now indexed for first action)
  if (args) {
    await canvasLocator.getByTestId("arguments-input-0").fill(args);
  }

  // Fill Gas (now indexed for first action)
  await canvasLocator.getByTestId("gas-input-0").fill(gas.toString());

  // Fill Deposit (now indexed for first action)
  await canvasLocator.getByTestId("deposit-input-0").fill(deposit.toString());

  // Fill Notes (optional)
  if (notes) {
    await canvasLocator.getByTestId("notes-input").fill(notes);
  }
}

test.describe("Wallet connected", () => {
  test("should validate form fields before submission", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(160_000);
    const { worker, creatorAccount } = await setupWorker({
      daoAccount,
      instanceAccount,
      page,
    });

    await clickCreateRequestButton(page);

    const canvasLocator = page.locator(".offcanvas-body");
    const submitButton = canvasLocator.getByTestId("submit-button");

    // Try to submit without filling any fields
    await submitButton.click();

    // Check for validation errors
    await expect(
      canvasLocator.getByText("Contract ID is required")
    ).toBeVisible();
    await expect(
      canvasLocator.getByText("Method Name is required")
    ).toBeVisible();
    await expect(
      canvasLocator.getByText("Gas (Tgas) is required")
    ).toBeVisible();
    await expect(
      canvasLocator.getByText("Deposit (NEAR) is required")
    ).toBeVisible();

    // Fill Contract ID with invalid format
    await canvasLocator.getByTestId("contract-id-input").fill("invalid");
    await submitButton.click();
    await expect(
      canvasLocator.getByText(
        "Invalid account format. Must be a .near, .aurora, .tg account or 64-character hex"
      )
    ).toBeVisible();

    // Clear the error by editing
    await canvasLocator.getByTestId("contract-id-input").fill("");
    await expect(
      canvasLocator.getByText(
        "Invalid account format. Must be a .near, .aurora, .tg account or 64-character hex"
      )
    ).not.toBeVisible();

    // Fill Method Name with invalid format (multiple words)
    await canvasLocator
      .getByTestId("method-name-input-0")
      .fill("invalid method");
    await submitButton.click();
    await expect(
      canvasLocator.getByText(
        "Method name must be a single word (letters, numbers, underscore only)"
      )
    ).toBeVisible();

    // Fill Arguments with invalid JSON (plain string)
    await canvasLocator
      .getByTestId("arguments-input-0")
      .fill('"just a string"');
    await submitButton.click();
    await expect(
      canvasLocator.getByText(
        "Arguments must be a JSON object or array, not a string"
      )
    ).toBeVisible();

    // Fill Arguments with invalid JSON syntax
    await canvasLocator.getByTestId("arguments-input-0").fill("{invalid}");
    await submitButton.click();
    await expect(canvasLocator.getByText("Invalid JSON format")).toBeVisible();

    // Fill Gas with value above 300
    await canvasLocator.getByTestId("gas-input-0").fill("400");
    await submitButton.click();
    await expect(
      canvasLocator.getByText("Gas must be between 0 and 300 Tgas")
    ).toBeVisible();

    // Errors should clear when editing
    await canvasLocator.getByTestId("method-name-input-0").fill("transfer");
    await expect(
      canvasLocator.getByText(
        "Method name must be a single word (letters, numbers, underscore only)"
      )
    ).not.toBeVisible();
  });

  test("should handle multiple actions - add, remove, and validate", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(160_000);
    const { worker, creatorAccount } = await setupWorker({
      daoAccount,
      instanceAccount,
      page,
    });

    await clickCreateRequestButton(page);
    const canvasLocator = page.locator(".offcanvas-body");

    // Add second action
    await canvasLocator.getByText("Add Another Action").click();

    // Verify we have 2 actions
    await expect(canvasLocator.getByText("Action 1")).toBeVisible();
    await expect(canvasLocator.getByText("Action 2")).toBeVisible();

    // Add third action
    await canvasLocator.getByText("Add Another Action").click();
    await expect(canvasLocator.getByText("Action 3")).toBeVisible();

    // Fill first action with valid data
    await canvasLocator.getByTestId("method-name-input-0").fill("transfer");
    await canvasLocator
      .getByTestId("arguments-input-0")
      .fill('{"receiver_id": "alice.near"}');
    await canvasLocator.getByTestId("gas-input-0").fill("30");
    await canvasLocator.getByTestId("deposit-input-0").fill("0.1");

    // Fill second action with invalid data to test validation
    await canvasLocator
      .getByTestId("method-name-input-1")
      .fill("invalid method");
    await canvasLocator.getByTestId("gas-input-1").fill("400");
    await canvasLocator.getByTestId("deposit-input-1").fill("0.1");

    // Fill third action with valid data
    await canvasLocator.getByTestId("method-name-input-2").fill("approve");
    await canvasLocator
      .getByTestId("arguments-input-2")
      .fill('{"amount": "1000"}');
    await canvasLocator.getByTestId("gas-input-2").fill("20");
    await canvasLocator.getByTestId("deposit-input-2").fill("0.05");

    // Fill contract ID
    await canvasLocator.getByTestId("contract-id-input").fill("theori.near");

    // Submit and check for validation errors on second action
    await canvasLocator.getByTestId("submit-button").click();

    await expect(
      canvasLocator.getByText(
        "Method name must be a single word (letters, numbers, underscore only)"
      )
    ).toBeVisible();
    await expect(
      canvasLocator.getByText("Gas must be between 0 and 300 Tgas")
    ).toBeVisible();

    // Fix second action
    await canvasLocator.getByTestId("method-name-input-1").fill("approve");
    await canvasLocator.getByTestId("gas-input-1").fill("25");

    // Remove third action (should not be possible to remove if only 1 action, but we have 3)
    const removeButtons = canvasLocator.locator(
      '[data-testid*="remove-action"]'
    );
    await expect(removeButtons).toHaveCount(3);

    // Remove action 3
    await canvasLocator.getByTestId("remove-action-2").click();
    await expect(canvasLocator.getByText("Action 3")).not.toBeVisible();
    await expect(canvasLocator.getByText("Action 2")).toBeVisible();

    const remainingRemoveButtons = canvasLocator.locator(
      '[data-testid*="remove-action"]'
    );
    await expect(remainingRemoveButtons).toHaveCount(2);
  });

  test("should create single action proposal and vote directly from table", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(200_000);
    const { worker, creatorAccount } = await setupWorker({
      daoAccount,
      instanceAccount,
      page,
    });

    await clickCreateRequestButton(page);

    // Fill the form with single action
    await fillCustomFunctionCallForm(page, {
      contractId: "theori.near",
      methodName: "transfer",
      args: '{"receiver_id": "alice.near", "amount": "1000000000000000000000000"}',
      gas: 30,
      deposit: 0.1,
      notes: "Test single action custom function call",
    });

    const canvasLocator = page.locator(".offcanvas-body");
    const submitButton = canvasLocator.getByTestId("submit-button");

    // Submit the form
    await submitButton.click();

    await page.getByRole("button", { name: "Confirm" }).click();

    // Check for success toast
    await expect(
      page.getByText("Function call request has been successfully created.")
    ).toBeVisible({ timeout: 30_000 });

    // Wait for the Confirm button to disappear - this ensures transaction completes
    await expect(
      page.getByRole("button", { name: "Confirm" })
    ).not.toBeVisible();

    await page.locator(".bi.bi-x-lg").click();

    await page.getByTestId("proposal-request-#0").click();
    await expect(
      page.getByRole("cell", { name: "0", exact: true })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Method Name")).toBeVisible();
    await expect(page.getByText("Arguments")).toBeVisible();
    await expect(page.getByText("Gas", { exact: true })).toBeVisible();
    await expect(page.getByText("Deposit", { exact: true })).toBeVisible();
    await expect(page.getByText("Note", { exact: true })).toBeVisible();
    await expect(page.getByText("Contract ID")).toBeVisible();

    // Vote directly from table (without opening details page)
    const approveButton = page.getByRole("button", { name: "Approve" });
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText(
        "The function call request has been successfully executed."
      )
    ).toBeVisible({ timeout: 30_000 });
  });

  test("should create multiple actions proposal and vote from details page", async ({
    page,
    daoAccount,
    instanceAccount,
  }) => {
    test.setTimeout(200_000);
    const { worker, creatorAccount } = await setupWorker({
      daoAccount,
      instanceAccount,
      page,
    });

    await clickCreateRequestButton(page);
    const canvasLocator = page.locator(".offcanvas-body");

    // Fill contract ID
    await canvasLocator.getByTestId("contract-id-input").fill("theori.near");

    // Add second action
    await canvasLocator.getByText("Add Another Action").click();

    // Add third action
    await canvasLocator.getByText("Add Another Action").click();

    // Fill first action
    await canvasLocator.getByTestId("method-name-input-0").fill("transfer");
    await canvasLocator
      .getByTestId("arguments-input-0")
      .fill(
        '{"receiver_id": "alice.near", "amount": "1000000000000000000000000"}'
      );
    await canvasLocator.getByTestId("gas-input-0").fill("30");
    await canvasLocator.getByTestId("deposit-input-0").fill("0.1");

    // Fill second action
    await canvasLocator.getByTestId("method-name-input-1").fill("approve");
    await canvasLocator
      .getByTestId("arguments-input-1")
      .fill('{"amount": "500000000000000000000000"}');
    await canvasLocator.getByTestId("gas-input-1").fill("25");
    await canvasLocator.getByTestId("deposit-input-1").fill("0.05");

    // Fill third action
    await canvasLocator.getByTestId("method-name-input-2").fill("mint");
    await canvasLocator
      .getByTestId("arguments-input-2")
      .fill(
        '{"account_id": "bob.near", "amount": "1000000000000000000000000"}'
      );
    await canvasLocator.getByTestId("gas-input-2").fill("35");
    await canvasLocator.getByTestId("deposit-input-2").fill("0.15");

    // Fill notes
    await canvasLocator
      .getByTestId("notes-input")
      .fill("Test multiple actions custom function call");

    // Submit the form
    await canvasLocator.getByTestId("submit-button").click();
    await page.getByRole("button", { name: "Confirm" }).click();

    // Check for success toast
    await expect(
      page.getByText("Function call request has been successfully created.")
    ).toBeVisible({ timeout: 30_000 });

    // Wait for the Confirm button to disappear - this ensures transaction completes
    await expect(
      page.getByRole("button", { name: "Confirm" })
    ).not.toBeVisible();

    await page.getByText("View Request", { exact: true }).click();

    // Verify multiple actions are displayed
    await expect(page.getByText("Action 1")).toBeVisible();
    await expect(page.getByText("Action 2")).toBeVisible();
    await expect(page.getByText("Action 3")).toBeVisible();
    await expect(page.getByText("Contract ID")).toBeVisible();
    await expect(
      page.getByText("Test multiple actions custom function call")
    ).toBeVisible();

    await expect(page.getByText("Method Name")).toHaveCount(3);
    await expect(page.getByText("Arguments")).toHaveCount(3);
    await expect(page.getByText("Gas", { exact: true })).toHaveCount(3);
    await expect(page.getByText("Deposit", { exact: true })).toHaveCount(3);

    const approveButton = page.getByRole("button", { name: "Approve" });
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText(
        "The function call request has been successfully executed."
      )
    ).toBeVisible({ timeout: 30_000 });
  });
});
