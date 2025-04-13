export function createDAOargs({ instanceName, adminAccountId }) {
  const oneRequiredVote = {
    weight_kind: "RoleWeight",
    quorum: "0",
    threshold: "1",
  };

  const policy = {
    roles: [
      {
        kind: {
          Group: [adminAccountId],
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
          Group: [adminAccountId],
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
          Group: [adminAccountId],
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
      name: instanceName,
      purpose: "creating dao treasury",
      metadata: "",
    },
    policy: policy,
  };
  return create_dao_args;
}
