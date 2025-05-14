import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Account, parseNEAR, Worker } from "near-workspaces";
import nearApi from "near-api-js";
import { SPUTNIK_DAO_FACTORY_ID } from "../../util/sandboxrpc.js";
import { redirectWeb4 } from "../../util/web4.js";

test("deposit to intents", async ({ page }) => {
  const contractId = "treasury-testing.near";

  await redirectWeb4({ page, contractId });
  await page.goto(`https://${contractId}.page`);

  await expect(page.getByText("Near Intents")).toBeVisible();
});
