import { exec } from "child_process";
import { connect, utils, keyStores } from "near-api-js";
import { MOCK_RPC_URL } from "./rpcmock.js";
import { parseNearAmount } from "near-api-js/lib/utils/format.js";
import { KeyPairEd25519 } from "near-api-js/lib/utils/key_pair.js";
import { getLocalWidgetSource } from "./bos-workspace.js";
import { expect } from "@playwright/test";
import path, { dirname } from "path";
import { overlayMessage, removeOverlayMessage } from "./test.js";
import { getLocalWidgetContent } from "./web4.js";

export const SPUTNIK_DAO_CONTRACT_ID = "sputnik-dao.near";
// we don't have proposal bond for any instance (in this repo)
export const PROPOSAL_BOND = "0";

export const DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID =
  "bootstrap.treasury-factory.near";

export const TREASURY_FACTORY_ACCOUNT_ID = "treasury-factory.near";
export class SandboxRPC {
  constructor() {
    this.modifiedWidgets = {};
  }

  async init() {
    await new Promise((resolve) => {
      this.sandbox = exec(
        new URL("../../sandboxrpc/target/debug/sandboxrpc", import.meta.url)
          .pathname
      );

      this.sandbox.stdout.on("data", (/** @type String */ data) => {
        const configLine = data
          .split("\n")
          .find((line) => line.startsWith("{"));
        if (configLine && !this.rpc_url) {
          const sandboxConfig = JSON.parse(configLine);
          this.rpc_url = sandboxConfig.rpc_url;
          this.account_id = sandboxConfig.account_id;
          this.secret_key = sandboxConfig.secret_key;
          resolve(sandboxConfig);
        } else if (this.stdoutPromiseResolve) {
          this.stdoutPromiseResolve(data);
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
    this.keyStore.setKey(
      "sandbox",
      TREASURY_FACTORY_ACCOUNT_ID,
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
   * @param {import('playwright').Page} page - Playwright page object
   */
  async deployNewTreasuryFactoryWithUpdatedWeb4Contract(page) {
    await overlayMessage(
      page,
      "Development team is deploying new treasury factory with updated web4 contract"
    );
    const result = await this.near.connection.provider.query({
      request_type: "view_code",
      account_id: TREASURY_FACTORY_ACCOUNT_ID,
      finality: "final",
    });
    const currentCode = Buffer.from(result.code_base64, "base64");

    // Convert the binary to a string and search for "Select Gateway"
    const searchString = "Select Gateway";
    const replaceString = "Gateway Select";

    const searchBuffer = Buffer.from(searchString, "utf-8");
    const replaceBuffer = Buffer.from(replaceString, "utf-8");

    const index = currentCode.indexOf(searchBuffer);
    if (index === -1) {
      console.error(`String "${searchString}" not found in the WASM binary.`);
      return;
    }

    // Replace the string in the binary
    replaceBuffer.copy(currentCode, index);

    // Deploy new treasury factory with updated web4 contract
    await (
      await this.near.account(TREASURY_FACTORY_ACCOUNT_ID)
    ).deployContract(currentCode);
    await removeOverlayMessage(page);
  }

  /**
   * Use from playwright tests to redirect RPC sputnikdao contract calls to the sandbox
   * @param {import('playwright').Page} page - Playwright page object
   * @param {string[]} accounts - List of account IDs to redirect to the sandbox
   */
  async attachRoutes(page, accounts = []) {
    await page.route(MOCK_RPC_URL, async (route, request) => {
      const postData = request.postDataJSON();
      if (
        postData.params.account_id.endsWith(SPUTNIK_DAO_CONTRACT_ID) ||
        accounts.includes(postData.params.account_id)
      ) {
        await route.continue({ url: this.rpc_url });
      } else {
        await route.fallback();
      }
    });
  }

  /**
   *
   *
   */
  async getDevUserAccountAccessKey() {
    const accessKeyView = this.account.findAccessKey(this.account_id, []);
    return accessKeyView;
  }

  async setupDefaultWidgetReferenceAccount() {
    const reference_widget_account_id = DEFAULT_WIDGET_REFERENCE_ACCOUNT_ID;

    const keyPair = utils.KeyPair.fromString(this.secret_key);

    await this.keyStore.setKey("sandbox", reference_widget_account_id, keyPair);

    const reference_widget_account = await this.near.account(
      reference_widget_account_id
    );

    const access_keys = await reference_widget_account.getAccessKeys();
    expect(
      access_keys.find((accessKeyView) => accessKeyView.public_key).public_key
    ).toEqual(keyPair.getPublicKey().toString());

    const data = {};
    const appWidgetKey = reference_widget_account_id + "/widget/app";

    const appWidget =
      this.modifiedWidgets[appWidgetKey] ??
      (await getLocalWidgetContent(
        reference_widget_account_id + "/widget/app"
      ));
    const configWidget = await getLocalWidgetContent(
      reference_widget_account_id + "/widget/config.data"
    );

    data[reference_widget_account_id] = {
      widget: {
        app: appWidget,
        "config.data": configWidget,
      },
    };

    await reference_widget_account.functionCall({
      contractId: "social.near",
      methodName: "set",
      args: {
        data,
      },
      attachedDeposit: parseNearAmount("1"),
    });
  }

  async setupWidgetReferenceAccount(reference_widget_account_id) {
    const widgetReferenceAccountKeyPair = KeyPairEd25519.fromRandom();
    await this.keyStore.setKey(
      "sandbox",
      reference_widget_account_id,
      widgetReferenceAccountKeyPair
    );

    await this.account.functionCall({
      contractId: "near",
      methodName: "create_account",
      args: {
        new_account_id: reference_widget_account_id,
        new_public_key: widgetReferenceAccountKeyPair.getPublicKey().toString(),
      },
      gas: 300000000000000,
      attachedDeposit: parseNearAmount("2"),
    });

    const reference_widget_account = await this.near.account(
      reference_widget_account_id
    );
    const data = {};
    const localWidgetSources = await getLocalWidgetSource(
      reference_widget_account_id + "/widget/**"
    );

    data[reference_widget_account_id] = {
      widget: localWidgetSources[reference_widget_account_id].widget,
    };
    await reference_widget_account.functionCall({
      contractId: "social.near",
      methodName: "set",
      args: {
        data,
      },
      attachedDeposit: parseNearAmount("1"),
    });
  }

  async setupLockupContract(owner_account_id) {
    await this.account.functionCall({
      contractId: "lockup-whitelist.near",
      methodName: "new",
      args: {
        foundation_account_id: "poolv1.near",
      },
      gas: 300000000000000,
    });
    await this.account.functionCall({
      contractId: "lockup.near",
      methodName: "new",
      args: {
        whitelist_account_id: "lockup-whitelist.near",
        foundation_account_id: "poolv1.near",
        master_account_id: "poolv1.near",
        lockup_master_account_id: "lockup.near",
      },
      gas: 300000000000000,
    });
    const createLockupResult = await this.account.functionCall({
      contractId: "lockup.near",
      methodName: "create",
      args: { owner_account_id, lockup_duration: "63036000000000000" },
      attachedDeposit: parseNearAmount("40"),
      gas: 300000000000000,
    });

    await this.account.functionCall({
      contractId: "poolv1.near",
      methodName: "new",
      args: {
        staking_pool_whitelist_account_id: "lockup-whitelist.near",
      },
      gas: 300000000000000,
    });

    await this.account.functionCall({
      contractId: "poolv1.near",
      methodName: "create_staking_pool",
      args: {
        staking_pool_id: "astro-stakers",
        owner_id: this.account_id,
        stake_public_key: (
          await this.account.getAccessKeys()
        )[0].public_key.toString(),
        reward_fee_fraction: {
          numerator: 10,
          denominator: 100,
        },
      },
      gas: 300000000000000,
      attachedDeposit: parseNearAmount("32"),
    });

    function findLockupContractLog(json) {
      if (!json.receipts_outcome || !Array.isArray(json.receipts_outcome)) {
        return "No receipts_outcome found in the data.";
      }

      for (const receipt of json.receipts_outcome) {
        const logs = receipt.outcome?.logs || [];
        for (const log of logs) {
          if (
            log.includes("The lockup contract") &&
            log.includes("was successfully created")
          ) {
            // Extract the contract ID using a regular expression
            const match = log.match(
              /The lockup contract (.+?) was successfully created/
            );
            if (match && match[1]) {
              return match[1]; // Return the extracted contract ID
            }
          }
        }
      }

      return "No lockup contract creation log found.";
    }

    return findLockupContractLog(createLockupResult);
  }

  async setupSandboxForSputnikDao(daoName, memberAccountId, isMultiVote) {
    const group = [this.account.accountId];
    if (memberAccountId) {
      group.push(memberAccountId);
    }
    const oneRequiredVote = {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: isMultiVote ? "2" : "1",
    };
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
              Group: group,
            },
            name: "Requestor",
            permissions: [
              "call:AddProposal",
              "transfer:AddProposal",
              "call:VoteRemove",
              "transfer:VoteRemove",
            ],
            vote_policy: {
              transfer: oneRequiredVote,
              call: oneRequiredVote,
            },
          },
          {
            kind: {
              Group: group,
            },
            name: "Admin",
            permissions: [
              "config:*",
              "policy:*",
              "add_member_to_role:*",
              "remove_member_from_role:*",
              "upgrade_self:*",
              "upgrade_remote:*",
              "set_vote_token:*",
              "add_bounty:*",
              "bounty_done:*",
              "factory_info_update:*",
              "policy_add_or_update_role:*",
              "policy_remove_role:*",
              "policy_update_default_vote_policy:*",
              "policy_update_parameters:*",
            ],
            vote_policy: {
              config: oneRequiredVote,
              policy: oneRequiredVote,
              add_member_to_role: oneRequiredVote,
              remove_member_from_role: oneRequiredVote,
              upgrade_self: oneRequiredVote,
              upgrade_remote: oneRequiredVote,
              set_vote_token: oneRequiredVote,
              add_bounty: oneRequiredVote,
              bounty_done: oneRequiredVote,
              factory_info_update: oneRequiredVote,
              policy_add_or_update_role: oneRequiredVote,
              policy_remove_role: oneRequiredVote,
              policy_update_default_vote_policy: oneRequiredVote,
              policy_update_parameters: oneRequiredVote,
            },
          },
          {
            kind: {
              Group: group,
            },
            name: "Approver",
            permissions: [
              "call:VoteReject",
              "call:VoteApprove",
              "call:RemoveProposal",
              "call:Finalize",
              "transfer:VoteReject",
              "transfer:VoteApprove",
              "transfer:RemoveProposal",
              "transfer:Finalize",
            ],
            vote_policy: {
              transfer: oneRequiredVote,
              call: oneRequiredVote,
            },
          },
        ],
        default_vote_policy: {
          weight_kind: "RoleWeight",
          quorum: "0",
          threshold: [1, 2],
        },
        proposal_bond: PROPOSAL_BOND,
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
      attachedDeposit: utils.format.parseNearAmount("8"),
    });
  }

  async getProposals(daoName, from_index, limit) {
    return this.account.viewFunction({
      contractId: `${daoName}.${SPUTNIK_DAO_CONTRACT_ID}`,
      methodName: "get_proposals",
      args: { from_index, limit },
    });
  }

  async getLastProposalId(daoName) {
    return this.account.viewFunction({
      contractId: `${daoName}.${SPUTNIK_DAO_CONTRACT_ID}`,
      methodName: "get_last_proposal_id",
      args: {},
    });
  }

  async addProposal({ daoName, args }) {
    await this.account.functionCall({
      contractId: `${daoName}.${SPUTNIK_DAO_CONTRACT_ID}`,
      methodName: "add_proposal",
      args,
      attachedDeposit: PROPOSAL_BOND,
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
        description: `* Title: ${title} <br>* Summary: ${summary}`,
        kind: {
          Transfer: {
            amount,
            receiver_id,
            token_id: "",
          },
        },
      },
    };
    await this.addProposal({ daoName, args });
  }

  async addFunctionCallProposal({
    method_name,
    description,
    receiver_id,
    functionArgs,
    daoName,
    deposit = "0",
  }) {
    const args = {
      proposal: {
        description: description,
        kind: {
          FunctionCall: {
            receiver_id: receiver_id,
            actions: [
              {
                method_name: method_name,
                args: functionArgs,
                deposit: deposit,
                gas: "270000000000000",
              },
            ],
          },
        },
      },
    };
    await this.addProposal({ daoName, args });
  }

  async addStakeRequestProposal({ stakedPoolAccount, stakingAmount, daoName }) {
    const args = {
      proposal: {
        description: "* Proposal Action: stake",
        kind: {
          FunctionCall: {
            receiver_id: stakedPoolAccount,
            actions: [
              {
                method_name: "deposit_and_stake",
                args: "",
                deposit: utils.format.parseNearAmount(stakingAmount),
                gas: "200000000000000",
              },
            ],
          },
        },
      },
    };
    await this.addProposal({ daoName, args });
  }

  async addUnstakeRequestProposal({
    stakedPoolAccount,
    functionCallArgs,
    daoName,
  }) {
    const args = {
      proposal: {
        description: "* Proposal Action: unstake",
        kind: {
          FunctionCall: {
            receiver_id: stakedPoolAccount,
            actions: [
              {
                method_name: "unstake",
                args: functionCallArgs,
                deposit: "0",
                gas: "200000000000000",
              },
            ],
          },
        },
      },
    };
    await this.addProposal({ daoName, args });
  }

  async addWithdrawRequestProposal({
    stakedPoolAccount,
    description,
    daoName,
  }) {
    const args = {
      proposal: {
        description: description,
        kind: {
          FunctionCall: {
            receiver_id: stakedPoolAccount,
            actions: [
              {
                method_name: "withdraw_all",
                args: "",
                deposit: "0",
                gas: "200000000000000",
              },
            ],
          },
        },
      },
    };
    await this.addProposal({ daoName, args });
  }

  /**
   * Redirect Web4 requests to the specified contract
   * @param {string} contractId - The contract ID to redirect requests to
   * @param {import('@playwright/test').Page} page - Playwright page object
   */
  async redirectWeb4(contractId, page) {
    const treasury = contractId.split(".near")[0] + ".sputnik-dao.near";
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
          const fileContents = {};

          for (const key of keys) {
            const [account, section, contentKey] = key.split("/");
            if (fileContents[account] === undefined) {
              fileContents[account] = {};
            }
            if (fileContents[account][section] === undefined) {
              fileContents[account][section] = {};
            }

            if (this.modifiedWidgets[key]) {
              fileContents[account][section][contentKey] =
                this.modifiedWidgets[key];
            } else {
              const content = getLocalWidgetContent(key, {
                treasury,
                account,
                nodeUrl: this.rpc_url,
              });

              if (content) {
                fileContents[account][section][contentKey] = content;
              } else {
                console.warn(
                  `File not found for key: ${key}, going to live RPC`
                );
                await route.fallback();
                return;
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
          url: this.rpc_url,
          json: postData,
        });
        await route.fulfill({ response });
      }
    });

    await page.route(
      `https://${contractId}.page/**`,
      async (route, request) => {
        const path = request
          .url()
          .substring(`https://${contractId}.page`.length);
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
      }
    );
  }

  modifyWidget(key, content) {
    this.modifiedWidgets[key] = content;
  }

  /**
   * Time travel forward with the specified number of blocks
   * @param {number} numBlocks
   */
  async fastForward(numBlocks) {
    this.sandbox.stdin.write(`fast_forward(${numBlocks})\n`);
    while (
      !(
        await new Promise((resolve) => {
          this.stdoutPromiseResolve = resolve;
        })
      ).includes("Fast-forwarded")
    ) {}
  }

  async quitSandbox() {
    this.sandbox.stdin.write("quit\n");
  }
}
