# NEAR DevHub trustees dashboard BOS components

This is the repository of the BOS components for the NEAR DevHub trustees dashboard.

# Contributing

Please refer to [NEAR DevHub](https://github.com/NEAR-DevHub/neardevhub-bos/blob/main/CONTRIBUTING.md) for general contribution guidelines. Details specific for this repository will be added later.

## Development Guidelines

### VM Widget Loading Pattern

When using VM widgets in your components, always include the `loading=""` prop to ensure your own loading states are shown instead of the default spinner. This provides better user experience and consistent loading behavior across the application.

**Example:**

```jsx
<Widget
  loading=""
  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Votes`}
  props={{
    votes: proposalData?.votes,
  }}
/>
```

**Why this matters:**

- Prevents the default VM spinner from appearing
- Provides better control over the loading experience
- Ensures consistency across all VM widget usage in the application

## Running tests

This project has many [playwright-tests](./playwright-tests/), which covers most of the functionality.

Some of the tests depend on the NEAR sandbox. The NEAR sandbox is a local blockchain for testing, and allows simulating the interaction with smart contracts.

To build the sandbox type the following:

`npm run build:sandbox`

Then you can run the tests using `npm run test` or `npm run test:watch:codespaces`. You can also add flags such as `--ui` for UI mode, or inspect the test configuration in [playwright.config.js](./playwright.config.js).

## Creating test videos

Creating videos of your automated tests is a great way of showcasing the changes in your contribution. Video recording of your test can be enabled in the [playwright.config.js](./playwright.config.js) under the `use` section where there is the `video` property that you should set to `on` ( Remember to NOT commit it with the `on` setting, as we don't want to waste github action resources on recording videos).

It might also be smart to add a pause in the end of your test, just to ensure that the last frame is also showing, by adding the following line:

```javascript
await page.waitForTimeout(500);
```

After running the test with video recording on, you should convert it to mp4. This can be easitly done using a command like this:

```bash
ffmpeg -i test-results/stake-delegation-stake-delegation-admin-connected-Should-create-stake-delegation-request-treasury-testing/video.webm stakedelegation.mp4
```

(replace with the paths of the video of the actual test you want to show).

The resulting mp4 file can be directly dragged into the Pull Request description.

## Playwright Video Merger Script

The `playwright-video-merger.sh` script is used to process and combine Playwright test videos into a single, presentation-ready video file. It is especially useful for creating demo or showcase videos from your automated test runs.

### What the Script Does

- **Finds all Playwright test videos** (`video.webm`) in the `test-results/` directory.
- **Overlays the test title** (from `test-title.txt` if available, or the folder name as a fallback) as a subtitle at the bottom of each video.
- **Converts each video to mp4** format for compatibility and better compression.
- **Appends a 1-second freeze frame** (last frame of the test video) to the end of each video segment, making transitions clearer.
- **Concatenates all processed videos** (with freeze frames) into a single output file: `final_output.mp4`.

### How to Use

1. **Run your Playwright tests** with video recording enabled. The test videos will be saved in the `test-results/` directory.
2. **Ensure test titles are saved**: The test suite should write the test title to a `test-title.txt` file in each test's video folder (this is handled by the provided `afterEach` hook in your tests).
3. **Run the script:**
   ```bash
   ./playwright-video-merger.sh
   ```
4. **Find your merged video:** The final output will be saved as `final_output.mp4` in the root of your workspace.

### Notes

- The script also creates intermediate processed videos in the `processed_videos/` directory and freeze frames in the `freeze_frames/` directory.
- If `test-title.txt` is missing, the script will use the folder name as the overlay text.
- You can adjust the text wrapping and overlay style by editing the script variables.

This workflow is ideal for creating clear, annotated demo videos from your Playwright test runs, making it easy to share test results or showcase features.

## Running a Development Server using PlayWright hosted web4 gateway

The development server provides a local testing environment that simulates the NEAR BOS (Blockchain Operating System) environment using Playwright. This allows developers to test the treasury dashboard with real wallet connections and NEAR protocol interactions without deploying to mainnet.

### Purpose

The devserver:

- Hosts the treasury dashboard locally using Playwright's browser automation
- Redirects Web4 requests to use the mainnet RPC (fastnear.com) for blockchain data
- Preserves authentication state across development sessions
- Enables testing with real wallet connections (Ledger, NEAR Wallet, etc.)
- Provides a faster development cycle compared to deploying to NEAR BOS

To start the development server, use the following command:

```bash
npm run dev -- --contractId=treasury-testing.near --treasury=testing-astradao.sputnik-dao.near --storageStateFile=devstoragestate.json
```

This will open a browser window at `https://treasury-testing.near.page` where you can interact with the treasury dashboard connected to the `testing-astradao.sputnik-dao.near` DAO.

