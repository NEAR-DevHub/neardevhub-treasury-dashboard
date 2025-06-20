import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import {
  compareInstanceWeb4WithTreasuryFactory,
  redirectWeb4,
} from "../../util/web4.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import nearApi from "near-api-js";
import { callContractReadOnly } from "../../util/near.js";

test("web4 contract update", async ({ page, instanceAccount, daoAccount }) => {
  const isInstanceWeb4UptoDate = await compareInstanceWeb4WithTreasuryFactory(
    instanceAccount
  );
  if (isInstanceWeb4UptoDate) {
    console.log(
      `Instance ${instanceAccount} web4 contract is up to date. Skipping test`
    );
    return;
  }
  const policy = JSON.parse(
    (
      await callContractReadOnly({
        contractId: daoAccount,
        methodName: "get_policy",
      })
    ).toString()
  );
  console.log("roles", policy.roles);
  const daoAdminAccount = policy.roles.find((role) =>
    role.permissions.includes("config:*")
  ).kind.Group[0];
  console.log(daoAdminAccount);
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
  });
  await page.goto(`https://${instanceAccount}.page`);

  await setPageAuthSettings(
    page,
    daoAdminAccount,
    nearApi.utils.KeyPairEd25519.fromRandom()
  );
  await expect(page.getByRole("link", { name: "Review" })).toBeVisible();
  await page.getByRole("link", { name: "Review" }).click();
  await expect(
    page.getByRole("cell", { name: "Web4 Contract" }).first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Review" }).first().click();
  await expect(
    page.getByRole("heading", { name: " System Update: Web4 Contract" })
  ).toBeVisible();
  await page.waitForTimeout(500);
});
