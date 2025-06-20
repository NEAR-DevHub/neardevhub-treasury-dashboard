import { test } from "../../util/test.js";
import { expect } from "@playwright/test";
import { redirectWeb4, getLocalWidgetContent } from "../../util/web4.js";

test("", async ({ page }) => {
  const instanceAccount = "webassemblymusic-treasury.near";
  const daoAccount = "webassemblymusic-treasury.sputnik-dao.near";
  const modifiedWidgets = {};
  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    networkId: "mainnet",
    modifiedWidgets,
    callWidgetNodeURLForContractWidgets: false,
  });
  await page.goto(
    "https://webassemblymusic-treasury.near.page/?page=payments&tab=history&id=2"
  );
  await expect(page.getByText("Recipient @")).toContainText(
    "0xa029Ca6D14b97749889702eE16E7d168a1094aFE"
  );
  await expect(
    page.locator(
      'div[data-component="widgets.treasury-factory.near/widget/components.TokenAmountAndIcon"]'
    )
  ).toContainText("0.01 ETH");
});
