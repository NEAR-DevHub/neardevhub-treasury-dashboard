import fs from "fs";
import path, { dirname } from "path";

/**
 * Redirect Web4 requests to the specified contract
 * @param {string} contractId - The contract ID to redirect requests to
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function redirectWeb4(contractId, page) {
  const original_rpc_url = "https://rpc.mainnet.near.org";
  await page.route(original_rpc_url, async (route, request) => {
    const postData = request.postDataJSON();
    if (postData.params.account_id === "social.near") {
      const args = JSON.parse(atob(postData.params.args_base64));
      const keys = args.keys;

      if ((keys && keys[0].startsWith(contractId)) || keys === undefined) {
        const response = await route.fetch({
          url: this.rpc_url,
          json: postData,
        });
        await route.fulfill({ response });
      } else {
        const instancesFolder = path.resolve(dirname("."), "instances"); // Adjust the path if necessary
        const fileContents = {};

        for (const key of keys) {
          // Replace dots with path separators only after "widget"
          const [prefix, ...rest] = key.split("/widget/");
          const normalizedKey = path.join(
            prefix,
            "widget",
            rest.join("/").replace(/\./g, "/")
          );
          const [account, section, contentKey] = key.split("/");
          if (fileContents[account] === undefined) {
            fileContents[account] = {};
          }
          if (fileContents[account][section] === undefined) {
            fileContents[account][section] = {};
          }
          const filePath = path.join(instancesFolder, normalizedKey) + ".jsx";
          if (fs.existsSync(filePath)) {
            const content = fs
              .readFileSync(filePath, "utf-8")
              .replaceAll(
                "${REPL_BACKEND_API}",
                "https://ref-sdk-api-2.fly.dev/api"
              )
              .replaceAll(
                "${REPL_TREASURY}",
                "testing-astradao.sputnik-dao.near"
              )
              .replaceAll("${REPL_INSTANCE}", account)
              .replaceAll(
                "${REPL_BASE_DEPLOYMENT_ACCOUNT}",
                "widgets.treasury-factory.near"
              )
              .replaceAll("${REPL_DEVHUB}", "devhub.near")
              .replaceAll("${REPL_RPC_URL}", original_rpc_url);

            fileContents[account][section][contentKey] = content;
          } else {
            console.warn(
              `File not found for key: ${key} ${filePath}, going to live RPC`
            );
            await route.fallback();
            return;
          }
        }

        const json = {
          jsonrpc: "2.0",
          id: "dontcare",
          result: {},
        };

        json["result"] = {
          result: Array.from(
            new TextEncoder().encode(JSON.stringify(fileContents))
          ),
        };
        await route.fulfill({ json });
      }
    } else {
      const response = await route.fetch({
        url: original_rpc_url,
        json: postData,
      });
      await route.fulfill({ response });
    }
  });

  await page.route(`https://${contractId}.page/**`, async (route, request) => {
    const path = request.url().substring(`https://${contractId}.page`.length);
    let viewResult = await this.account.viewFunction({
      contractId,
      methodName: "web4_get",
      args: {
        request: {
          path,
        },
      },
    });

    if (viewResult.preloadUrls) {
      const preloads = {};
      for (let preloadUrl of viewResult.preloadUrls) {
        const keys = JSON.parse(
          decodeURIComponent(preloadUrl.split("?keys.json=")[1])
        );
        const preloadBody = await this.account.viewFunction({
          contractId: "social.near",
          methodName: "get",
          args: {
            keys,
          },
        });
        preloads[preloadUrl] = {
          contentType: "application/json",
          body: btoa(JSON.stringify(preloadBody)),
        };
      }

      viewResult = await this.account.viewFunction({
        contractId,
        methodName: "web4_get",
        args: {
          request: {
            path,
            preloads,
          },
        },
      });
    }

    await route.fulfill({
      contentType: viewResult.contentType,
      body: atob(viewResult.body),
    });
  });
}
