import { chromium } from "@playwright/test";
import { redirectWeb4 } from "../util/web4.js";

// Launch a Chromium browser
const browser = await chromium.launch({ headless: false }); // Set headless to true for headless mode

// Open a new browser context
const context = await browser.newContext();

// Open a new page
const page = await context.newPage();

const contractId = process.argv[process.argv.length - 1];
await redirectWeb4({ contractId, page });
await page.goto(`https://${contractId}.page`);
