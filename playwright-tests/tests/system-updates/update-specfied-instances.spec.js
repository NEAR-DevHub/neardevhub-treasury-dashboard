import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";
import { setPageAuthSettings } from "../../util/sandboxrpc.js";
import { KeyPairEd25519 } from "near-workspaces";

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("should show system-update for targeted instance", async ({ page }) => {
  const contractId = "treasury-testing.near";
  await redirectWeb4({
    contractId,
    page,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
    return [
      {
        id: 1,
        createdDate: "2025-03-25",
        version: "n/a",
        type: "DAO contract",
        summary: "Update to latest sputnik-dao contract",
        details: "",
        instances: ["infinex.near", "treasury-testing.near"],
        votingRequired: true,
      }
  ];
  `,
    },
  });
  await page.goto(`https://${contractId}.page/?page=settings`);
  await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

  await expect(page.getByText("New system updates published")).toBeVisible();

  await page.getByRole("link", { name: "Review" }).click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible();
});

test("should not show system-update for others than targeted instances", async ({
  page,
}) => {
  const contractId = "treasury-testing.near";
  await redirectWeb4({
    contractId,
    page,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
      return [
        {
          id: 1,
          createdDate: "2025-03-25",
          version: "n/a",
          type: "DAO contract",
          summary: "Update to latest sputnik-dao contract",
          details: "",
          instances: ["infinex.near", "treasury-devdao.near"],
          votingRequired: true,
        }
    ];
    `,
    },
  });
  await page.goto(`https://${contractId}.page/?page=settings`);
  await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

  await expect(
    page.getByText("New system updates published")
  ).not.toBeVisible();

  await page.getByRole("link", { name: "System updates" }).click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).not.toBeVisible();
});

test("should show system-update if no target instances specified", async ({
  page,
}) => {
  const contractId = "treasury-testing.near";
  await redirectWeb4({
    contractId,
    page,
    modifiedWidgets: {
      "widgets.treasury-factory.near/widget/pages.settings.system-updates.UpdateRegistry": `
      return [
        {
          id: 1,
          createdDate: "2025-03-25",
          version: "n/a",
          type: "DAO contract",
          summary: "Update to latest sputnik-dao contract",
          details: "",
          votingRequired: true,
        }
    ];
    `,
    },
  });
  await page.goto(`https://${contractId}.page/?page=settings`);
  await setPageAuthSettings(page, "theori.near", KeyPairEd25519.fromRandom());

  await expect(page.getByText("New system updates published")).toBeVisible();

  await page.getByRole("link", { name: "Review" }).click();
  await expect(
    page.getByText("Update to latest sputnik-dao contract")
  ).toBeVisible();
});
