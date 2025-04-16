import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";
import {
  DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID,
  SandboxRPC,
} from "../../util/sandboxrpc.js";
import { createDAOargs } from "../../util/sputnikdao.js";
import nearApi from "near-api-js";

test("should update bootstrap widget and upgrade instance with it", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await cacheCDN(page);

  const sandbox = new SandboxRPC();
  await sandbox.init();

  const widget_reference_account_id = DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID;
  await sandbox.setupDefaultWidgetReferenceAccount();

  const instanceName = "theupgradable";

  const instanceAccountId = `${instanceName}.near`;

  const createInstanceResult = await sandbox.account.functionCall({
    contractId: "treasury-factory.near",
    methodName: "create_instance",
    args: {
      sputnik_dao_factory_account_id: "sputnik-dao.near",
      social_db_account_id: "social.near",
      widget_reference_account_id: widget_reference_account_id,
      name: instanceName,
      create_dao_args: Buffer.from(
        JSON.stringify(
          createDAOargs({
            instanceName: instanceName,
            adminAccountId: sandbox.account.accountId,
          })
        )
      ).toString("base64"),
    },
    gas: 300000000000000,
    attachedDeposit: nearApi.utils.format.parseNearAmount("9"),
  });

  expect(
    createInstanceResult.receipts_outcome.filter(
      (receipt_outcome) => receipt_outcome.outcome.status.Failure
    ).length
  ).toBe(0);

  // The initial update that is already applied, so should automatically be dismissed when visiting the updates page
  await sandbox.modifyWidget(
    "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry",
    `
    return [
      {
        id: 1,
        createdDate: "2025-03-25",
        version: "n/a",
        type: "Widgets",
        summary: "Added lockup",
        details: "",
        votingRequired: false,
      }
  ];
  `
  );

  await sandbox.redirectWeb4(instanceAccountId, page);

  await page.goto(`https://${instanceName}.near.page`);

  // Normal users should not see the update banner
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  const keyPair = await sandbox.keyStore.getKey("sandbox", sandbox.account_id);
  await page.evaluate(
    ({ accountId, publicKey, privateKey }) => {
      localStorage.setItem("near-social-vm:v01::accountId:", accountId);
      localStorage.setItem(
        `near-api-js:keystore:${accountId}:mainnet`,
        privateKey
      );
      localStorage.setItem(
        "near-wallet-selector:recentlySignedInWallets",
        JSON.stringify(["my-near-wallet"])
      );
      localStorage.setItem(
        "near-wallet-selector:selectedWalletId",
        JSON.stringify("my-near-wallet")
      );
      localStorage.setItem(
        "near_app_wallet_auth_key",
        JSON.stringify({ accountId, allKeys: [publicKey] })
      );
      localStorage.setItem(
        "near-wallet-selector:contract",
        JSON.stringify({ contractId: "social.near", methodNames: [] })
      );
    },
    {
      accountId: sandbox.account_id,
      publicKey: keyPair.getPublicKey().toString(),
      privateKey: keyPair.toString(),
    }
  );

  await page.reload();
  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible();
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled({
    timeout: 20_000,
  });

  await expect(page.getByText("Web4 Contract")).not.toBeVisible({
    timeout: 10_000,
  });

  // Visiting the updates page above should have automatically marked the widgets as up to date, and notification banner should disappear
  await page.goto(`https://${instanceName}.near.page/`);
  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  // Now make a new update to the app widget
  await sandbox.modifyWidget(
    "bootstrap.treasury-factory.near/widget/app",
    `/**
 * This is the main entry point for the Treasury application.
 * Page route gets passed in through params, along with all other page props.
 */

const { page, ...passProps } = props;

// Import our modules
const { AppLayout } = VM.require(
  "\${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.templates.AppLayout"
) || { AppLayout: () => <></> };

const { instance, treasuryDaoID } = VM.require(
  "\${REPL_BOOTSTRAP_ACCOUNT}/widget/config.data"
);

if (!instance || !treasuryDaoID) {
  return <></>;
}

if (!page) {
  // If no page is specified, we default to the feed page TEMP
  page = "dashboard";
}

const propsToSend = { ...passProps, instance: instance };

// This is our navigation, rendering the page based on the page parameter
function Page() {
  const routes = page.split(".");
  switch (routes[0]) {
    case "dashboard": {
      return (
        <Widget
          src="\${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.index"
          props={propsToSend}
        />
      );
    }
    // ?page=settings
    case "settings": {
      return (
        <Widget
          src={"\${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.index"}
          props={propsToSend}
        />
      );
    }
    case "payments": {
      return (
        <Widget
          src={"\${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.index"}
          props={propsToSend}
        />
      );
    }

    case "stake-delegation": {
      return (
        <Widget
          src={
            "\${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.index"
          }
          props={propsToSend}
        />
      );
    }

    case "asset-exchange": {
      return (
        <Widget
          src={
            "\${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.index"
          }
          props={propsToSend}
        />
      );
    }

    case "proposals-feed": {
      return (
        <Widget
          src={
            "\${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.proposals-feed.index"
          }
          props={propsToSend}
        />
      );
    }

    case "lockup": {
      return (
        <Widget
          src={"\${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.index"}
          props={propsToSend}
        />
      );
    }

    default: {
      // TODO: 404 page
      return <p>404</p>;
    }
  }
}

return (
  <AppLayout
    page={page}
    instance={instance}
    treasuryDaoID={treasuryDaoID}
    accountId={context.accountId}
  >
    HELLO I AM UDPATED
    <Page />
  </AppLayout>
);
`);

  await sandbox.modifyWidget(
    "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry",
    `
    return [
      {
          id: 99999998,
          createdDate: "2025-04-05",
          version: "n/a",
          type: "Widgets",
          summary: "Remove everything",
          votingRequired: false
      }
  ];
  `
  );

  await page.goto(`https://${instanceName}.near.page/`);

  await expect(await page.getByText("HELLO I AM UDPATED")).toBeVisible();
  await expect(await page.getByRole("link", { name: "Review" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: "Review" }).click();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(page.getByText("Web4 Contract")).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("button", { hasText: "Review" }).click();
  await page.getByRole("button", { name: "Yes, proceed" }).click();

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    await page.getByRole("button", { name: "Confirm" })
  ).not.toBeVisible();

  await page.reload();

  await expect(await page.getByText("Available Updates")).toBeEnabled();

  await expect(page.getByText("Widgets")).not.toBeVisible({
    timeout: 10_000,
  });

  await page.goto(`https://${instanceName}.near.page/`);

  await page.waitForTimeout(500);
  await expect(
    await page.getByRole("link", { name: "Review" })
  ).not.toBeVisible();

  await page.getByText("Settings").click();
  await page.getByText("System updates").click();
  await page.getByText("History").click();
  await expect(page.getByText("2025-04-02")).toBeVisible();
  await expect(page.getByText("99999998")).toBeVisible();
  await expect(page.getByText("contract update test")).toBeVisible();

  await page.waitForTimeout(500);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await sandbox.quitSandbox();
});
