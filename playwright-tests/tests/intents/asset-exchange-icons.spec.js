import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";

test("Asset exchange table doesn't show placeholder icons for 1Click tokens", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const modifiedWidgets = {};
  const appKey = `${instanceAccount}/widget/app`;
  
  // Create a test widget that shows the asset exchange table with 1Click tokens
  modifiedWidgets[appKey] = `
    const instance = "treasury-testing.near";
    
    // Mock proposal data with 1Click tokens
    const mockProposals = [
      {
        id: 1,
        submission_time: "1723312345000000000",
        status: "Executed",
        description: JSON.stringify({
          tokenIn: "ETH",
          tokenOut: "USDC",
          amountIn: "0.1",
          amountOut: "350.00",
          minAmountReceive: "340.00",
        }),
        proposer: "test.near",
        votes: {},
      },
      {
        id: 2,
        submission_time: "1723312345000000000",
        status: "InProgress",
        description: JSON.stringify({
          tokenIn: "wrap.near",
          tokenOut: "BTC",
          amountIn: "100",
          amountOut: "0.001",
          minAmountReceive: "0.00095",
        }),
        proposer: "test.near",
        votes: {},
      }
    ];
    
    return (
      <div className="container mt-4">
        <h1>Asset Exchange Icons Test</h1>
        <p>Testing that 1Click tokens don't show placeholder icons</p>
        
        <h3>Table View</h3>
        <Widget
          src="widgets.treasury-factory.near/widget/pages.asset-exchange.Table"
          props={{
            instance: instance,
            proposals: mockProposals,
            isPendingRequests: true,
            refreshTableData: () => {},
          }}
        />
        
        <h3 className="mt-5">Individual TokenAmount Components</h3>
        <div className="row">
          <div className="col-md-4">
            <h5>ETH (1Click token)</h5>
            <div data-testid="token-amount-eth">
              <Widget
                src="widgets.treasury-factory.near/widget/components.TokenAmount"
                props={{
                  instance: instance,
                  symbol: "ETH",
                  amountWithDecimals: "0.1",
                  showUSDValue: false,
                }}
              />
            </div>
          </div>
          <div className="col-md-4">
            <h5>USDC (1Click token)</h5>
            <div data-testid="token-amount-usdc">
              <Widget
                src="widgets.treasury-factory.near/widget/components.TokenAmount"
                props={{
                  instance: instance,
                  symbol: "USDC",
                  amountWithDecimals: "350.00",
                  showUSDValue: false,
                }}
              />
            </div>
          </div>
          <div className="col-md-4">
            <h5>wrap.near (contract)</h5>
            <div data-testid="token-amount-wnear">
              <Widget
                src="widgets.treasury-factory.near/widget/components.TokenAmount"
                props={{
                  instance: instance,
                  address: "wrap.near",
                  amountWithDecimals: "100",
                  showUSDValue: false,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  `;
  
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets,
  });

  await page.goto(`https://${instanceAccount}.page/`);
  
  // Wait for the page to load
  await expect(page.locator(".container").first()).toBeVisible();
  await expect(page.locator("h1")).toContainText("Asset Exchange Icons Test");
  
  // Give time for components to render
  await page.waitForTimeout(3000);
  
  // Test individual TokenAmount components
  console.log("Testing individual TokenAmount components...");
  
  // Check ETH token amount
  const ethElement = page.locator('[data-testid="token-amount-eth"]');
  await expect(ethElement).toBeVisible();
  const ethText = await ethElement.textContent();
  console.log(`ETH TokenAmount text: "${ethText}"`);
  
  // Should show "0.10 ETH" without any placeholder icon
  expect(ethText).toContain("0.10");
  expect(ethText).toContain("ETH");
  
  // Check that there's no img tag with broken source
  const ethImgCount = await ethElement.locator('img[src="null"]').count();
  expect(ethImgCount).toBe(0);
  console.log("✓ ETH shows no placeholder icon");
  
  // Check USDC token amount
  const usdcElement = page.locator('[data-testid="token-amount-usdc"]');
  await expect(usdcElement).toBeVisible();
  const usdcText = await usdcElement.textContent();
  console.log(`USDC TokenAmount text: "${usdcText}"`);
  
  expect(usdcText).toContain("350.00");
  expect(usdcText).toContain("USDC");
  
  const usdcImgCount = await usdcElement.locator('img[src="null"]').count();
  expect(usdcImgCount).toBe(0);
  console.log("✓ USDC shows no placeholder icon");
  
  // Check wNEAR (should have icon)
  const wnearElement = page.locator('[data-testid="token-amount-wnear"]');
  await expect(wnearElement).toBeVisible();
  const wnearText = await wnearElement.textContent();
  console.log(`wNEAR TokenAmount text: "${wnearText}"`);
  
  expect(wnearText).toContain("100.00");
  // wNEAR should have an actual icon
  const wnearImgCount = await wnearElement.locator('img').count();
  expect(wnearImgCount).toBeGreaterThan(0);
  console.log("✓ wNEAR shows proper icon");
  
  console.log("\nAll tests passed! No placeholder icons for 1Click tokens.");
});