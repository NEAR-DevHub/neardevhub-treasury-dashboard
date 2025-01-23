import { KeyPairEd25519 } from "near-api-js/lib/utils/key_pair.js";
import { SandboxRPC } from "../../playwright-tests/util/sandboxrpc.js";
import { parseNearAmount } from "near-api-js/lib/utils/format.js";

const sandbox = new SandboxRPC();
await sandbox.init();

// should be able to create all types of proposals, that we use in treasury and vote on them
const daoName = "testdao";
const daoContract = "testdao.sputnik-dao.near";

async function approveProposal({ proposalId, kind }) {
  console.log(`Kind: ${kind}, ProposalId: ${proposalId}`)
  const result = await sandbox.account.functionCall({
    contractId: daoContract,
    methodName: "act_proposal",
    args: {
      id: proposalId,
      action: "VoteApprove",
    },
    gas: 300000000000000,
  });
  console.log(
    `Kind: ${kind}, failure receipts should be empty: `,
    result.receipts_outcome
      .filter((receipt_outcome) => receipt_outcome.outcome.status.Failure)
      .map((receipt_outcome) => JSON.stringify(receipt_outcome)),
  );
}

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

await sandbox.setupSandboxForSputnikDao(daoName);

// Function call proposal is already checked in `staking.js`

// ChangeConfig proposal
let changeConfigProposalId = Number.parseInt(
  Buffer.from(
    (
      await sandbox.account.functionCall({
        contractId: daoContract,
        methodName: "add_proposal",
        args: {
          proposal: {
            description: "* Title: Update Config - Theme & logo",
            kind: {
              ChangeConfig: {
                config: {
                  name: "Tesing DAO",
                  purpose: "Testing purpose",
                  metadata: toBase64({
                    primaryColor: "#0000",
                    flagLogo:
                      "https://ipfs.near.social/ipfs/bafkreiboarigt5w26y5jyxyl4au7r2dl76o5lrm2jqjgqpooakck5xsojq",
                    theme: "light",
                  }),
                },
              },
            },
          },
        },
        attachedDeposit: "0",
        gas: 300000000000000,
      })
    ).status.SuccessValue,
    "base64",
  ).toString(),
);
await approveProposal({
  kind: "ChangeConfig",
  proposalId: changeConfigProposalId,
});

// ChangePolicy
const votePolicy = {
  weight_kind: "RoleWeight",
  quorum: "0",
  threshold: [0, 100],
};
let changePolicyProposalId = Number.parseInt(
  Buffer.from(
    (
      await sandbox.account.functionCall({
        contractId: daoContract,
        methodName: "add_proposal",
        args: {
          proposal: {
            description: "Update policy - Members Permissions",
            kind: {
              ChangePolicy: {
                policy: {
                  roles: [
                    {
                      name: "Create Requests",
                      kind: {
                        Group: [
                          "theori.near",
                          "2dada969f3743a4a41cfdb1a6e39581c2844ce8fbe25948700c85c598090b3e1",
                          "freski.near",
                          "thomasguntenaar.near",
                          "petersalomonsen.near",
                        ],
                      },
                      permissions: ["call:AddProposal", "transfer:AddProposal"],
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
                      permissions: [
                        "*:VoteReject",
                        "*:VoteApprove",
                        "*:VoteRemove",
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
                },
              },
            },
          },
        },
        attachedDeposit: "0",
        gas: 300000000000000,
      })
    ).status.SuccessValue,
    "base64",
  ).toString(),
);
await approveProposal({
  kind: "ChangePolicy",
  proposalId: changePolicyProposalId,
});

// ChangePolicyUpdateParameters
let changePolicyParametersProposalId = Number.parseInt(
  Buffer.from(
    (
      await sandbox.account.functionCall({
        contractId: daoContract,
        methodName: "add_proposal",
        args: {
          proposal: {
            description:
              "* Title: Update policy - Voting Duration <br>* Summary: theori.near requested to change voting duration from 7 to 10",
            kind: {
              ChangePolicyUpdateParameters: {
                parameters: {
                  proposal_period: (60 * 60 * 24 * 10).toString() + "000000000",
                },
              },
            },
          },
        },
        attachedDeposit: "0",
        gas: 300000000000000,
      })
    ).status.SuccessValue,
    "base64",
  ).toString(),
);
await approveProposal({
  kind: "ChangePolicyUpdateParameters",
  proposalId: changePolicyParametersProposalId,
});

// Transfer
let transferProposalId = Number.parseInt(
  Buffer.from(
    (
      await sandbox.account.functionCall({
        contractId: daoContract,
        methodName: "add_proposal",
        args: {
          proposal: {
            description:
              "* Title: Fellowship Contributor report by Matias Benary for  2024-09-09  2024-09-29 <br>* Summary: Fellowship Contributor report by Matias Benary for  2024-09-09  2024-09-29 <br>* Proposal Id: 215",
            kind: {
              Transfer: {
                amount: "0",
                receiver_id: "maguila.near",
                token_id: parseNearAmount("0.5"),
              },
            },
          },
        },
        attachedDeposit: "0",
        gas: 300000000000000,
      })
    ).status.SuccessValue,
    "base64",
  ).toString(),
);
await approveProposal({ kind: "Transfer", proposalId: transferProposalId });

await sandbox.quitSandbox();
