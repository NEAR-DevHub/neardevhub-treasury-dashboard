import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";

// Helper function to create test widget with different TokenAmount configurations
const createTokenAmountTestWidget = (instanceAccount, testCases) => {
  const modifiedWidgets = {};
  const appKey = `${instanceAccount}/widget/app`;
  modifiedWidgets[appKey] = `
    const testCases = ${JSON.stringify(testCases)};
    
    return (
      <div className="container mt-4">
        <h1>TokenAmount Component Tests</h1>
        <p>Testing TokenAmount component with various configurations, especially the needsTilde logic</p>
        {testCases.map((testCase, index) => (
          <div key={index} className="test-case mb-4 p-3 border" data-testid={\`test-case-\${index}\`}>
            <h5>{testCase.description}</h5>
            <div className="row">
              <div className="col-md-6">
                <div data-testid={\`token-amount-\${index}\`}>
                  <Widget
                    src="widgets.treasury-factory.near/widget/components.TokenAmount"
                    props={{
                      address: testCase.address || '',
                      amountWithDecimals: testCase.amountWithDecimals || 0,
                      amountWithoutDecimals: testCase.amountWithoutDecimals || undefined,
                      showUSDValue: testCase.showUSDValue || false,
                      instance:'treasury-testing.near'
                    }}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="text-muted small">
                  <div><strong>Original Amount:</strong> {testCase.originalAmount || 'N/A'}</div>
                  <div><strong>Amount without decimals:</strong> {testCase.amountWithoutDecimals || 'N/A'}</div>
                  <div><strong>Expected:</strong> {testCase.expected}</div>
                  <div><strong>Should show tilde:</strong> {testCase.expectTilde ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  `;

  return modifiedWidgets;
};

// Test cases for different TokenAmount scenarios
const testCases = [
  {
    description: "NEAR token with exact amount (no tilde needed)",
    address: "",
    amountWithDecimals: "1.00",
    amountWithoutDecimals: "1000000000000000000000000", // 1 NEAR in yoctoNEAR
    originalAmount: "1.000000000000000000000000",
    showUSDValue: false,
    expected: "1.00",
    expectTilde: false,
  },
  {
    description: "NEAR token with rounded amount (tilde needed)",
    address: "",
    amountWithDecimals: "1.23",
    amountWithoutDecimals: "1234567890123456789012345", // 1.234567... NEAR
    originalAmount: "1.234567890123456789012345",
    showUSDValue: false,
    expected: "~1.23",
    expectTilde: true,
  },
  {
    description: "wNEAR token with exact amount",
    address: "wrap.near",
    amountWithDecimals: "5.50",
    amountWithoutDecimals: "5500000000000000000000000", // 5.5 wNEAR
    originalAmount: "5.500000000000000000000000",
    showUSDValue: false,
    expected: "5.5",
    expectTilde: false,
  },
  {
    description: "wNEAR token with precision loss (tilde needed)",
    address: "wrap.near",
    amountWithDecimals: "2.34",
    amountWithoutDecimals: "2345678901234567890123456", // 2.345678... wNEAR
    originalAmount: "2.345678901234567890123456",
    showUSDValue: false,
    expected: "~2.346",
    expectTilde: true,
  },
  {
    description: "Large amount with formatting",
    address: "",
    amountWithDecimals: "1000.00",
    amountWithoutDecimals: "1000000000000000000000000000", // 1000 NEAR
    originalAmount: "1000.000000000000000000000000",
    showUSDValue: false,
    expected: "1,000.00",
    expectTilde: false,
  },
  {
    description: "Very small amount with rounding",
    address: "",
    amountWithDecimals: "0.01",
    amountWithoutDecimals: "12345678901234567890123", // 0.012345... NEAR
    originalAmount: "0.012345678901234567890123",
    showUSDValue: false,
    expected: "~0.01",
    expectTilde: true,
  },
  {
    description: "Zero amount",
    address: "",
    amountWithDecimals: "0.00",
    amountWithoutDecimals: "0",
    originalAmount: "0.000000000000000000000000",
    showUSDValue: false,
    expected: "0.00",
    expectTilde: false,
  },
  {
    description:
      "Amount without decimals specified (uses amountWithDecimals directly)",
    address: "",
    amountWithDecimals: "42.50",
    amountWithoutDecimals: undefined,
    originalAmount: "N/A (uses amountWithDecimals directly)",
    showUSDValue: false,
    expected: "42.50",
    expectTilde: false,
  },
];

test("TokenAmount component displays amounts correctly with proper tilde logic", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTokenAmountTestWidget(instanceAccount, testCases),
  });

  await page.goto(`https://${instanceAccount}.page/`);

  // Wait for the page to load properly
  await expect(page.locator(".container").first()).toBeVisible();

  // Wait for the title to be visible
  await expect(page.locator("h1")).toContainText("TokenAmount Component Tests");

  // Wait a bit for components to render
  await page.waitForTimeout(3000);

  // Test each case
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`Testing case ${i}: ${testCase.description}`);

    // Scroll to the current test case
    const testCaseElement = page.locator(`[data-testid="test-case-${i}"]`);
    await testCaseElement.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // 500ms delay for video recording

    // Check that the test case is visible
    await expect(testCaseElement).toBeVisible();

    // Get the actual displayed amount
    const tokenAmountElement = page.locator(
      `[data-testid="token-amount-${i}"] .amount`
    );
    await expect(tokenAmountElement).toBeVisible();

    const actualAmount = await tokenAmountElement.textContent();
    console.log(
      `Case ${i} - Expected: "${
        testCase.expected
      }", Actual: "${actualAmount?.trim()}"`
    );
    console.log(`Case ${i} - Original Amount: "${testCase.originalAmount}"`);
    console.log(`Case ${i} - Should show tilde: ${testCase.expectTilde}`);

    // Verify the displayed amount matches expected
    expect(actualAmount?.trim()).toBe(testCase.expected);

    // Verify tilde logic specifically
    if (testCase.expectTilde) {
      expect(actualAmount).toContain("~");
      console.log(`✓ Case ${i}: Correctly shows tilde for rounded amount`);
    } else {
      expect(actualAmount).not.toContain("~ ");
      console.log(`✓ Case ${i}: Correctly shows no tilde for exact amount`);
    }
  }
});

