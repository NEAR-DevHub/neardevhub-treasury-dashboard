export async function mockInventory({ page, account }) {
  await page.route(
    `https://api3.nearblocks.io/v1/account/${account}`,
    async (route, request) => {
      const json = {
        account: [
          {
            amount: "46802032589396149919965518",
            block_hash: "74pTbVA5KRLkWD4JtRb2tVXCgj6FxSox6HG1CDFHMKGa",
            block_height: 130261129,
            code_hash: "B5rViynsu6LMA1hwFZU9DfG6iNDUGd9Lv1AiArx15H79",
            locked: "0",
            storage_paid_at: 0,
            storage_usage: 31578,
            account_id: account,
            created: {
              transaction_hash: "BmzxeoS22AGGeiRXE21EKsq9SGQaLsgsjNa1TNxDe9pi",
              block_timestamp: 1621757636982896600,
            },
            deleted: { transaction_hash: null, block_timestamp: null },
          },
        ],
      };
      await route.fulfill({ json });
    }
  );
  await page.route(
    (account.includes("testing")
      ? `https://ref-sdk-test-cold-haze-1300-2.fly.dev`
      : `https://ref-sdk-api-2.fly.dev`) +
      `/api/ft-tokens/?account_id=${account}`,

    async (route, request) => {
      const json = {
        totalCumulativeAmt: 10,
        fts: [
          {
            contract:
              "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
            amount: "45000000000",
            ft_meta: {
              name: "USDC",
              symbol: "USDC",
              decimals: 6,
              icon: "data:image/svg+xml,%3C%3Fxml version=%221.0%22 encoding=%22utf-8%22%3F%3E%3C!-- Generator: Adobe Illustrator 22.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0) --%3E%3Csvg version=%221.1%22 id=%22Layer_1%22 xmlns=%22http://www.w3.org/2000/svg%22 xmlns:xlink=%22http://www.w3.org/1999/xlink%22 x=%220px%22 y=%220px%22 viewBox=%220 0 256 256%22 style=%22enable-background:new 0 0 256 256;%22 xml:space=%22preserve%22%3E%3Cstyle type=%22text/css%22%3E .st0%7Bfill:%232775CA;%7D .st1%7Bfill:%23FFFFFF;%7D%0A%3C/style%3E%3Ccircle class=%22st0%22 cx=%22128%22 cy=%22128%22 r=%22128%22/%3E%3Cpath class=%22st1%22 d=%22M104,217c0,3-2.4,4.7-5.2,3.8C60,208.4,32,172.2,32,129.3c0-42.8,28-79.1,66.8-91.5c2.9-0.9,5.2,0.8,5.2,3.8 v7.5c0,2-1.5,4.3-3.4,5C69.9,65.4,48,94.9,48,129.3c0,34.5,21.9,63.9,52.6,75.1c1.9,0.7,3.4,3,3.4,5V217z%22/%3E%3Cpath class=%22st1%22 d=%22M136,189.3c0,2.2-1.8,4-4,4h-8c-2.2,0-4-1.8-4-4v-12.6c-17.5-2.4-26-12.1-28.3-25.5c-0.4-2.3,1.4-4.3,3.7-4.3 h9.1c1.9,0,3.5,1.4,3.9,3.2c1.7,7.9,6.3,14,20.3,14c10.3,0,17.7-5.8,17.7-14.4c0-8.6-4.3-11.9-19.5-14.4c-22.4-3-33-9.8-33-27.3 c0-13.5,10.3-24.1,26.1-26.3V69.3c0-2.2,1.8-4,4-4h8c2.2,0,4,1.8,4,4v12.7c12.9,2.3,21.1,9.6,23.8,21.8c0.5,2.3-1.3,4.4-3.7,4.4 h-8.4c-1.8,0-3.3-1.2-3.8-2.9c-2.3-7.7-7.8-11.1-17.4-11.1c-10.6,0-16.1,5.1-16.1,12.3c0,7.6,3.1,11.4,19.4,13.7 c22,3,33.4,9.3,33.4,28c0,14.2-10.6,25.7-27.1,28.3V189.3z%22/%3E%3Cpath class=%22st1%22 d=%22M157.2,220.8c-2.9,0.9-5.2-0.8-5.2-3.8v-7.5c0-2.2,1.3-4.3,3.4-5c30.6-11.2,52.6-40.7,52.6-75.1 c0-34.5-21.9-63.9-52.6-75.1c-1.9-0.7-3.4-3-3.4-5v-7.5c0-3,2.4-4.7,5.2-3.8C196,50.2,224,86.5,224,129.3 C224,172.2,196,208.4,157.2,220.8z%22/%3E%3C/svg%3E%0A",
              reference: null,
              price: 0.999648,
            },
          },
          {
            contract: "usdt.tether-token.near",
            amount: "7500000",
            ft_meta: {
              name: "Tether USD",
              symbol: "USDt",
              decimals: 6,
              icon: "data:image/svg+xml,%3Csvg width='111' height='90' viewBox='0 0 111 90' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M24.4825 0.862305H88.0496C89.5663 0.862305 90.9675 1.64827 91.7239 2.92338L110.244 34.1419C111.204 35.7609 110.919 37.8043 109.549 39.1171L58.5729 87.9703C56.9216 89.5528 54.2652 89.5528 52.6139 87.9703L1.70699 39.1831C0.305262 37.8398 0.0427812 35.7367 1.07354 34.1077L20.8696 2.82322C21.6406 1.60483 23.0087 0.862305 24.4825 0.862305ZM79.8419 14.8003V23.5597H61.7343V29.6329C74.4518 30.2819 83.9934 32.9475 84.0642 36.1425L84.0638 42.803C83.993 45.998 74.4518 48.6635 61.7343 49.3125V64.2168H49.7105V49.3125C36.9929 48.6635 27.4513 45.998 27.3805 42.803L27.381 36.1425C27.4517 32.9475 36.9929 30.2819 49.7105 29.6329V23.5597H31.6028V14.8003H79.8419ZM55.7224 44.7367C69.2943 44.7367 80.6382 42.4827 83.4143 39.4727C81.0601 36.9202 72.5448 34.9114 61.7343 34.3597V40.7183C59.7966 40.8172 57.7852 40.8693 55.7224 40.8693C53.6595 40.8693 51.6481 40.8172 49.7105 40.7183V34.3597C38.8999 34.9114 30.3846 36.9202 28.0304 39.4727C30.8066 42.4827 42.1504 44.7367 55.7224 44.7367Z' fill='%23009393'/%3E%3C/svg%3E",
              reference: null,
              price: 0.999464,
            },
          },
        ],
        nfts: [],
      };
      await route.fulfill({ json });
    }
  );
}

