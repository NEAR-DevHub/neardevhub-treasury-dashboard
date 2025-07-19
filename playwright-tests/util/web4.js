import { connect, keyStores } from "near-api-js";
import fs from "fs";
import path, { dirname } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { MOCK_RPC_URL } from "./rpcmock.js";

const instancesFolder = path.resolve(dirname("."), "instances"); // Adjust the path if necessary
const replacements = JSON.parse(
  fs
    .readFileSync(
      new URL(
        "../../instances/widgets.treasury-factory.near/aliases.mainnet.json",
        import.meta.url
      )
    )
    .toString()
);

export function getLocalFilePathForKey(key) {
  const [prefix, ...rest] = key.split("/widget/");
  const normalizedKey = path.join(
    prefix,
    "widget",
    rest.join("/").replace(/\./g, "/")
  );
  const filePath = path.join(instancesFolder, normalizedKey) + ".jsx";
  if (fs.existsSync(filePath)) {
    return filePath;
  } else {
    return null;
  }
}

export function getLocalWidgetContent(key, context = {}) {
  const { treasury, account, nodeUrl } = context;
  const filePath = getLocalFilePathForKey(key);
  if (!filePath) {
    return null;
  }

  const content = fs
    .readFileSync(filePath, "utf-8")
    .replaceAll("${REPL_BACKEND_API}", "https://ref-sdk-api-2.fly.dev/api")
    .replaceAll("${REPL_BOOTSTRAP_ACCOUNT}", "bootstrap.treasury-factory.near")
    .replaceAll("${REPL_TREASURY}", treasury)
    .replaceAll("${REPL_INSTANCE}", account)
    .replaceAll("${REPL_NEARBLOCKS_KEY}", replacements["REPL_NEARBLOCKS_KEY"])
    .replaceAll(
      "${REPL_BASE_DEPLOYMENT_ACCOUNT}",
      "widgets.treasury-factory.near"
    )
    .replaceAll("${REPL_DEVHUB}", "devhub.near")
    .replaceAll("${REPL_WRAP_NEAR_ICON}", replacements["REPL_WRAP_NEAR_ICON"])
    .replaceAll("${REPL_RPC_URL}", nodeUrl);
  return content;
}
/**
 * Redirect Web4 requests to the specified contract and handle routing logic.
 *
 * @param {Object} options - The options object.
 * @param {string} options.contractId - The contract ID to redirect requests to.
 * @param {import('@playwright/test').Page} options.page - Playwright page object.
 * @param {string} [options.treasury] - The treasury account ID. If not provided, it will be derived from the contract ID.
 * @param {string} [options.networkId="mainnet"] - The NEAR network ID (default is "mainnet").
 * @param {string} [options.widgetNodeUrl="https://rpc.mainnet.fastnear.com"] - NEAR RPC node URL to get widget content from ( defaults to mainnet ). Specify sandbox URL if you want to fetch from sandbox.
 * @param {string} [options.sandboxNodeUrl] - Fallback RPC requests will be sent to the sandbox if specified, otherwise to the hardcoded mainnet URLs
 * @param {Object} [options.modifiedWidgets={}] - An object containing modified widget content.
 *     The keys are widget keys (e.g., "account/section/contentKey"), and the values are the modified widget content as strings.
 * @param {boolean} [options.callWidgetNodeURLForContractWidgets=true] - call the provided `widgetNodeUrl` when requesting social db contents under the provided `contractId`
 *     Set to false if you want to provide the modifiedWidgets object also for the contract widgets, otherwise the default is to request these widgets from `widgetNode`
 *
 * @returns {Promise<void>} A promise that resolves when the routing setup is complete.
 */
