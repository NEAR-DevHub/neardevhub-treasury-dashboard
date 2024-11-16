import { exec, ChildProcess } from "child_process";
import { connect, utils, keyStores, Account } from "near-api-js";
import { MOCK_RPC_URL } from "./rpcmock.js";

export const SPUTNIK_DAO_CONTRACT_ID = "sputnik-dao.near";
export const PROPOSAL_BOND = "100000000000000000000000";

/**
 * @typedef SandboxRPC
 * @property {string} return.rpc_url - The URL for the RPC server.
 * @property {Account} return.account - The near-api-js Account object.
 * @property {string} return.secret_key - The secret key for the account.
 * @property {ChildProcess} return.sandbox - The sandbox child process.
 */

/**
 * @param {object} options
 * @param {import('playwright').Page} options.page - The Playwright page object
 * @returns {SandboxRPC} A SandboxRPC object containing configuration details.
 */
export async function getSandboxRPC({ page }) {
  const { rpc_url, account_id, secret_key, sandbox } = await new Promise(
    (resolve) => {
      const sandbox = exec(
        "sandboxrpc/target/debug/sandboxrpc",
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Execution error: ${error}`);
            return;
          }

          if (stderr) {
            console.error(`stderr: ${stderr}`);
          }

          // Process the output to find the RPC address
          const rpcAddressMatch = stdout.match(/RPC\s(.+)/);
          if (rpcAddressMatch) {
            const rpcAddress = rpcAddressMatch[1].trim();
            console.log(`Captured RPC Address: ${rpcAddress}`);
          } else {
            console.log("RPC Address not found in output.");
          }
        }
      );

      sandbox.stdout.on("data", (/** @type String */ data) => {
        try {
          resolve({ sandbox, ...JSON.parse(data) });
        } catch (e) {
          console.log("unable to parse as JSON", data);
        }
      });

      sandbox.stderr.on("data", (data) => {
        // console.error(`Error output: ${data}`);
      });
    }
  );

  const keyStore = new keyStores.InMemoryKeyStore();
  keyStore.setKey("sandbox", account_id, utils.KeyPair.fromString(secret_key));

  const near = await connect({
    networkId: "sandbox",
    nodeUrl: rpc_url,
    keyStore,
  });

  const account = await near.account(account_id);
  await page.route(MOCK_RPC_URL, async (route, request) => {
    const postData = request.postDataJSON();
    if (postData.params.account_id.endsWith(SPUTNIK_DAO_CONTRACT_ID)) {
      await route.continue({ url: rpc_url });
    } else {
      await route.fallback();
    }
  });

  return { rpc_url, account, secret_key, sandbox };
}

/**
 * @param {Object} options
 * @param {Account} options.account - The account to use
 * @param {string} options.daoName - The account to use
 */
export async function setupSandboxForSputnikDao({ account, daoName }) {
  const createDaoConfig = {
    config: {
      name: daoName,
      purpose: "creating dao treasury",
      metadata: "",
    },
    policy: {
      roles: [
        {
          kind: {
            Group: [account.accountId],
          },
          name: "Create Requests",
          permissions: [
            "*:AddProposal",
            "transfer:AddProposal",
            "config:Finalize",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: [account.accountId],
          },
          name: "Manage Members",
          permissions: [
            "config:*",
            "policy:*",
            "add_member_to_role:*",
            "remove_member_from_role:*",
          ],
          vote_policy: {},
        },
        {
          kind: {
            Group: [account.accountId],
          },
          name: "Vote",
          permissions: ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
          vote_policy: {},
        },
      ],
      default_vote_policy: {
        weight_kind: "RoleWeight",
        quorum: "0",
        threshold: [1, 2],
      },
      proposal_bond: "100000000000000000000000",
      proposal_period: "604800000000000",
      bounty_bond: "100000000000000000000000",
      bounty_forgiveness_period: "604800000000000",
    },
  };

  await account.functionCall({
    contractId: SPUTNIK_DAO_CONTRACT_ID,
    methodName: "create",
    args: {
      name: daoName,
      args: Buffer.from(JSON.stringify(createDaoConfig)).toString("base64"),
    },
    gas: 300000000000000,
    attachedDeposit: utils.format.parseNearAmount("6"),
  });
}

/**
 * 
 * @param {object} options
 * @param {Account} options.account
 * @param {string} options.daoName
 */
export async function getProposals({account, daoName}) {
  return account.viewFunction(
    {contractId: `${daoName}.${SPUTNIK_DAO_CONTRACT_ID}`,
      methodName: "get_proposals", args: {from_index: 0, limit: 10}});
}

export async function addPaymentRequestProposal({
  account, title, summary, amount, receiver_id, daoName}) {
    const args = {
      proposal: {
        description: `{"title":"${title}","summary":"${summary}","notes":null}`,
        kind: {
          Transfer: {
            amount,
            receiver_id,
            token_id:
              "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
          },
        },
      },
    };
    await account.functionCall({
      contractId: `${daoName}.${SPUTNIK_DAO_CONTRACT_ID}`,
      methodName: "add_proposal",
      args,
      attachedDeposit: PROPOSAL_BOND,
    });
}

export async function killSandbox(/** @type ChildProcess */ sandbox) {
  sandbox.kill("SIGHUP");
}
