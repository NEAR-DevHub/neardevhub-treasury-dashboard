export const MOCK_RPC_URL = "http://127.0.0.1:14500";

export async function mockRpcRequest({
  page,
  filterParams = {},
  mockedResult = {},
  modifyOriginalResultFunction = null,
}) {
  await page.route(MOCK_RPC_URL, async (route, request) => {
    const postData = request.postDataJSON();

    const filterParamsKeys = Object.keys(filterParams);
    if (
      filterParamsKeys.filter(
        (param) => postData.params[param] === filterParams[param]
      ).length === filterParamsKeys.length
    ) {
      const json = await route.fetch().then((r) => r.json());

      if (modifyOriginalResultFunction) {
        try {
          const originalResult = JSON.parse(
            new TextDecoder().decode(new Uint8Array(json.result.result))
          );
          let args;
          if (postData.params.args_base64) {
            args = JSON.parse(
              Buffer.from(postData.params.args_base64, "base64").toString()
            );
          }
          mockedResult = await modifyOriginalResultFunction(
            originalResult,
            postData,
            args
          );
        } catch (e) {
          console.error("Unable to modify original result", e);
        }
      }

      const mockedResponse = {
        jsonrpc: "2.0",
        id: "dontcare",
        result: {},
      };

      if (mockedResult?.isError) {
        mockedResponse["result"] = {
          error: mockedResult.error,
        };
      } else {
        mockedResponse["result"] = {
          result: Array.from(
            new TextEncoder().encode(JSON.stringify(mockedResult))
          ),
        };
      }

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockedResponse),
      });
    } else {
      route.fallback();
    }
  });
}

export function getOldPolicy(
  createRequestPolicy,
  votePolicy,
  membersPolicy,
  creatorsGroup = [
    "theori.near",
    "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
    "freski.near",
    "thomasguntenaar.near",
    "petersalomonsen.near",
  ],
  adminGroup = [
    "petersalomonsen.near",
    "thomasguntenaar.near",
    "theori.near",
    "megha19.near",
  ],
  voteGroup = [
    "petersalomonsen.near",
    "treasurytestuserledger.near",
    "tfdevhub.near",
    "theori.near",
    "thomasguntenaar.near",
    "test04.near",
    "test03.near",
    "test05.near",
  ]
) {
  return {
    roles: [
      {
        name: "Create Requests",
        kind: {
          Group: creatorsGroup,
        },
        permissions: ["call:AddProposal", "transfer:AddProposal"],
        vote_policy: {
          transfer: createRequestPolicy,
          bounty_done: createRequestPolicy,
          add_bounty: createRequestPolicy,
          policy: createRequestPolicy,
          call: createRequestPolicy,
          upgrade_self: createRequestPolicy,
          config: createRequestPolicy,
          set_vote_token: createRequestPolicy,
          upgrade_remote: createRequestPolicy,
          vote: createRequestPolicy,
          add_member_to_role: createRequestPolicy,
          remove_member_from_role: createRequestPolicy,
        },
      },
      {
        name: "Manage Members",
        kind: {
          Group: adminGroup,
        },
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
          upgrade_remote: membersPolicy,
          upgrade_self: membersPolicy,
          call: membersPolicy,
          bounty_done: membersPolicy,
          policy: membersPolicy,
          config: membersPolicy,
          add_member_to_role: membersPolicy,
          set_vote_token: membersPolicy,
          vote: membersPolicy,
          transfer: membersPolicy,
          add_bounty: membersPolicy,
          remove_member_from_role: membersPolicy,
        },
      },
      {
        name: "Vote",
        kind: {
          Group: voteGroup,
        },
        permissions: [
          "*:VoteReject",
          "*:VoteApprove",
          "*:VoteRemove",
          "*:RemoveProposal",
          "*:Finalize",
        ],
        vote_policy: {
          transfer: votePolicy,
          config: votePolicy,
          add_bounty: votePolicy,
          set_vote_token: votePolicy,
          upgrade_remote: votePolicy,
          add_member_to_role: votePolicy,
          upgrade_self: votePolicy,
          call: votePolicy,
          policy: votePolicy,
          remove_member_from_role: votePolicy,
          bounty_done: votePolicy,
          vote: votePolicy,
        },
      },
    ],
    default_vote_policy: {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: [1, 2],
    },
    proposal_bond: "0",
    proposal_period: "604800000000000",
    bounty_bond: "100000000000000000000000",
    bounty_forgiveness_period: "604800000000000",
  };
}

