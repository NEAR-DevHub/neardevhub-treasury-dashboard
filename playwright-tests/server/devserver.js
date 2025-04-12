import { chromium } from "@playwright/test";
import { redirectWeb4 } from "../util/web4.js";

// Update argument parsing logic to handle `=` correctly
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith("--")) {
    const [key, ...valueParts] = arg.split("=");
    acc[key.slice(2)] = valueParts.join("=");
  }
  return acc;
}, {});

// Add a console.log to debug the parsed arguments
console.log("Parsed arguments:", args);

const contractId = args.contractId;
let treasury = args.treasury;

if (!contractId) {
  throw new Error("Missing required argument: --contractId");
}

if (!treasury) {
  const parts = contractId.split(".");
  if (parts.length > 0) {
    treasury = parts[0];
  } else {
    throw new Error("Unable to determine treasury from contractId");
  }
}

// Launch a Chromium browser
const browser = await chromium.launch({ headless: false }); // Set headless to true for headless mode

// Open a new browser context
const context = await browser.newContext();

// Open a new page
const page = await context.newPage();
await redirectWeb4({ contractId, page });
await page.goto(`https://${contractId}.page`);