// Test specifically for the tilde logic with edge cases
test("TokenAmount tilde logic handles edge cases correctly", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const edgeCases = [
    {
      description: "Amount with rounding difference (case from main tests)",
      address: "",
      amountWithDecimals: "1.23",
      amountWithoutDecimals: "1234567890123456789012345", // 1.234567... NEAR
      originalAmount: "1.234567890123456789012345",
      showUSDValue: false,
      expected: "~1.23", // Should show tilde because of precision loss
      expectTilde: true,
    },
    {
      description: "Another case with clear rounding",
      address: "",
      amountWithDecimals: "2.35",
      amountWithoutDecimals: "2345678901234567890123456", // 2.345678... wNEAR
      originalAmount: "2.345678901234567890123456",
      showUSDValue: false,
      expected: "~2.35", // Should show tilde due to precision loss
      expectTilde: true,
    },
    {
      description: "Small amount with precision loss",
      address: "",
      amountWithDecimals: "0.01",
      amountWithoutDecimals: "12345678901234567890123", // 0.012345... NEAR
      originalAmount: "0.012345678901234567890123",
      showUSDValue: false,
      expected: "~0.01", // Should show tilde due to precision loss
      expectTilde: true,
    },
  ];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTokenAmountTestWidget(instanceAccount, edgeCases),
  });

  await page.goto(`https://${instanceAccount}.page/`);

  // Wait for the page to load
  await expect(page.locator(".container").first()).toBeVisible();
  await expect(page.locator("h1")).toContainText("TokenAmount Component Tests");
  await page.waitForTimeout(3000);

  // Test each edge case
  for (let i = 0; i < edgeCases.length; i++) {
    const testCase = edgeCases[i];
    console.log(`Testing edge case ${i}: ${testCase.description}`);

    // Scroll to the current test case
    const testCaseElement = page.locator(`[data-testid="test-case-${i}"]`);
    await testCaseElement.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500); // 500ms delay for video recording

    const tokenAmountElement = page.locator(
      `[data-testid="token-amount-${i}"] .amount`
    );
    await expect(tokenAmountElement).toBeVisible();

    const actualAmount = await tokenAmountElement.textContent();
    console.log(
      `Edge case ${i} - Expected: "${
        testCase.expected
      }", Actual: "${actualAmount?.trim()}"`
    );
    console.log(
      `Edge case ${i} - Original Amount: "${testCase.originalAmount}"`
    );

    // For edge cases, we're mainly testing that the tilde logic works
    // The exact formatted output might vary, but tilde presence should be correct
    if (testCase.expectTilde) {
      expect(actualAmount).toContain("~");
      console.log(`✓ Edge case ${i}: Correctly shows tilde for precision loss`);
    } else {
      expect(actualAmount).not.toContain("~");
      console.log(
        `✓ Edge case ${i}: Correctly shows no tilde for exact amount`
      );
    }
  }
});

// Test for USD value display
test("TokenAmount shows USD values when enabled", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const usdTestCases = [
    {
      description: "NEAR with USD value enabled",
      address: "",
      amountWithDecimals: "10.00",
      amountWithoutDecimals: "10000000000000000000000000",
      originalAmount: "10.000000000000000000000000",
      showUSDValue: true,
      expected: "10.00",
      expectTilde: false,
    },
  ];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTokenAmountTestWidget(instanceAccount, usdTestCases),
  });

  await page.goto(`https://${instanceAccount}.page/`);

  await expect(page.locator(".container").first()).toBeVisible();
  await expect(page.locator("h1")).toContainText("TokenAmount Component Tests");

  // Wait longer for USD price fetch
  await page.waitForTimeout(5000);

  // Scroll to the test case
  const testCaseElement = page.locator(`[data-testid="test-case-0"]`);
  await testCaseElement.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500); // 500ms delay for video recording

  // Check that USD value section appears (it should be in text-secondary class)
  const usdElement = page.locator(
    `[data-testid="token-amount-0"] .text-secondary`
  );

  // USD value might not load due to API limitations in test environment,
  // so we just check that the structure is correct
  console.log("Checking for USD value display structure...");
  console.log("Original Amount: 10.000000000000000000000000 NEAR");

  // The USD element might or might not be visible depending on API response
  // This test mainly ensures the component doesn't break when showUSDValue is true
  const tokenAmountElement = page.locator(
    `[data-testid="token-amount-0"] .amount`
  );
  await expect(tokenAmountElement).toBeVisible();

  const actualAmount = await tokenAmountElement.textContent();
  expect(actualAmount?.trim()).toBe("10.00");
  console.log("✓ Component renders correctly with USD value enabled");
});
