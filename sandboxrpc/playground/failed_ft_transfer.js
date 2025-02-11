import { KeyPairEd25519 } from "near-api-js/lib/utils/key_pair.js";
import { SandboxRPC } from "../../playwright-tests/util/sandboxrpc.js";
import { parseNearAmount } from "near-api-js/lib/utils/format.js";

const sandbox = new SandboxRPC();
await sandbox.init();

const treasuryFactoryContractId = "treasury-factory.near";
const instance_name = "test-treasury-instance";

const reference_widget_account_id = "treasury-testing.near";

const widgetReferenceAccountKeyPair = KeyPairEd25519.fromRandom();
await sandbox.keyStore.setKey(
  "sandbox",
  reference_widget_account_id,
  widgetReferenceAccountKeyPair,
);

await sandbox.account.functionCall({
  contractId: "near",
  methodName: "create_account",
  args: {
    new_account_id: reference_widget_account_id,
    new_public_key: widgetReferenceAccountKeyPair.getPublicKey().toString(),
  },
  gas: 300000000000000,
  attachedDeposit: parseNearAmount("2"),
});

const reference_widget_account = await sandbox.near.account(
  reference_widget_account_id,
);
await reference_widget_account.functionCall({
  contractId: "social.near",
  methodName: "set",
  args: {
    data: {
      "treasury-testing.near": {
        widget: {
          app: "Hello",
          config: "Goodbye",
        },
      },
    },
  },
  attachedDeposit: parseNearAmount("1"),
});

const create_dao_args = {
  config: {
    name: instance_name,
    purpose: "creating dao treasury",
    metadata: "",
  },
  policy: {
    roles: [
      {
        kind: {
          Group: [sandbox.account_id],
        },
        name: "Requestor",
        permissions: [
          "call:AddProposal",
          "transfer:AddProposal",
          "call:VoteRemove",
          "transfer:VoteRemove",
        ],
        vote_policy: {
          transfer: {
            weight_kind: "RoleWeight",
            quorum: "0",
            threshold: "1",
          },
          call: {
            weight_kind: "RoleWeight",
            quorum: "0",
            threshold: "1",
          },
        },
      },
      {
        kind: {
          Group: [sandbox.account_id],
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
        vote_policy: {},
      },
      {
        kind: {
          Group: [sandbox.account_id],
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

await sandbox.account.functionCall({
  contractId: treasuryFactoryContractId,
  methodName: "create_instance",
  args: {
    sputnik_dao_factory_account_id: "sputnik-dao.near",
    social_db_account_id: "social.near",
    widget_reference_account_id: reference_widget_account_id,
    name: instance_name,
    create_dao_args: Buffer.from(JSON.stringify(create_dao_args)).toString(
      "base64",
    ),
  },
  gas: 300000000000000,
  attachedDeposit: parseNearAmount("9"),
});

const daoContractId = `${instance_name}.sputnik-dao.near`;

console.log("register dao contract");
await sandbox.account.functionCall({
  contractId: "itlx_2.intellex_agents_owner_1.near",
  methodName: "storage_deposit",
  attachedDeposit: parseNearAmount("0.1"),
  args: {
    account_id: daoContractId,
  },
});

console.log("transfer to dao");
await sandbox.account.functionCall({
  contractId: "itlx_2.intellex_agents_owner_1.near",
  methodName: "ft_transfer",
  attachedDeposit: "1",
  args: {
    amount: "2000000000000000000000000000",
    receiver_id: daoContractId,
  },
});
console.log("add the proposal");
await sandbox.account.functionCall({
  contractId: daoContractId,
  methodName: "add_proposal",
  gas: 300000000000000,
  attachedDeposit: "100000000000000000000000",
  args: {
    proposal: {
      description:
        "* Title: Send itlx_2 test tokens <br>* Summary: Send tokens testing multisig",
      kind: {
        Transfer: {
          token_id: "itlx_2.intellex_agents_owner_1.near",
          receiver_id:
            "f78e6f670ba196e2d270c089fb921ddf17ad0e204f5c63375eb27b07c67330be",
          amount: "1000000000000000000000000000",
        },
      },
    },
  },
});
console.log("register receiver");
await sandbox.account.functionCall({
  contractId: "itlx_2.intellex_agents_owner_1.near",
  methodName: "storage_deposit",
  attachedDeposit: parseNearAmount("0.1"),
  args: {
    account_id:
      "f78e6f670ba196e2d270c089fb921ddf17ad0e204f5c63375eb27b07c67330be",
  },
});

console.log("act on the proposal");
const result = await sandbox.account.functionCall({
  contractId: daoContractId,
  methodName: "act_proposal",
  gas: 300000000000000,
  args: {
    id: 0,
    action: "VoteApprove",
  },
});

console.log(JSON.stringify(result));
await sandbox.quitSandbox();
