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
          storage: storage,
        },
        tokens: [],
      };

      await route.fulfill({ json });
    }
  );
}

export async function mockWithFTBalance({ page, daoAccount, isSufficient }) {
  await page.route(
    (daoAccount.includes("testing")
      ? `https://ref-sdk-test-cold-haze-1300.fly.dev`
      : `https://ref-sdk-api.fly.dev`) +
      `/api/ft-tokens/?account_id=${daoAccount}`,
    async (route) => {
      await route.fulfill({
        json: {
          totalCumulativeAmt: 10,
          fts: [
            {
              contract: "usdt.tether-token.near",
              amount: "4500000",
              ft_meta: {
                name: "Tether USD",
                symbol: "USDt",
                decimals: 6,
                icon: "data:image/svg+xml,%3Csvg width='111' height='90' viewBox='0 0 111 90' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M24.4825 0.862305H88.0496C89.5663 0.862305 90.9675 1.64827 91.7239 2.92338L110.244 34.1419C111.204 35.7609 110.919 37.8043 109.549 39.1171L58.5729 87.9703C56.9216 89.5528 54.2652 89.5528 52.6139 87.9703L1.70699 39.1831C0.305262 37.8398 0.0427812 35.7367 1.07354 34.1077L20.8696 2.82322C21.6406 1.60483 23.0087 0.862305 24.4825 0.862305ZM79.8419 14.8003V23.5597H61.7343V29.6329C74.4518 30.2819 83.9934 32.9475 84.0642 36.1425L84.0638 42.803C83.993 45.998 74.4518 48.6635 61.7343 49.3125V64.2168H49.7105V49.3125C36.9929 48.6635 27.4513 45.998 27.3805 42.803L27.381 36.1425C27.4517 32.9475 36.9929 30.2819 49.7105 29.6329V23.5597H31.6028V14.8003H79.8419ZM55.7224 44.7367C69.2943 44.7367 80.6382 42.4827 83.4143 39.4727C81.0601 36.9202 72.5448 34.9114 61.7343 34.3597V40.7183C59.7966 40.8172 57.7852 40.8693 55.7224 40.8693C53.6595 40.8693 51.6481 40.8172 49.7105 40.7183V34.3597C38.8999 34.9114 30.3846 36.9202 28.0304 39.4727C30.8066 42.4827 42.1504 44.7367 55.7224 44.7367Z' fill='%23009393'/%3E%3C/svg%3E",
                reference: null,
                price: 1,
              },
            },
            {
              contract:
                "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
              amount: isSufficient ? "1500000" : "10",
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
    }
  );
}