### Parameters

- `--contractId` (required): Specifies the NEAR account/contract ID that hosts the treasury dashboard component. This determines the URL where the dashboard will be accessed (`https://<contractId>.near.page`). For example, `treasury-testing.near` will open `https://treasury-testing.near.page`.
- `--treasury` (optional): Specify which treasury DAO to connect to. Defaults to `<contractId>.sputnik-dao.near`. Note that some contracts may require a different treasury - for example, `treasury-testing.near` connects to `testing-astradao.sputnik-dao.near`.
- `--storageStateFile` (optional): Path to a Playwright storage state file containing browser state (cookies, localStorage). This preserves wallet connections and authentication between development sessions.

### Storage State File (`devstoragestate.json`)

The storage state file preserves browser state between development sessions, including wallet connections and user authentication. This eliminates the need to reconnect your wallet every time you restart the development server.

#### File Structure

The storage state file contains the following properties:

- **`cookies`**: Array of HTTP cookies. Usually empty for NEAR apps as authentication is handled through localStorage.
- **`origins`**: Array of origin configurations, each containing:
  - **`origin`**: The URL origin (e.g., `https://treasury-testing.near.page`)
  - **`localStorage`**: Array of localStorage items for that origin
- **`sessionStorage`**: Array of sessionStorage data. Typically empty as NEAR wallet data persists in localStorage.

#### localStorage Properties for NEAR Applications

The localStorage array contains key-value pairs for NEAR wallet integration:

- **`near-social-vm:v01::accountId:`**: The currently logged-in NEAR account (e.g., `"example-user.near"`)
- **`near-wallet-selector:contract`**: Contract configuration for the wallet selector
- **`near-wallet-selector:ledger:accounts`**: Ledger hardware wallet account details including derivation path and public key
- **`near-wallet-selector:recentlySignedInWallets`**: Array of recently used wallet types (e.g., `["ledger"]`)
- **`near-wallet-selector:rememberRecentWallets`**: Whether to remember wallet selection (`"enabled"` or `"disabled"`)
- **`near-wallet-selector:selectedWalletId`**: The currently selected wallet type (e.g., `"ledger"`, `"near-wallet"`, `"meteor-wallet"`)

### Example `devstoragestate.json`

Here is an example of a `devstoragestate.json` file that reflects the data needed for a user to appear logged in:

```json
{
  "cookies": [],
  "origins": [
    {
      "origin": "https://treasury-testing.near.page",
      "localStorage": [
        {
          "name": "near-social-vm:v01::accountId:",
          "value": "\"example-user.near\""
        },
        {
          "name": "near-wallet-selector:contract",
          "value": "{\"contractId\":\"social.near\",\"methodNames\":[]}"
        },
        {
          "name": "near-wallet-selector:ledger:accounts",
          "value": "[{\"accountId\":\"example-user.near\",\"derivationPath\":\"44'/397'/0'/0'/1'\",\"publicKey\":\"Ed25519PublicKeyBase58EncodedString\"}]"
        },
        {
          "name": "near-wallet-selector:recentlySignedInWallets",
          "value": "[\"ledger\"]"
        },
        {
          "name": "near-wallet-selector:rememberRecentWallets",
          "value": "\"enabled\""
        },
        {
          "name": "near-wallet-selector:selectedWalletId",
          "value": "\"ledger\""
        }
      ]
    }
  ],
  "sessionStorage": []
}
```

