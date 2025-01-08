export const MOCK_RPC_URL = "http://127.0.0.1:8080/api/proxy-rpc";

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
        result: {
          result: Array.from(
            new TextEncoder().encode(JSON.stringify(mockedResult))
          ),
        },
      };

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

export function getMockedPolicy(
  createRequestPolicy,
  membersPolicy,
  votePolicy
) {
  return {
    roles: [
      {
        name: "Create Requests",
        kind: {
          Group: [
            "theori.near",
            "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
            "freski.near",
            "megha19.near",
            "thomasguntenaar.near",
            "petersalomonsen.near",
          ],
        },
        permissions: [
          "call:AddProposal",
          "transfer:AddProposal",
          "config:Finalize",
        ],
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
          Group: [
            "petersalomonsen.near",
            "thomasguntenaar.near",
            "theori.near",
            "megha19.near",
          ],
        },
        permissions: [
          "config:*",
          "policy:*",
          "add_member_to_role:*",
          "remove_member_from_role:*",
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
          Group: [
            "megha19.near",
            "petersalomonsen.near",
            "treasurytestuserledger.near",
            "tfdevhub.near",
            "theori.near",
            "thomasguntenaar.near",
            "test04.near",
            "test03.near",
            "test05.near",
          ],
        },
        permissions: ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
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

export async function updateDaoPolicyMembers({ page, isMultiVote = false }) {
  await mockRpcRequest({
    page,
    filterParams: {
      method_name: "get_policy",
    },
    modifyOriginalResultFunction: (originalResult) => {
      const votePolicy = {
        weight_kind: "RoleWeight",
        quorum: "0",
        threshold: isMultiVote ? [90, 100] : [0, 100],
      };
      originalResult = getMockedPolicy(votePolicy, votePolicy, votePolicy);
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
