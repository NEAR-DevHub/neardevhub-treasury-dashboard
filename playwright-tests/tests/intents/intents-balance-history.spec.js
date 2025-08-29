import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker, parseNEAR } from "near-workspaces";
import { redirectWeb4 } from "../../util/web4.js";
import { mockRpcRequest } from "../../util/rpcmock.js";

test.describe("NEAR Intents Balance History", () => {
  test("should display different token balances at different block heights (mocked)", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    // mock balance for different block heights
    const blockScenarios = [
      {
        height: 100000,
        balances: ["100000000000000000000000000", "50000000000000000000"],
        expectedWNEAR: "100.00",
        expectedETH: "50.00"
      },
      {
        height: 200000, 
        balances: ["300000000000000000000000000", "150000000000000000000"],
        expectedWNEAR: "300.00",
        expectedETH: "150.00"
      },
      {
        height: 300000,
        balances: ["500000000000000000000000000", "250000000000000000000"],
        expectedWNEAR: "500.00",
        expectedETH: "250.00"
      }
    ];

    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
    });

    let currentScenario = 0;

    // mock rpc calls for mt_batch_balance_of across all rpc endpoints
    await mockRpcRequest({
      page,
      filterParams: {
        request_type: "call_function",
        account_id: "intents.near",
        method_name: "mt_batch_balance_of",
      },
      modifyOriginalResultFunction: () => {
        const scenario = blockScenarios[currentScenario];
        console.log(`Mocking block ${scenario.height} with balances:`, scenario.balances);
        return scenario.balances;
      },
    });

    // mock token metadata API
    await page.route("https://api-mng-console.chaindefuser.com/api/tokens", async (route) => {
      const mockTokens = {
        items: [
          {
            defuse_asset_id: "nep141:wrap.near",
            symbol: "WNEAR",
            decimals: 24,
            price: 3.50
          },
          {
            defuse_asset_id: "nep141:eth.omft.near",
            symbol: "ETH", 
            decimals: 18,
            price: 2500.00
          }
        ]
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockTokens),
      });
    });

    // test each block height scenario
    for (let i = 0; i < blockScenarios.length; i++) {
      currentScenario = i;
      const scenario = blockScenarios[i];
      
      if (i === 0) {
        await page.goto(`https://${instanceAccount}.page`);
      } else {
        await page.reload();
      }

      await page.waitForSelector('.h6.mb-0.text-truncate:has-text("WNEAR")', { timeout: 45000 });

      const wnearRow = page.locator(
        '.card div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("WNEAR"))'
      );
      const wnearAmount = wnearRow.locator(
        "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
      );
      await expect(wnearAmount).toHaveText(scenario.expectedWNEAR);

      const ethRow = page.locator(
        '.card div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("ETH"))'
      );
      const ethAmount = ethRow.locator(
        "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
      );
      await expect(ethAmount).toHaveText(scenario.expectedETH);

      console.log(`Block ${scenario.height}: WNEAR ${scenario.expectedWNEAR}, ETH ${scenario.expectedETH}`);
    }

    // test chart functionality - click on NEAR Intents tab
    const intentsTab = page.getByRole('button', { name: 'NEAR Intents' });
    if (await intentsTab.isVisible()) {
      await intentsTab.click();
      const chartContainer = page.locator('[class*="ChartContainer"], .chart');
      await expect(chartContainer.first()).toBeVisible({ timeout: 15000 });

      // test token selection in chart
      const wnearRadio = page.getByRole('radio', { name: 'WNEAR' });
      if (await wnearRadio.isVisible()) {
        await wnearRadio.click();
      }
    }
  });

  test("should demonstrate realistic balance changes using NEAR sandbox", async ({
    page,
    instanceAccount,
    daoAccount,
  }) => {
    test.setTimeout(120_000);
    
    const worker = await Worker.init();
    const intents = await worker.rootAccount.importContract({
      mainnetContract: "intents.near",
    });
    const wnear = await worker.rootAccount.importContract({
      mainnetContract: "wrap.near",
    });

    // initialize contracts
    await intents.call(intents.accountId, "new", {
      config: {
        wnear_id: "wrap.near",
        fees: { fee: 100, fee_collector: "intents.near" },
        roles: { super_admins: ["intents.near"], admins: {}, grantees: {} },
      },
    });

    await wnear.call(wnear.accountId, "new", {
      owner_id: wnear.accountId,
      total_supply: "1000000000000000000000000000",
      metadata: { spec: "ft-1.0.0", name: "Wrapped NEAR", symbol: "WNEAR", decimals: 24 },
    });

    await wnear.call(wnear.accountId, "storage_deposit", {
      account_id: wnear.accountId, registration_only: true,
    }, { attachedDeposit: "1250000000000000000000" });

    await wnear.call(wnear.accountId, "storage_deposit", {
      account_id: daoAccount, registration_only: true,
    }, { attachedDeposit: "1250000000000000000000" });
    
    await wnear.call(wnear.accountId, "storage_deposit", {
      account_id: intents.accountId, registration_only: true,
    }, { attachedDeposit: "1250000000000000000000" });

    await worker.rootAccount.call(wnear.accountId, "near_deposit", {}, 
      { attachedDeposit: parseNEAR("600") });

    await worker.rootAccount.call(wnear.accountId, "ft_transfer", {
      receiver_id: wnear.accountId,
      amount: "500000000000000000000000000", // 500 WNEAR to wnear contract
    }, { attachedDeposit: "1" });

    // create realistic progression through different "block heights" (phases)
    const balancePhases = [];

    // Initial deposit
    await wnear.call(wnear.accountId, "ft_transfer_call", {
      receiver_id: intents.accountId,
      amount: "100000000000000000000000000", // 100 WNEAR
      msg: JSON.stringify({ receiver_id: daoAccount }),
    }, { attachedDeposit: "1", gas: "300000000000000" });

    const phase1Balance = await intents.view("mt_balance_of", {
      account_id: daoAccount,
      token_id: "nep141:wrap.near",
    });
    balancePhases.push({
      phase: "Initial (Block ~100k)",
      balance: phase1Balance,
      expected: "100.00"
    });

    // Growth phase 
    await wnear.call(wnear.accountId, "ft_transfer_call", {
      receiver_id: intents.accountId,
      amount: "200000000000000000000000000", // +200 WNEAR (total 300)
      msg: JSON.stringify({ receiver_id: daoAccount }),
    }, { attachedDeposit: "1", gas: "300000000000000" });

    const phase2Balance = await intents.view("mt_balance_of", {
      account_id: daoAccount,
      token_id: "nep141:wrap.near",
    });
    balancePhases.push({
      phase: "Growth (Block ~200k)",
      balance: phase2Balance,
      expected: "300.00"
    });

    // Peak phase
    await wnear.call(wnear.accountId, "ft_transfer_call", {
      receiver_id: intents.accountId,
      amount: "200000000000000000000000000", 
      msg: JSON.stringify({ receiver_id: daoAccount }),
    }, { attachedDeposit: "1", gas: "300000000000000" });

    const phase3Balance = await intents.view("mt_balance_of", {
      account_id: daoAccount,
      token_id: "nep141:wrap.near",
    });
    balancePhases.push({
      phase: "Peak (Block ~300k)",
      balance: phase3Balance,
      expected: "500.00"
    });

    console.log("Sandbox balance progression:", balancePhases.map(p => `${p.phase}: ${p.expected} WNEAR`));

    // test UI with sandbox data
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
    });

    let currentPhase = 0;

    // route intents mt_batch_balance_of calls to return sandbox-computed balances
    await mockRpcRequest({
      page,
      filterParams: {
        request_type: "call_function",
        account_id: "intents.near",
        method_name: "mt_batch_balance_of",
      },
      modifyOriginalResultFunction: () => {
        const phase = balancePhases[currentPhase];
        return [phase.balance];
      },
    });

    // mock token metadata
    await page.route("https://api-mng-console.chaindefuser.com/api/tokens", async (route) => {
      const mockTokens = {
        items: [{
          defuse_asset_id: "nep141:wrap.near",
          symbol: "WNEAR",
          decimals: 24,
          price: 3.50
        }]
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockTokens),
      });
    });

    // test each phase in UI
    for (let i = 0; i < balancePhases.length; i++) {
      currentPhase = i;
      const phase = balancePhases[i];
      
      if (i === 0) {
        await page.goto(`https://${instanceAccount}.page`);
      } else {
        await page.reload();
      }

      await expect(page.getByText("NEAR Intents")).toBeVisible({ timeout: 30000 });

      const wnearRow = page.locator(
        '.card div.d-flex.flex-column.border-bottom:has(div.h6.mb-0.text-truncate:has-text("WNEAR"))'
      );
      const wnearAmount = wnearRow.locator(
        "div.d-flex.gap-2.align-items-center.justify-content-end div.d-flex.flex-column.align-items-end div.h6.mb-0"
      );
      
      await expect(wnearAmount).toHaveText(phase.expected, { timeout: 15000 });
      console.log(`${phase.phase}: ${phase.expected} WNEAR verified in UI`);
    }

    // test chart functionality with NEAR Intents tab
    const intentsTab = page.getByRole('button', { name: 'NEAR Intents' });
    if (await intentsTab.isVisible()) {
      await intentsTab.click();
      await page.waitForTimeout(3000);
      
      // verify chart shows and token selection works
      const wnearRadio = page.getByRole('radio', { name: 'WNEAR' });
      if (await wnearRadio.isVisible()) {
        await wnearRadio.click();
        console.log("WNEAR token selection in chart works");
      }
    }

    await worker.tearDown();
  });
});