export function getNewPolicy(
  createRequestPolicy,
  votePolicy,
  membersPolicy,
  requestorGroup = [
    "theori.near",
    "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
    "freski.near",
    "thomasguntenaar.near",
    "petersalomonsen.near",
  ],
  adminGroup = [
    "petersalomonsen.near",
    "thomasguntenaar.near",
    "theori.near",
    "megha19.near",
  ],
  approverGroup = [
    "petersalomonsen.near",
    "treasurytestuserledger.near",
    "tfdevhub.near",
    "theori.near",
    "thomasguntenaar.near",
    "test04.near",
    "test03.near",
    "test05.near",
  ]
) {
  return {
    roles: [
      {
        name: "Requestor",
        kind: {
          Group: requestorGroup,
        },
        permissions: [
          "call:AddProposal",
          "transfer:AddProposal",
          "call:VoteRemove",
          "transfer:VoteRemove",
        ],
        vote_policy: {
          transfer: createRequestPolicy,
          call: createRequestPolicy,
        },
      },
      {
        name: "Approver",
        kind: {
          Group: approverGroup,
        },
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
          transfer: votePolicy,
          config: votePolicy,
          add_bounty: votePolicy,
          set_vote_token: votePolicy,
          upgrade_remote: votePolicy,
          add_member_to_role: votePolicy,
          upgrade_self: votePolicy,
          call: votePolicy,
          policy: votePolicy,
          remove_member_from_role: votePolicy,
          bounty_done: votePolicy,
          vote: votePolicy,
        },
      },
      {
        name: "Admin",
        kind: {
          Group: adminGroup,
        },
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
          upgrade_remote: membersPolicy,
          upgrade_self: membersPolicy,
          call: membersPolicy,
          bounty_done: membersPolicy,
          policy: membersPolicy,
          config: membersPolicy,
          add_member_to_role: membersPolicy,
          set_vote_token: membersPolicy,
          vote: membersPolicy,
          transfer: membersPolicy,
          add_bounty: membersPolicy,
          remove_member_from_role: membersPolicy,
        },
      },
    ],
    default_vote_policy: {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: [1, 2],
    },
    proposal_bond: "0",
    proposal_period: "604800000000000",
    bounty_bond: "100000000000000000000000",
    bounty_forgiveness_period: "604800000000000",
  };
}
export async function updateDaoPolicyMembers({
  instanceAccount,
  page,
  isMultiVote = false,
  isDefaultPolicy = false,
  hasAllRole = false,
}) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_policy",
    },
    modifyOriginalResultFunction: (originalResult) => {
      const votePolicy = {
        weight_kind: "RoleWeight",
        quorum: "0",
        threshold: isDefaultPolicy
          ? [1, 2]
          : isMultiVote
          ? [90, 100]
          : [0, 100],
      };
      originalResult = instanceAccount.includes("testing")
        ? getNewPolicy(votePolicy, votePolicy, votePolicy)
        : getOldPolicy(votePolicy, votePolicy, votePolicy);
      if (hasAllRole) {
        originalResult.roles.push({
          name: "all",
          kind: "Everyone",
          permissions: [
            "call:AddProposal",
            "transfer:AddProposal",
            "call:VoteRemove",
            "transfer:VoteRemove",
            "call:VoteReject",
            "call:VoteApprove",
            "call:RemoveProposal",
            "call:Finalize",
            "transfer:VoteReject",
            "transfer:VoteApprove",
            "transfer:RemoveProposal",
            "transfer:Finalize",
            "config:*",
            "policy:*",
            "policy_update_parameters:*",
          ],
          vote_policy: {},
        });
      }
      return originalResult;
    },
  });
}

export async function mockNearBalances({ page, accountId, balance, storage }) {
  await page.route(
    `https://api.fastnear.com/v1/account/${accountId}/full`,
    async (route) => {
      const json = {
        account_id: accountId,
        nfts: [],
        pools: [],
        state: {
          balance: balance,
          locked: "0",
          storage_bytes: storage,
        },
        tokens: [],
      };

      await route.fulfill({ json });
    }
  );
}