export async function redirectWeb4({
  contractId,
  page,
  treasury,
  networkId = "mainnet",
  widgetNodeUrl = "https://rpc.mainnet.fastnear.com",
  sandboxNodeUrl,
  modifiedWidgets = {},
  callWidgetNodeURLForContractWidgets = true,
}) {
  const keyStore = new keyStores.InMemoryKeyStore();

  if (!treasury) {
    treasury = contractId.split(".")[0] + ".sputnik-dao.near";
  }
  const redirectNodeUrl = sandboxNodeUrl ?? MOCK_RPC_URL;

  const near = await connect({
    networkId,
    nodeUrl: redirectNodeUrl,
    keyStore,
  });

  const contractAccount = await near.account(contractId);

  // Define the route handler function to reuse for multiple URLs
  const handleRpcRoute = async (route, request) => {
    const postData = request.postDataJSON();
    if (postData.params.account_id === "social.near") {
      const args = JSON.parse(atob(postData.params.args_base64));
      const keys = args.keys;

      if (
        (callWidgetNodeURLForContractWidgets &&
          keys &&
          keys[0].startsWith(contractId)) ||
        keys === undefined
      ) {
        const response = await route.fetch({
          url: widgetNodeUrl,
          json: postData,
        });
        await route.fulfill({ response });
      } else {
        let fileContents = {};

        for (const key of keys) {
          const [account, section, contentKey] = key.split("/");
          if (fileContents[account] === undefined) {
            fileContents[account] = {};
          }
          if (fileContents[account][section] === undefined) {
            fileContents[account][section] = {};
          }

          if (modifiedWidgets[key]) {
            fileContents[account][section][contentKey] = modifiedWidgets[key];
          } else {
            const content = getLocalWidgetContent(key, {
              treasury,
              account,
              nodeUrl: "https://rpc.mainnet.fastnear.com", // Hardcoded for widget content replacement
            });

            if (content) {
              fileContents[account][section][contentKey] = content;
            } else {
              // Fetch from live RPC, store to temp folder, and use next time
              const tempDir = path.join(tmpdir(), "live-widget-cache");
              await mkdir(tempDir, { recursive: true });
              const cacheFile = path.join(
                tempDir,
                encodeURIComponent(key) + ".json"
              );
              let liveContent;
              try {
                // Try to read from cache first
                liveContent = await readFile(cacheFile, "utf-8");
              } catch {
                try {
                  // Not cached, fetch from live RPC
                  const liveRpcResponse = await route.fetch();
                  const liveRpcJson = await liveRpcResponse.json();
                  const resultArr = liveRpcJson.result?.result || [];
                  liveContent = Buffer.from(resultArr).toString("utf-8");
                  await writeFile(cacheFile, liveContent, "utf-8");
                } catch (e) {
                  console.log("should not happen", e);
                }
              }
              fileContents = JSON.parse(liveContent);
            }
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
        url: redirectNodeUrl,
        json: postData,
      });
      await route.fulfill({ response });
    }
  };

  // Apply the route handler to both mainnet RPC URLs
  await page.route("https://rpc.mainnet.near.org", handleRpcRoute);
  await page.route("https://rpc.mainnet.fastnear.com", handleRpcRoute);

  await page.route(`https://${contractId}.page/**`, async (route, request) => {
    const path = request.url().substring(`https://${contractId}.page`.length);

    let viewResult = await contractAccount.viewFunction({
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
        const preloadBody = await contractAccount.viewFunction({
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

      viewResult = await contractAccount.viewFunction({
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

    // Decode the body and replace service-worker.js references
    let decodedBody = atob(viewResult.body);

    // Replace service-worker.js references to prevent service worker registration
    decodedBody = decodedBody.replace(/service-worker\.js/g, "");

    await route.fulfill({
      contentType: viewResult.contentType,
      body: decodedBody,
    });
  });
}

export async function compareInstanceWeb4WithTreasuryFactory(instance) {
  const rpcUrl = `https://rpc.mainnet.fastnear.com`;
  const treasuryFactoryWeb4ContractBytesResult = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: "treasury-factory.near",
        method_name: "get_web4_contract_bytes",
        args_base64: "",
      },
    }),
  }).then((r) => r.json());

  const web4_contract_bytes_from_treasury_factory = new Uint8Array(
    treasuryFactoryWeb4ContractBytesResult.result.result
  );
  const instanceWeb4ContractBytesResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "view_code",
        finality: "final",
        account_id: instance,
      },
    }),
  }).then((r) => r.json());
  const instance_contract_code_base64 =
    instanceWeb4ContractBytesResponse.result.code_base64;
  const instance_contract_bytes = Buffer.from(
    instance_contract_code_base64,
    "base64"
  );
  if (
    web4_contract_bytes_from_treasury_factory.length ===
      instance_contract_bytes.length &&
    web4_contract_bytes_from_treasury_factory.every(
      (byte, index) => byte === instance_contract_bytes[index]
    )
  ) {
    console.log("The contract bytes are identical.");
    return true;
  } else {
    console.log("The contract bytes are different.");
    return false;
  }
}
