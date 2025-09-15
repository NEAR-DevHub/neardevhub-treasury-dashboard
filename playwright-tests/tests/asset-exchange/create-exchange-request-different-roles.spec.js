import { expect } from "@playwright/test";
import { cacheCDN, test } from "../../util/test.js";
import { updateDaoPolicyMembers } from "../../util/rpcmock";

test.describe.parallel("User logged in with different roles", () => {
  const roles = [
    {
      name: "Vote role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-vote-role.json",
      canCreateRequest: false,
    },
    {
      name: "Settings role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-settings-role.json",
      canCreateRequest: false,
    },
    {
      name: "All role",
      storageState:
        "playwright-tests/storage-states/wallet-connected-admin-with-all-role.json",
      canCreateRequest: true,
    },
  ];

  for (const { name, storageState, canCreateRequest } of roles) {
    test.describe(`User with '${name}'`, () => {
      test.use({ storageState });

      test(`should ${
        canCreateRequest ? "see" : "not see"
      } 'Create Request' action`, async ({ page, instanceAccount }) => {
        await cacheCDN(page);
        test.setTimeout(60_000);

        await updateDaoPolicyMembers({
          instanceAccount,
          page,
          hasAllRole: canCreateRequest,
        });

        await page.goto(`/${instanceAccount}/widget/app?page=asset-exchange`);
        await expect(page.getByText("Pending Requests")).toBeVisible({
          timeout: 20_000,
        });

        const createRequestButton = page.getByRole("button", {
          name: "Create Request",
        });

        if (canCreateRequest) {
          await expect(createRequestButton).toBeVisible();
        } else {
          await expect(createRequestButton).toBeHidden();
        }
      });
    });
  }
});
