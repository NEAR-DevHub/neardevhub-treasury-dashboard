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

### New Approach: Using modifiedWidgets

The recommended approach for testing individual components is to use the `modifiedWidgets` parameter of `redirectWeb4`. This approach avoids nested viewer structures and prevents element overlap issues.

#### Simple Component Wrapper

For most tests, a simple wrapper is sufficient:

```javascript
test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
  // Create a simple app widget that only renders the specific component
  const appWidgetContent = `
    return (
      <div style={{ padding: "10px" }}>
        <Widget
          src="widgets.treasury-factory.near/widget/pages.asset-exchange.OneClickExchangeForm"
          props={{ instance: "${instanceAccount}" }}
        />
      </div>
    );
  `;
  
  // Set up redirectWeb4 with the modified app widget
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    modifiedWidgets: {
      [`${instanceAccount}/widget/app`]: appWidgetContent
    },
    callWidgetNodeURLForContractWidgets: false  // Important: Use our modified widget
  });

  // Navigate to the instance page - this will now load only your component
  await page.goto(`https://${instanceAccount}.page/`);
  
  // Simple helper to wait for component to be ready
  const setupComponent = async (page) => {
    await page.waitForSelector('.one-click-exchange-form', { state: 'visible' });
    await page.waitForTimeout(500); // Small delay for animations
  };
});
```

**Advantages of this approach:**
- Avoids nested viewer structures that can cause element overlap issues
- Works seamlessly with the existing navigation and routing
- Allows you to wrap components with custom styling (like padding)
- Prevents interference from the main app UI
- More reliable for interaction tests (clicking, typing, etc.)

#### When to Use AppLayout

Use the AppLayout wrapper approach (shown in the Theme Testing section) when:
- Testing components that depend on theme CSS variables
- Testing dark theme rendering
- Testing components that expect global styles from the parent app
- Components use `var(--theme-color)`, `var(--bg-page-color)`, etc.

For simple functional testing, the basic wrapper approach is usually sufficient.

### Legacy Approach: Creating a New Viewer

The older approach of creating a new viewer element is still supported but may cause issues with overlapping elements:

```javascript
const setupComponent = async (page, instanceAccount, theme = "light") => {
  await page.evaluate(
    ({ instanceAccount, theme }) => {
      // Clear any existing viewers
      document.querySelectorAll("near-social-viewer").forEach((el) => el.remove());
      
      const viewer = document.createElement("near-social-viewer");
      viewer.setAttribute(
        "initialProps",
        JSON.stringify({
          instance: instanceAccount,
        })
      );
      viewer.setAttribute(
        "src",
        "widgets.treasury-factory.near/widget/pages.asset-exchange.OneClickExchangeForm"
      );
      document.body.appendChild(viewer);
    },
    { instanceAccount, theme }
  );

  await page.waitForTimeout(2000);
};
```

## Using redirectWeb4

`redirectWeb4` sets up request interception to load widgets from your local filesystem instead of from the blockchain. Here's the complete API:

```javascript
await redirectWeb4({
  page,                    // The Playwright page object
  contractId: instanceAccount,  // The instance account (NOT the widget account)
  treasury: daoAccount,    // The associated DAO account
  modifiedWidgets: {       // Optional: Override specific widgets
    [`${instanceAccount}/widget/app`]: 'widget content',
    'widgets.treasury-factory.near/widget/path': 'widget content'
  },
  callWidgetNodeURLForContractWidgets: true  // Whether to fetch contract widgets from RPC (default: true)
                                             // Set to false when providing modified contract widgets
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

## Testing Themes

The treasury dashboard supports light and dark themes that are configured per instance. To ensure consistent test results, use the theme mocking utilities:

### Using AppLayout for Theme Support

When testing components that need proper theme application (especially for dark theme testing), you should wrap your component in the AppLayout widget. This ensures that all theme CSS variables and styles are properly applied:

```javascript
test("renders in dark theme", async ({ page, instanceAccount, daoAccount }) => {
  // Create an app widget that uses AppLayout to handle theme
  const appWidgetContent = `
    const { AppLayout } = VM.require(
      "widgets.treasury-factory.near/widget/components.templates.AppLayout"
    ) || { AppLayout: () => <></> };
    
    const instance = "${instanceAccount}";
    const treasuryDaoID = "${daoAccount}";
    
    function Page() {
      return (
        <div style={{ padding: "10px" }}>
          <Widget
            src="widgets.treasury-factory.near/widget/pages.my-component"
            props={{ instance: instance }}
          />
        </div>
      );
    }
    
    return (
      <AppLayout
        page="my-page"
        instance={instance}
        treasuryDaoID={treasuryDaoID}
        accountId={context.accountId}
      >
        <Page />
      </AppLayout>
    );
  `;
  
  // Set up redirectWeb4 with the modified app widget
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    modifiedWidgets: {
      [`${instanceAccount}/widget/app`]: appWidgetContent
    },
    callWidgetNodeURLForContractWidgets: false
  });
  
  // Mock the dark theme
  await mockTheme(page, "dark");
  
  // Navigate to the page
  await page.goto(`https://${instanceAccount}.page/`);
  
  // Your test assertions here
});
```

**Important:** AppLayout requires these props:
- `page`: The page identifier
- `instance`: The instance account
- `treasuryDaoID`: The DAO treasury account
- `accountId`: The current user account (from context)

### Basic Theme Testing

```javascript
import { mockTheme, unmockTheme, getThemeColors, THEME_COLORS } from "../../util/theme.js";

