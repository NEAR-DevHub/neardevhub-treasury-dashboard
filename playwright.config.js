// @ts-check
import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
process.env.NEAR_CLI_MAINNET_RPC_SERVER_URL =
  "https://archival-rpc.mainnet.fastnear.com";
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./playwright-tests/tests",
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 7000,
  } /* Run tests in files in parallel */,
  fullyParallel: true /* Fail the build on CI if you accidentally left test.only in the source code. */,
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 4 : 0,
  /* Run tests in parallel for speed */
  workers: process.env.CI ? 6 : undefined, // 6 workers in CI, auto-detect locally
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "line",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    headless: true,
    video: {
      mode: process.env.CI ? "on-first-retry" : "on",
      size: { width: 1280, height: 800 },
    },
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:8080",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? "on-first-retry" : "on",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "treasury-dashboard",
      use: {
        ...devices["Desktop Chrome"],
        instanceAccount: "treasury-devdao.near",
        daoAccount: "devdao.sputnik-dao.near",
      },
      testIgnore: [
        "**/settings/feed-filters.spec.js",
        "**/payments/filters.spec.js",
        "**/stake-delegation/stake-delegation-filters.spec.js",
      ],
    },
    {
      name: "infinex",
      use: {
        ...devices["Desktop Chrome"],
        instanceAccount: "treasury-infinex.near",
        daoAccount: "infinex.sputnik-dao.near",
        lockupContract: "77fa9d86aca49e758a4cb72628972a0f3135d168.lockup.near",
      },
      testIgnore: [
        "**/settings/feed-filters.spec.js",
        "**/payments/filters.spec.js",
        "**/stake-delegation/stake-delegation-filters.spec.js",
      ],
    },
    {
      name: "treasury-testing",
      use: {
        ...devices["Desktop Chrome"],
        instanceAccount: "treasury-testing.near",
        daoAccount: "testing-astradao.sputnik-dao.near",
      },
      testMatch: [
        "**/settings/feed-filters.spec.js",
        "**/payments/filters.spec.js",
        "**/stake-delegation/stake-delegation-filters.spec.js",
        "**/dashboard/intents-historical-graph.spec.js",
      ],
    },
    /*{
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },*/

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { channel: 'chrome' },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  //outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: "npm run rpcproxy",
      port: 14500,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run gateway",
      port: 8080,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