export const CurrentTimestampInNanoseconds = `${Date.now() * 1_000_000}`;

export const TransferProposalData = {
  id: 10,
  proposer: "theori.near",
  description:
    '{"title":"DevHub Developer Contributor report by Megha for 09/09/2024 - 10/06/2024","summary":"Worked on integrating new features to treasury dashboard, like asset exchange using the ref-sdk API, stake delegation, made first version live for devhub, fixed some bugs with devhub and other instances.","notes":"Treasury balance insufficient","proposalId":220}',
  kind: {
    Transfer: {
      token_id:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      receiver_id: "megha19.near",
      amount: "12",
      msg: null,
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: CurrentTimestampInNanoseconds,
};

export const StakeProposalData = {
  id: 1,
  proposer: "theori.near",
  description: "* Proposal Action: stake",
  kind: {
    FunctionCall: {
      receiver_id: "astro-stakers.poolv1.near",
      actions: [
        {
          method_name: "deposit_and_stake",
          args: "",
          deposit: "1000000000000000000000000",
          gas: "200000000000000",
        },
      ],
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1728033017194722007",
};

export const UnStakeProposalData = {
  id: 2,
  proposer: "megha19.near",
  description: "* Proposal Action: unstake",
  kind: {
    FunctionCall: {
      receiver_id: "astro-stakers.poolv1.near",
      actions: [
        {
          method_name: "unstake",
          args: "eyJhbW91bnQiOiIyMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAifQ==",
          deposit: "0",
          gas: "200000000000000",
        },
      ],
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1728384666188444109",
};

export const WithdrawProposalData = {
  id: 55,
  proposer: "megha19.near",
  description: "* Proposal Action: withdraw",
  kind: {
    FunctionCall: {
      receiver_id: "nearfans.poolv1.near",
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
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1733742415052919669",
};

export const OldJsonProposalData = {
  id: 2,
  proposer: "megha19.near",
  description: '{"isStakeRequest":true,"notes":"this is notes"}',
  kind: {
    FunctionCall: {
      receiver_id: "astro-stakers.poolv1.near",
      actions: [
        {
          method_name: "unstake",
          args: "eyJhbW91bnQiOiIyMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAifQ==",
          deposit: "0",
          gas: "200000000000000",
        },
      ],
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1728384666188444109",
};

export const OldSettingsProposalData = {
  id: 1,
  proposer: "theori.near",
  description: "Change proposal period",
  kind: {
    ChangePolicyUpdateParameters: {
      parameters: {
        proposal_bond: null,
        proposal_period: "950400000000000",
        bounty_bond: null,
        bounty_forgiveness_period: null,
      },
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1728033017194722007",
};

export const SettingsProposalData = {
  id: 1,
  proposer: "theori.near",
  description:
    "* Title: Update policy - Voting Duration <br>* Summary: theori.near requested to change voting duration from 7 to 10",
  kind: {
    ChangePolicyUpdateParameters: {
      parameters: {
        proposal_bond: null,
        proposal_period: "950400000000000",
        bounty_bond: null,
        bounty_forgiveness_period: null,
      },
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1728033017194722007",
};

export const SettingsMemberProposalData = {
  id: 1,
  proposer: "theori.near",
  description:
    '* Title: Update policy - Members Permissions <br>* Summary: rubycop.near requested to add "root.near" to "Approver".',
  kind: {
    ChangePolicy: {
      policy: {
        roles: [],
        default_vote_policy: {
          weight_kind: "RoleWeight",
          quorum: "1",
          threshold: "1",
        },
        proposal_bond: "0",
        proposal_period: "1036800000000000",
        bounty_bond: "100000000000000000000000",
        bounty_forgiveness_period: "604800000000000",
      },
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1728033017194722007",
};

export const SwapProposalData = {
  id: 1,
  proposer: "theori.near",
  description:
    "* Proposal Action: asset-exchange <br>* Token In: 17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1 <br>* Token Out: usdt.tether-token.near <br>* Amount In: 0.5 <br>* Slippage: 1 <br>* Amount Out: 0.6",
  kind: {
    FunctionCall: {
      receiver_id:
        "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
      actions: [
        {
          method_name: "ft_transfer_call",
          args: "eyJyZWNlaXZlcl9pZCI6InYyLnJlZi1maW5hbmNlLm5lYXIiLCJhbW91bnQiOiIxMDAwMDAiLCJtc2ciOiJ7XCJmb3JjZVwiOjAsXCJhY3Rpb25zXCI6W3tcInBvb2xfaWRcIjo0NTEzLFwidG9rZW5faW5cIjpcIjE3MjA4NjI4Zjg0ZjVkNmFkMzNmMGRhM2JiYmViMjdmZmNiMzk4ZWFjNTAxYTMxYmQ2YWQyMDExZTM2MTMzYTFcIixcInRva2VuX291dFwiOlwidXNkdC50ZXRoZXItdG9rZW4ubmVhclwiLFwiYW1vdW50X2luXCI6XCIxMDAwMDBcIixcImFtb3VudF9vdXRcIjpcIjBcIixcIm1pbl9hbW91bnRfb3V0XCI6XCI5OTA3M1wifV19In0=",
          deposit: "1",
          gas: "180000000000000",
        },
      ],
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1740746334157940598",
};

export const LockupProposalData = {
  id: 1,
  proposer: "theori.near",
  description: "Create lockup for theori.near",
  kind: {
    FunctionCall: {
      receiver_id: "lockup.near",
      actions: [
        {
          method_name: "create",
          args: "eyJsb2NrdXBfZHVyYXRpb24iOiIwIiwib3duZXJfYWNjb3VudF9pZCI6InRoZW9yaS5uZWFyIiwid2hpdGVsaXN0X2FjY291bnRfaWQiOiJsb2NrdXAtbm8td2hpdGVsaXN0Lm5lYXIiLCJsb2NrdXBfdGltZXN0YW1wIjoiMTc0MjUwODAwMDAwMDAwMDAwMCIsInJlbGVhc2VfZHVyYXRpb24iOiIxNzI4MDAwMDAwMDAwMDAifQ==",
          deposit: "4000000000000000000000000",
          gas: "150000000000000",
        },
      ],
    },
  },
  status: "InProgress",
  vote_counts: {},
  votes: {},
  submission_time: "1740746334157940598",
};
