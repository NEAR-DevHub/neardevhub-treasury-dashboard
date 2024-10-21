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
        const originalResult = JSON.parse(
          new TextDecoder().decode(new Uint8Array(json.result.result))
        );
        mockedResult = await modifyOriginalResultFunction(originalResult);
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
      originalResult = {
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
              transfer: votePolicy,
              bounty_done: votePolicy,
              add_bounty: votePolicy,
              policy: votePolicy,
              call: votePolicy,
              upgrade_self: votePolicy,
              config: votePolicy,
              set_vote_token: votePolicy,
              upgrade_remote: votePolicy,
              vote: votePolicy,
              add_member_to_role: votePolicy,
              remove_member_from_role: votePolicy,
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
              upgrade_remote: votePolicy,
              upgrade_self: votePolicy,
              call: votePolicy,
              bounty_done: votePolicy,
              policy: votePolicy,
              config: votePolicy,
              add_member_to_role: votePolicy,
              set_vote_token: votePolicy,
              vote: votePolicy,
              transfer: votePolicy,
              add_bounty: votePolicy,
              remove_member_from_role: votePolicy,
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
      return originalResult;
    },
  });
}