export async function mockWithFTBalance({
  page,
  daoAccount,
  isSufficient,
  isDashboard,
}) {
  const ftTokensBaseUrl = daoAccount.includes("testing")
    ? `https://ref-sdk-test-cold-haze-1300-2.fly.dev`
    : `https://ref-sdk-api-2.fly.dev`;

  // Regex to handle optional trailing slash before query parameters
  const ftTokensUrlPattern = new RegExp(
    `^${ftTokensBaseUrl}/api/ft-tokens\\/?\\?account_id=${daoAccount}$`
  );

  await page.route(ftTokensUrlPattern, async (route) => {
    await route.fulfill({
      json: {
        totalCumulativeAmt: 10,
        fts: isDashboard
          ? [
              {
                contract: "crans.tkn.near",
                amount: "30000000000000000000000000000",
                ft_meta: {
                  name: "Crans",
                  symbol: "CRANS",
                  decimals: 24,
                  icon: "",
                  reference: null,
                  price: null,
                },
              },
              {
                contract: "slush.tkn.near",
                amount: "7231110994833791657750514",
                ft_meta: {
                  name: "Slushie",
                  symbol: "SLUSH",
                  decimals: 18,
                  icon: "",
                  reference: null,
                  price: null,
                },
              },
              {
                contract: "chainabstract.tkn.near",
                amount: "1000000000000000000000000",
                ft_meta: {
                  name: "Chain Abstraction",
                  symbol: "CHAINABSTRACT",
                  decimals: 18,
                  icon: "",
                  reference: null,
                  price: null,
                },
              },
              {
                contract: "rnc.tkn.near",
                amount: "710047000000000000000000",
                ft_meta: {
                  name: "Republican National Committee ",
                  symbol: "RNC",
                  decimals: 18,
                  icon: "",
                  reference: null,
                  price: null,
                },
              },
              {
                contract: "hoot-657.meme-cooking.near",
                amount: "1000000000000000000000",
                ft_meta: {
                  name: "HOOT",
                  symbol: "HOOT",
                  decimals: 18,
                  icon: "",
                  reference: null,
                  price: null,
                },
              },

              {
                contract:
                  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
                amount: "72000000",
                ft_meta: {
                  name: "USDC",
                  symbol: "USDC",
                  decimals: 6,
                  icon: "",
                  reference: null,
                  price: 0.999997,
                },
              },
              {
                contract: "token.v2.ref-finance.near",
                amount: "977826758655654840",
                ft_meta: {
                  name: "Ref Finance Token",
                  symbol: "REF",
                  decimals: 18,
                  icon: "",
                  reference: null,
                  price: 0.123989,
                },
              },

              {
                contract: "blackdragon.tkn.near",
                amount: "743919574977600000000000000000000000",
                ft_meta: {
                  name: "Black Dragon",
                  symbol: "BLACKDRAGON",
                  decimals: 24,
                  icon: "",
                  reference: null,
                  price: 3e-8,
                },
              },
            ]
          : [
              {
                contract: "usdt.tether-token.near",
                amount: isSufficient ? "4500000" : "10",
                ft_meta: {
                  name: "Tether USD",
                  symbol: "USDt",
                  decimals: 6,
                  icon: "",
                  reference: null,
                  price: 1,
                },
              },
              {
                contract:
                  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
                amount: isSufficient ? "5000000" : "10",
                ft_meta: {
                  name: "USDC",
                  symbol: "USDC",
                  decimals: 6,
                  icon: "",
                  reference: null,
                  price: 1,
                },
              },
            ],
        nfts: [],
      },
    });
  });
  await page.route(`https://free.rpc.fastnear.com`, async (route) => {
    const request = await route.request();
    const requestPostData = request.postDataJSON();

    if (
      requestPostData.params &&
      requestPostData.params.method_name === "ft_balance_of"
    ) {
      const json = {
        jsonrpc: "2.0",
        result: {
          block_hash: "Hu4y62y9L8zvoSkeKHan3up7UWAxxuB9P2J9S89eMvp1",
          block_height: 141681041,
          logs: [],
          result: Array.from(
            new TextEncoder().encode(
              isSufficient ? "100000000000000000000" : "10"
            )
          ),
        },
        id: "dontcare",
      };
      await route.fulfill({ json });
    } else {
      await route.continue();
    }
  });
}

export async function mockUserDaos({ page, hasDaos, accountId, daoAccount }) {
  await page.route(
    (daoAccount.includes("testing")
      ? `https://ref-sdk-test-cold-haze-1300-2.fly.dev`
      : `https://ref-sdk-api-2.fly.dev`) +
      `/api/user-daos?account_id=${accountId}`,
    async (route) => {
      const json = hasDaos
        ? [
            "build.sputnik-dao.near",
            "testing.sputnik-dao.near",
            "she-is-near.sputnik-dao.near",
            "testing-astradao.sputnik-dao.near",
            "devdao.sputnik-dao.near",
            "infinex.sputnik-dao.near",
            "testing-treasury.sputnik-dao.near",
            "templar.sputnik-dao.near",
            "mgoel.sputnik-dao.near",
            "testing-app2.sputnik-dao.near",
            "test-self-create.sputnik-dao.near",
          ]
        : [];
      await route.fulfill({ json });
    }
  );
}
