import { test, expect } from "@playwright/test";
import { SandboxRPC } from "../../util/sandboxrpc";
import { getLocalWidgetSource } from "../../util/bos-workspace";
import nearApi from "near-api-js";

async function approveProposal({ daoContract, sandbox, proposalId }) {
  // Check if the proposalId is a valid number
  expect(Number(proposalId)).not.toBeNaN();
  const result = await sandbox.account.functionCall({
    contractId: daoContract,
    methodName: "act_proposal",
    args: {
      id: proposalId,
      action: "VoteApprove",
    },
    gas: 300000000000000,
  });
  // there shouldn't be any error in proposal execution
  expect(
    result.receipts_outcome.filter(
      (receipt_outcome) => receipt_outcome.outcome.status.Failure,
    ).length,
  ).toBe(0);
}

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

test("should be able to create a treasury instance with sandbox, and create/execute all types of proposals", async () => {
  test.setTimeout(200_000);
  const sandbox = new SandboxRPC();
  await sandbox.init();

  const widget_reference_account_id = "treasury-testing.near";

  await sandbox.setupWidgetReferenceAccount(widget_reference_account_id);

  const instance_name = "test-factory-created-instance";
  const oneRequiredVote = {
    weight_kind: "RoleWeight",
    quorum: "0",
    threshold: "1",
  };

  const policy = {
    roles: [
      {
        kind: {
          Group: [sandbox.account.accountId],
        },
        name: "Requestor",
        permissions: [
          "call:AddProposal",
          "transfer:VoteRemove",
          "transfer:AddProposal",
          "call:VoteRemove",
        ],
        vote_policy: {
          transfer: oneRequiredVote,
          call: oneRequiredVote,
        },
      },
      {
        kind: {
          Group: [sandbox.account.accountId],
        },
        name: "Admin",
        permissions: [
          "config:*",
          "policy_update_parameters:*",
          "add_bounty:*",
          "remove_member_from_role:*",
          "upgrade_self:*",
          "policy_remove_role:*",
          "set_vote_token:*",
          "upgrade_remote:*",
          "bounty_done:*",
          "add_member_to_role:*",
          "factory_info_update:*",
          "policy:*",
          "policy_add_or_update_role:*",
          "policy_update_default_vote_policy:*",
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
          Group: [sandbox.account.accountId],
        },
        name: "Approver",
        permissions: [
          "transfer:VoteApprove",
          "call:VoteApprove",
          "transfer:RemoveProposal",
          "call:VoteReject",
          "transfer:VoteReject",
          "transfer:Finalize",
          "call:Finalize",
          "call:RemoveProposal",
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
    proposal_bond: "0",
    proposal_period: "604800000000000",
    bounty_bond: "100000000000000000000000",
    bounty_forgiveness_period: "604800000000000",
  };
  const create_dao_args = {
    config: {
      name: instance_name,
      purpose: "creating dao treasury",
      metadata: "",
    },
    policy: policy,
  };

  const createInstanceResult = await sandbox.account.functionCall({
    contractId: "treasury-factory.near",
    methodName: "create_instance",
    args: {
      sputnik_dao_factory_account_id: "sputnik-dao.near",
      social_db_account_id: "social.near",
      widget_reference_account_id: widget_reference_account_id,
      name: instance_name,
      create_dao_args: Buffer.from(JSON.stringify(create_dao_args)).toString(
        "base64",
      ),
    },
    gas: 300000000000000,
    attachedDeposit: nearApi.utils.format.parseNearAmount("9"),
  });

  expect(
    createInstanceResult.receipts_outcome.filter(
      (receipt_outcome) => receipt_outcome.outcome.status.Failure,
    ).length,
  ).toBe(0);

  const preload_content = {};
  preload_content[`${instance_name}.near`] = {
    widget: {
      app: {
        metadata: {
          description: "test description",
          image: {
            ipfs_cid:
              "bafkreido4srg4aj7l7yg2tz22nbu3ytdidjczdvottfr5ek6gqorwg6v74",
          },
          name: "test title",
          tags: {
            devhub: "",
            communities: "",
            "developer-governance": "",
            app: "",
          },
        },
      },
    },
  };

  const preloads = {};
  preloads[
    `/web4/contract/social.near/get?keys.json=%5B%22${instance_name}.near/widget/app/metadata/**%22%5D`
  ] = {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(preload_content)).toString("base64"),
  };

  const web4GetResult = await sandbox.account.viewFunction({
    contractId: `${instance_name}.near`,
    methodName: "web4_get",
    args: {
      request: { path: "/", preloads },
    },
  });

  expect(
    Buffer.from(web4GetResult.body, "base64")
      .toString()
      .substring(0, "<!DOCTYPE html>".length),
  ).toEqual("<!DOCTYPE html>");

  const daoGetPolicyResult = await sandbox.account.viewFunction({
    contractId: `${instance_name}.sputnik-dao.near`,
    methodName: "get_policy",
    args: {},
  });
  expect(daoGetPolicyResult).toEqual(create_dao_args.policy);

  const referenceWidgetSources = await getLocalWidgetSource(
    widget_reference_account_id + "/widget/**",
  );

  const socialGetResult = await sandbox.account.viewFunction({
    contractId: "social.near",
    methodName: "get",
    args: {
      keys: [`${instance_name}.near/widget/**`],
    },
  });

  expect(JSON.stringify(socialGetResult)).toEqual(
    JSON.stringify(referenceWidgetSources).replaceAll(
      widget_reference_account_id,
      instance_name + ".near",
    ),
  );
  const daoContract = `${instance_name}.sputnik-dao.near`;
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
    sandbox,
    daoContract,
    proposalId: changeConfigProposalId,
  });

  // ChangePolicy
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
                  policy: policy,
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
    sandbox,
    daoContract,
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
                    proposal_period:
                      (60 * 60 * 24 * 10).toString() + "000000000",
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
    sandbox,
    daoContract,
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
                  amount: nearApi.utils.format.parseNearAmount("0.5"),
                  receiver_id: daoContract,
                  token_id: "",
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
    sandbox,
    daoContract,
    proposalId: transferProposalId,
  });

  await sandbox.quitSandbox();
});
