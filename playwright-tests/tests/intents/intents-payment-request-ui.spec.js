import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";
import { Account, parseNEAR, Worker } from "near-workspaces";
import { connect } from "near-api-js";
import { PROPOSAL_BOND, setPageAuthSettings } from "../../util/sandboxrpc.js";
import { mockNearBalances } from "../../util/rpcmock.js";

test("should create payment request to BTC address", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  test.setTimeout(120000);
  const availableTokens = (
    await fetch("https://api-mng-console.chaindefuser.com/api/tokens").then(
      (r) => r.json()
    )
  ).items;
  const tokenId = availableTokens.find(
    (token) => token.defuse_asset_id === "nep141:btc.omft.near"
  ).defuse_asset_id;

  const supportedTokens = await fetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: "dontcare",
      jsonrpc: "2.0",
      method: "supported_tokens",
      params: [
        {
          chains: [
            "btc:mainnet", // Ethereum Mainnet
          ],
        },
      ],
    }),
  }).then((r) => r.json());

  const nativeToken = supportedTokens.result.tokens[0];
  expect(nativeToken.near_token_id).toEqual("btc.omft.near");

  expect(tokenId).toEqual("nep141:btc.omft.near");

  const worker = await Worker.init();
  await worker.rootAccount.importContract({
    mainnetContract: instanceAccount,
  });

  const socialNearAccount = await worker.rootAccount.importContract({
    mainnetContract: "social.near",
  });

  await socialNearAccount.call(
    socialNearAccount.accountId,
    "new",
    {},
    { gas: "300000000000000" }
  );

  await socialNearAccount.call(
    socialNearAccount.accountId,
    "set_status",
    { status: "Live" },
    { gas: "300000000000000" }
  );

  const mainnet = await connect({
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.fastnear.com",
  });

  const omftContract = await worker.rootAccount.importContract({
    mainnetContract: "omft.near",
  });
  const omftMainnetAccount = await mainnet.account(omftContract.accountId);

  await omftContract.call(omftContract.accountId, "new", {
    super_admins: ["omft.near"],
    admins: {},
    grantees: {
      DAO: ["omft.near"],
      TokenDeployer: ["omft.near"],
      TokenDepositer: ["omft.near"],
    },
  });

  await omftContract.call(
    omftContract.accountId,
    "deploy_token",
    {
      token: "btc",
      metadata: await omftMainnetAccount.viewFunction({
        contractId: nativeToken.near_token_id,
        methodName: "ft_metadata",
      }),
    },
    { attachedDeposit: parseNEAR("3"), gas: 300_000_000_000_000n.toString() }
  );

  // Import factory at the time testdao was created
  const intentsContract = await worker.rootAccount.importContract({
    mainnetContract: "intents.near",
  });
  await intentsContract.call(intentsContract.accountId, "new", {
    config: {
      wnear_id: "wrap.near",
      fees: {
        fee: 100,
        fee_collector: "intents.near",
      },
      roles: {
        super_admins: ["intents.near"],
        admins: {},
        grantees: {},
      },
    },
  });

  await omftContract.call(
    nativeToken.near_token_id,
    "storage_deposit",
    {
      account_id: intentsContract.accountId,
      registration_only: true,
    },
    {
      attachedDeposit: 1_500_0000000000_0000000000n.toString(),
    }
  );

  const modifiedWidgets = {};
  const configKey = `${instanceAccount}/widget/config.data`;

  // Enable feature flag
  modifiedWidgets[configKey] = (
    await getLocalWidgetContent(configKey, {
      treasury: daoAccount,
      account: instanceAccount,
    })
  ).replace("treasuryDaoID:", "showNearIntents: true, treasuryDaoID:");

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "sandbox",
    sandboxNodeUrl: worker.provider.connection.url,
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });

  const creatorAccount = await worker.rootAccount.createSubAccount(
    "testcreator"
  );

  await mockNearBalances({
    page,
    accountId: creatorAccount.accountId,
    balance: (await creatorAccount.availableBalance()).toString(),
    storage: (await creatorAccount.balance()).staked,
  });

  const daoName = daoAccount.split(".")[0];
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
    gas: 300_000_000_000_000n.toString(),
  });

  await mockNearBalances({
    page,
    accountId: daoContract.accountId,
    balance: (
      await daoContract.getAccount(daoAccount).availableBalance()
    ).toString(),
    storage: (await daoContract.getAccount(daoAccount).balance()).staked,
  });

  await omftContract.call(
    omftContract.accountId,
    "ft_deposit",
    {
      owner_id: "intents.near",
      token: "btc",
      amount: 320_00_000_000n.toString(),
      msg: JSON.stringify({ receiver_id: daoAccount }),
      memo: `BRIDGED_FROM:${JSON.stringify({
        networkType: "btc",
        chainId: "1",
        txHash:
          "0xc6b7ecd5c7517a8f56ac7ec9befed7d26a459fc97c7d5cd7598d4e19b5a806b7",
      })}`,
    },
    {
      attachedDeposit: parseNEAR("0.00125"),
      gas: 300_000_000_000_000n.toString(),
    }
  );

  await page.goto(`https://${instanceAccount}.page/`);
  await setPageAuthSettings(
    page,
    creatorAccount.accountId,
    await creatorAccount.getKey()
  );

  const btcRowLocator = page.locator(
    '.card div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("BTC"))'
  );
  const btcAmountElement = btcRowLocator.locator(
    "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
  );
  await btcAmountElement.scrollIntoViewIfNeeded();
  await expect(btcAmountElement).toHaveText("320.00");

  await page.waitForTimeout(500);

  await page.getByRole("link", { name: "Payments" }).click();

  const createRequestButton = await page.getByText("Create Request");
  await createRequestButton.click();
  await expect(page.getByText("Create Payment Request")).toBeVisible();

  await page.getByTestId("tokens-dropdown").locator("div").first().click();

  await expect(
    await page
      .getByTestId("tokens-dropdown")
      .locator("div.d-flex.flex-column.gap-1.w-100.text-wrap")
      .filter({ hasText: "NEAR" })
      .first()
  ).toBeVisible();

  await expect(
    await page
      .getByTestId("tokens-dropdown")
      .locator("div.d-flex.flex-column.gap-1.w-100.text-wrap")
      .filter({ hasText: "BTC (NEAR Intents)" })
  ).toBeVisible();

  await page.locator(".dropdown-toggle").first().click();
  await page.getByText("Add manual request").click();
  await page.getByTestId("proposal-title").click();
  await page.getByTestId("proposal-title").fill("btc proposal title");
  await page.getByTestId("proposal-summary").click();
  await page
    .getByTestId("proposal-summary")
    .fill("describing the btc payment request proposal");
  await page.getByTestId("tokens-dropdown").getByText("Select").click();
  await page.getByText("BTC (NEAR Intents)").click();
  await page.getByTestId("total-amount").click();
  await page.getByTestId("total-amount").fill("2");
  await page.getByTestId("btc-recipient").click();
  await page
    .getByTestId("btc-recipient")
    .fill("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh");

  await expect(
    page.getByText("Please enter valid account ID")
  ).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Confirm Transaction")).toBeVisible();

  const transactionContent = JSON.stringify(
    JSON.parse(await page.locator("pre div").innerText())
  );
  expect(transactionContent).toBe(
    JSON.stringify({
      proposal: {
        description:
          "* Title: btc proposal title <br>* Summary: describing the btc payment request proposal",
        kind: {
          FunctionCall: {
            receiver_id: intentsContract.accountId,
            actions: [
              {
                method_name: "ft_withdraw",
                args: Buffer.from(
                  JSON.stringify({
                    token: "btc.omft.near",
                    receiver_id: "btc.omft.near",
                    amount: 2_00000000n.toString(),
                    memo: "WITHDRAW_TO:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                  })
                ).toString("base64"),
                deposit: 1n.toString(),
                gas: 30_000_000_000_000n.toString(),
              },
            ],
          },
        },
      },
    })
  );
  await page.getByRole("button", { name: "Confirm" }).click();

  const proposalColumns = page.getByTestId("proposal-request-#0").locator("td");
  await expect(proposalColumns.nth(5)).toHaveText(
    "@bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
  );
  await expect(proposalColumns.nth(6)).toHaveText("BTC");
  await expect(proposalColumns.nth(7)).toHaveText("2.00");

  await proposalColumns.nth(7).click();

  await page.getByRole("button", { name: "Approve" }).nth(1).click();
  await page.getByRole("button", { name: "Proceed Anyway" }).click();

  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount,
      token_ids: [tokenId],
    })
  ).toEqual([320_00_000_000n.toString()]);

  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Confirm Transaction")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(
    page.getByText("The payment request has been successfully executed.")
  ).toBeVisible({ timeout: 15_000 });
  expect(
    await intentsContract.view("mt_batch_balance_of", {
      account_id: daoAccount,
      token_ids: [tokenId],
    })
  ).toEqual([318_00_000_000n.toString()]);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await btcAmountElement.scrollIntoViewIfNeeded();
  await expect(btcAmountElement).toHaveText("318.00");
  await page.waitForTimeout(500);
});
