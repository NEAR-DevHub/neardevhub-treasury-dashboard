import { exec } from "child_process";
import { connect, utils, keyStores } from "near-api-js";
import { MOCK_RPC_URL } from "./rpcmock.js";

export const SPUTNIK_DAO_CONTRACT_ID = "sputnik-dao.near";
export const PROPOSAL_BOND = "100000000000000000000000";

export class SandboxRPC {
  async init() {
    await new Promise((resolve) => {
      this.sandbox = exec(
        new URL("../../sandboxrpc/target/debug/sandboxrpc", import.meta.url)
          .pathname
      );

      this.sandbox.stdout.on("data", (/** @type String */ data) => {
        if (!this.rpc_url) {
          const sandboxConfig = JSON.parse(data.split("\n")[0]);
          this.rpc_url = sandboxConfig.rpc_url;
          this.account_id = sandboxConfig.account_id;
          this.secret_key = sandboxConfig.secret_key;

          resolve();
        }
      });

      this.sandbox.stderr.on("data", (data) => {
        console.error(`Error output: ${data}`);
      });
    });

    this.keyStore = new keyStores.InMemoryKeyStore();
    this.keyStore.setKey(
      "sandbox",
      this.account_id,
      utils.KeyPair.fromString(this.secret_key)
    );

    this.near = await connect({
      networkId: "sandbox",
      nodeUrl: this.rpc_url,
      keyStore: this.keyStore,
    });

    this.account = await this.near.account(this.account_id);
  }

  /**
   * Use from playwright tests to redirect RPC sputnikdao contract calls to the sandbox
   * @param {import('playwright').Page} page - Playwright page object
   */
  async attachRoutes(page) {
    await page.route(MOCK_RPC_URL, async (route, request) => {
      const postData = request.postDataJSON();
      if (postData.params.account_id.endsWith(SPUTNIK_DAO_CONTRACT_ID)) {
        await route.continue({ url: this.rpc_url });
      } else {
        await route.fallback();
      }
    });
  }

  async setupSandboxForSputnikDao(daoName) {
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
              Group: [this.account.accountId],
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
              Group: [this.account.accountId],
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
              Group: [this.account.accountId],
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

    await this.account.functionCall({
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

  async getProposals(daoName, from_index, limit) {
    return this.account.viewFunction({
      contractId: `${daoName}.${SPUTNIK_DAO_CONTRACT_ID}`,
      methodName: "get_proposals",
      args: { from_index, limit },
    });
  }

  async addPaymentRequestProposal({
    title,
    summary,
    amount,
    receiver_id,
    daoName,
  }) {
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
    await this.account.functionCall({
      contractId: `${daoName}.${SPUTNIK_DAO_CONTRACT_ID}`,
      methodName: "add_proposal",
      args,
      attachedDeposit: PROPOSAL_BOND,
    });
  }

  async quitSandbox() {
    this.sandbox.stdin.write("quit\n");
  }
}
