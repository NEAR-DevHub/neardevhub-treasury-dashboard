import { chromium } from "@playwright/test";
import { redirectWeb4 } from "../util/web4.js";

(async () => {
  // Launch a Chromium browser
  const browser = await chromium.launch({ headless: false }); // Set headless to true for headless mode

  // Open a new browser context
  const context = await browser.newContext();

  // Open a new page
  const page = await context.newPage();

  await redirectWeb4("https://treasury-testing.near.page", page);
  await page.goto("https://treasury-testing.near.page");
})();