test.describe("Component Theme Tests", () => {
  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    // Set up redirectWeb4 first
    await redirectWeb4({ page, contractId: instanceAccount, treasury: daoAccount });
    
    // IMPORTANT: Mock theme AFTER redirectWeb4 but BEFORE navigation
    // This ensures the theme mock can override the RPC routes set by redirectWeb4
    await mockTheme(page, "light");
    
    await page.goto(`https://${instanceAccount}.page/`);
  });

  test("renders in light theme", async ({ page }) => {
    // Your component setup
    
    // Verify theme colors
    const colors = await getThemeColors(page, ".my-component");
    expect(colors.bgPageColor).toBe(THEME_COLORS.light.bgPageColor);
    expect(colors.textColor).toBe(THEME_COLORS.light.textColor);
  });

  // For dark theme tests, create a nested describe block
  test.describe("Dark Theme", () => {
    test.beforeEach(async ({ page }) => {
      // Override the theme mock
      await unmockTheme(page);
      await mockTheme(page, "dark");
    });

    test("renders in dark theme", async ({ page }) => {
      // Your component setup
      
      const colors = await getThemeColors(page, ".my-component");
      expect(colors.bgPageColor).toBe(THEME_COLORS.dark.bgPageColor);
      expect(colors.textColor).toBe(THEME_COLORS.dark.textColor);
    });
  });
});
```

### Theme Utility Functions

- `mockTheme(page, theme, primaryColor)` - Mocks the theme configuration
- `unmockTheme(page)` - Removes theme mocking routes
- `getThemeColors(page, selector)` - Gets computed theme colors for an element
- `THEME_COLORS` - Expected color values for light and dark themes

## Best Practices

1. **Use modifiedWidgets for component isolation**: This is the recommended approach for testing individual components
2. **Always use redirectWeb4 in beforeEach**: This ensures widgets are loaded from your local filesystem
3. **Set callWidgetNodeURLForContractWidgets to false**: When using modifiedWidgets to override the app widget
4. **Navigate to the instance page**: Use `https://${instanceAccount}.page/` as your base URL
5. **Mock external dependencies**: Mock API and RPC calls to make tests reliable
6. **Use appropriate timeouts**: Components may take time to load, use `waitForTimeout` or `waitForSelector`
7. **Test multiple themes**: Use the theme utilities to test both light and dark modes consistently
8. **Mock themes after redirectWeb4**: Always call `mockTheme` AFTER `redirectWeb4` but before navigation to ensure the mock can override RPC routes
9. **Add padding to isolated components**: Wrap components in a div with padding for better visual testing
10. **Use AppLayout for theme-dependent tests**: When testing components that rely on theme CSS variables, wrap them in AppLayout to ensure proper theme application

## Example: Complete Component Test

Here's a complete example testing a form component using the recommended approach:

```javascript
import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { mockTheme } from "../../util/theme.js";

test.describe("FormComponent", () => {
  test.beforeEach(async ({ page, instanceAccount, daoAccount }) => {
    // Create app widget that only renders our form component
    const appWidgetContent = `
      return (
        <div style={{ padding: "20px" }}>
          <Widget
            src="widgets.treasury-factory.near/widget/components.MyForm"
            props={{ instance: "${instanceAccount}" }}
          />
        </div>
      );
    `;
    
    // Set up redirectWeb4 with modified app widget
    await redirectWeb4({
      page,
      contractId: instanceAccount,
      treasury: daoAccount,
      modifiedWidgets: {
        [`${instanceAccount}/widget/app`]: appWidgetContent
      },
      callWidgetNodeURLForContractWidgets: false
    });
    
    // Mock theme if needed
    await mockTheme(page, "light");
    
    // Navigate to the page
    await page.goto(`https://${instanceAccount}.page/`);
    
    // Wait for component to be ready
    await page.waitForSelector('.my-form', { state: 'visible' });
  });

  test("submits form successfully", async ({ page, instanceAccount }) => {
    // Mock API endpoints
    await page.route("https://api.example.com/submit", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    // Fill form
    await page.fill('input[name="email"]', "test@example.com");
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator(".success-message")).toBeVisible();
  });
  
  test("shows validation errors", async ({ page }) => {
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation message
    await expect(page.locator('.error-message')).toContainText('Email is required');
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