This file contains `localStorage` entries for user account information and wallet settings, ensuring the user appears logged in when applied. Note that the example here shows how to connect a ledger device, which then ensures that your private credentials are not stored in the browser.

# Web4 gateway

In the [web4](./web4) folder there is a setup for a web4 gateway. The [treasury-web4/src/web4](./web4/treasury-web4/src/web4/) contains the gateway static index.html file that is served on the web4 page, and there is also the [treasury-web4](./web4/treasury-web4/) that contains the web4 contract that is written in Rust.

## Local development

### Recommended approach: Test driven

You can set up a minimal Playwright test file and use the `redirectWeb4` function to capture the navigation to the web4 page.

```javascript
import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4 } from "../../util/web4.js";

test("check if instance web4 contract is up to date", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
  });
  await page.goto(`https://${instanceAccount}.page`);

  // Stop your debugger here, and you then reload the page
  await page.waitForTimeout(2000);
});
```

Start your test using this command

```bash
npx playwright test --project=treasury-testing --debug playwright-tests/tests/some-tests-folder/your-playwrigt-test.spec.js
```

Step through the debugger until the page is loaded, and then you can have normal development and reload page iterations.

### Service Workers and Testing

Many treasury instances deploy service workers for caching and performance optimization. However, service workers can interfere with Playwright tests by:

1. **Intercepting requests** that test utilities expect to handle (e.g., mocked balance requests)
2. **Caching responses** that prevent tests from seeing modified widgets or updated data
3. **Taking over page routes** that the test framework uses for mocking

#### How `redirectWeb4` Handles Service Workers

The `redirectWeb4` function provides a `disableServiceWorker` parameter (default: `true`) to manage service worker behavior:

```javascript
await redirectWeb4({
  page,
  contractId: instanceAccount,
  modifiedWidgets: {
    "account/widget/app": "return <div>Test Widget</div>;",
  },
  disableServiceWorker: true, // Default - prevents service worker registration
});
```

When `disableServiceWorker` is `true` (default):

- Service worker registration is prevented by removing "service-worker.js" references from HTML
- Tests can use page routes for mocking without interference
- This is the recommended setting for most tests

When `disableServiceWorker` is `false`:

- Service workers run normally
- `redirectWeb4` intercepts both page AND service worker requests via context routes
- Useful for testing service worker behavior specifically

#### Example: Testing with Service Workers Enabled

See `playwright-tests/tests/web4/service-worker-interference.spec.js` for a complete example that:

- Demonstrates how service workers interfere with test routes
- Shows how to test with service workers enabled while still using modified widgets
- Illustrates the difference between `disableServiceWorker: true` (default) and `disableServiceWorker: false`

#### Best Practices

1. **Keep default behavior** (`disableServiceWorker: true`) for most tests to avoid interference
2. **Only enable service workers** when specifically testing service worker functionality
3. **Be aware** that enabling service workers may interfere with other page routes used for mocking (e.g., balance mocks)
4. **Use context.route()** if you need custom routes to work with service workers enabled

### Legacy BOS workspace setup

You can also locally develop the html page served by the web4 gateway. To run a local gateway, type the following:

```bash
npm run gateway:treasury
```

This will create a temporary folder for the static html file, and patch the [web4/treasury-web4/src/web4/index.html](./web4/treasury-web4/src/web4/index.html) file with an RPC setting pointing to the local api proxy. If you want to see changes to the html you have to restart the gateway.
