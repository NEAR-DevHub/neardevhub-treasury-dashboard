import { chromium } from "@playwright/test";
import { redirectWeb4 } from "../util/web4.js";
import fs from "fs";

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

// Add support for an optional playwright storage state file
const storageStateFile = args.storageStateFile;

// Parse the storage state file if provided, otherwise set storageState to undefined
const storageState = storageStateFile
  ? JSON.parse(await fs.promises.readFile(storageStateFile, "utf-8"))
  : undefined;

const context = await browser.newContext({ storageState });
const page = await context.newPage();
await redirectWeb4({ contractId, page });
await page.goto(`https://${contractId}.page`);
