# Testing Individual Components

This guide explains how to write tests for individual BOS components in the treasury dashboard, including how to properly use `redirectWeb4`, handle instance accounts, and load specific widgets.

## Overview

The treasury dashboard uses a multi-instance architecture where:
- **Instance accounts** (e.g., `treasury-devdao.near`) are the application instances
- **Widget account** (`widgets.treasury-factory.near`) contains all the shared widget code
- Components are loaded via NEAR Social's viewer system

## Basic Test Structure

Here's the basic structure for testing an individual component:

```javascript
import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";

test.describe("MyComponent Tests", () => {
  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    // Set up redirectWeb4 to load components from local filesystem
    await redirectWeb4({
      page,
      contractId: instanceAccount,  // The instance account (e.g., treasury-devdao.near)
      treasury: daoAccount,         // The DAO account (e.g., treasury-devdao.sputnik-dao.near)
    });
    
    // Navigate to the instance page
    await page.goto(`https://${instanceAccount}.page/`);
    await page.waitForTimeout(1000);
  });

  test("renders correctly", async ({ page, instanceAccount }) => {
    // Your test code here
  });
});
```

## Understanding the Account Structure

### Instance Account vs Widget Account

- **Instance Account** (`instanceAccount`): This is the specific treasury instance (e.g., `treasury-devdao.near`, `treasury-testing.near`)
  - Used in `redirectWeb4` as the `contractId`
  - Used in the page URL: `https://${instanceAccount}.page/`
  - Passed as `instance` prop to components

- **Widget Account** (`widgets.treasury-factory.near`): This contains all the shared widget code
  - Used as the source in `viewer.setAttribute("src", "widgets.treasury-factory.near/widget/...")`
  - All components are loaded from this account

### Example Directory Structure
```
instances/
├── treasury-devdao.near/       # Instance configuration
├── treasury-testing.near/      # Another instance
└── widgets.treasury-factory.near/  # All widget code lives here
    └── widget/
        ├── pages/
        ├── components/
        └── lib/
```

## Loading a Specific Component

To load and test a specific component without the full application:

```javascript
const setupComponent = async (page, instanceAccount, theme = "light") => {
  await page.evaluate(
    ({ instanceAccount, theme }) => {
      // Clear any existing viewers
      document.querySelectorAll("near-social-viewer").forEach((el) => el.remove());
      
      const viewer = document.createElement("near-social-viewer");
      
      // Set initial props - instance should be the instanceAccount
      viewer.setAttribute(
        "initialProps",
        JSON.stringify({
          instance: instanceAccount,  // This tells the component which instance it belongs to
          // Add any other props your component needs
        })
      );
      
      // Set the source - always from widgets.treasury-factory.near
      viewer.setAttribute(
        "src",
        "widgets.treasury-factory.near/widget/pages.asset-exchange.OneClickExchangeForm"
      );
      
      document.body.appendChild(viewer);
    },
    { instanceAccount, theme }
  );

  // Wait for component to load
  await page.waitForTimeout(2000);
};
```

## Using redirectWeb4

`redirectWeb4` sets up request interception to load widgets from your local filesystem instead of from the blockchain. Here's how it works:

```javascript
await redirectWeb4({
  page,                    // The Playwright page object
  contractId: instanceAccount,  // The instance account (NOT the widget account)
  treasury: daoAccount,    // The associated DAO account
});
```

### Common Mistakes

1. **Wrong contractId in redirectWeb4**
   ```javascript
   // ❌ Wrong - using widget account
   await redirectWeb4({
     contractId: "widgets.treasury-factory.near",
     ...
   });
   
   // ✅ Correct - using instance account
   await redirectWeb4({
     contractId: instanceAccount,
     ...
   });
   ```

2. **Wrong source in viewer.setAttribute**
   ```javascript
   // ❌ Wrong - using instance account
   viewer.setAttribute("src", `${instanceAccount}/widget/...`);
   
   // ✅ Correct - always use widgets.treasury-factory.near
   viewer.setAttribute("src", "widgets.treasury-factory.near/widget/...");
   ```

## Mocking API and RPC Responses

When testing components in isolation, you'll need to mock external dependencies:

### Mocking API Calls
```javascript
await page.route("https://api.example.com/endpoint", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: "mocked" }),
  });
});
```

### Mocking RPC Calls
```javascript
await page.route("**/rpc", async (route) => {
  const request = route.request();
  const body = request.postDataJSON();

  if (body.params?.method_name === "get_config") {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          result: Array.from(
            new TextEncoder().encode(
              JSON.stringify({
                metadata: btoa(JSON.stringify({ 
                  theme: "light",
                  primaryColor: "#01BF7A" 
                })),
              })
            )
          ),
        },
      }),
    });
  } else {
    await route.continue();
  }
});
```

## Testing Different Instances

The test framework runs tests across multiple instances automatically. You can see this in the test output:
```
✓  1 [treasury-testing] › tests/component.spec.js
✓  2 [treasury-dashboard] › tests/component.spec.js
✓  3 [infinex] › tests/component.spec.js
```

Each test is run with different `instanceAccount` and `daoAccount` values.

## Best Practices

1. **Always use redirectWeb4 in beforeEach**: This ensures widgets are loaded from your local filesystem
2. **Navigate to the instance page**: Use `https://${instanceAccount}.page/` as your base URL
3. **Mock external dependencies**: Mock API and RPC calls to make tests reliable
4. **Use appropriate timeouts**: Components may take time to load, use `waitForTimeout` or `waitForSelector`
5. **Test multiple themes**: If your component supports themes, test both light and dark modes
6. **Clean up viewers**: Always remove existing viewers before creating new ones

## Example: Complete Component Test

Here's a complete example testing a form component:

```javascript
import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";

test.describe("FormComponent", () => {
  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
    });
    
    await page.goto(`https://${instanceAccount}.page/`);
  });

  const setupComponent = async (page, instanceAccount) => {
    await page.evaluate(
      ({ instanceAccount }) => {
        document.querySelectorAll("near-social-viewer").forEach(el => el.remove());
        
        const viewer = document.createElement("near-social-viewer");
        viewer.setAttribute(
          "initialProps",
          JSON.stringify({ instance: instanceAccount })
        );
        viewer.setAttribute(
          "src",
          "widgets.treasury-factory.near/widget/components.MyForm"
        );
        document.body.appendChild(viewer);
      },
      { instanceAccount }
    );
    
    await page.waitForTimeout(2000);
  };

  test("submits form successfully", async ({ page, instanceAccount }) => {
    // Mock API endpoints
    await page.route("https://api.example.com/submit", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    // Set up component
    await setupComponent(page, instanceAccount);

    // Fill form
    await page.fill('input[name="email"]', "test@example.com");
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator(".success-message")).toBeVisible();
  });
});
```

## Troubleshooting

### Component not rendering
- Check that `redirectWeb4` is called with the correct `contractId` (instance account)
- Verify the component source path is correct and uses `widgets.treasury-factory.near`
- Ensure you've navigated to a page before creating the viewer

### RPC errors
- Make sure to mock RPC responses for methods your component uses
- Check that the response format matches what the component expects

### "Route already handled" errors
- This usually means multiple route handlers are trying to handle the same request
- Ensure your route patterns are specific enough to avoid conflicts