import { KeyPairEd25519 } from 'near-api-js/lib/utils/key_pair.js';
import { SandboxRPC } from '../../playwright-tests/util/sandboxrpc.js';
import { parseNearAmount } from 'near-api-js/lib/utils/format.js';

const sandbox = new SandboxRPC();
await sandbox.init();

const treasuryFactoryContractId = 'treasury-factory.near';
const instance_name = "test-treasury-instance";

const reference_widget_account_id = "treasury-testing.near";

const widgetReferenceAccountKeyPair = KeyPairEd25519.fromRandom();
await sandbox.keyStore.setKey('sandbox', reference_widget_account_id, widgetReferenceAccountKeyPair);

await sandbox.account.functionCall({
    contractId: "near", methodName: 'create_account', args: {
        new_account_id: reference_widget_account_id,
        new_public_key: widgetReferenceAccountKeyPair.getPublicKey().toString()
    },
    gas: 300000000000000,
    attachedDeposit: parseNearAmount("2")
});

const reference_widget_account = await sandbox.near.account(reference_widget_account_id);
await reference_widget_account.functionCall({
    contractId: "social.near", methodName: "set", args: {
        "data": {
            "treasury-testing.near": {
                "widget": {
                    "app": "Hello",
                    "config": "Goodbye"
                }
            }
        }
    }, attachedDeposit: parseNearAmount('1')
});

const create_dao_args = {
    "config": {
        "name": instance_name,
        "purpose": "creating dao treasury",
        "metadata": "",
    },
    "policy": {
        "roles": [
            {
                "kind": {
                    "Group": ["acc3.near", "acc2.near", "acc1.near"],
                },
                "name": "Create Requests",
                "permissions": [
                    "call:AddProposal",
                    "transfer:AddProposal",
                ],
                "vote_policy": {},
            },
            {
                "kind": {
                    "Group": ["acc1.near"],
                },
                "name": "Manage Members",
                "permissions": [
                    "config:*",
                    "policy:*",
                    "add_member_to_role:*",
                    "remove_member_from_role:*",
                ],
                "vote_policy": {},
            },
            {
                "kind": {
                    "Group": ["acc1.near", "acc2.near"],
                },
                "name": "Vote",
                "permissions": ["*:VoteReject", "*:VoteApprove", "*:VoteRemove", "*:RemoveProposal", "*:Finalize"],
                "vote_policy": {},
            },
        ],
        "default_vote_policy": {
            "weight_kind": "RoleWeight",
            "quorum": "0",
            "threshold": [1, 2],
        },
        "proposal_bond": "100000000000000000000000",
        "proposal_period": "604800000000000",
        "bounty_bond": "100000000000000000000000",
        "bounty_forgiveness_period": "604800000000000",
    },
};

const createInstanceResult = await sandbox.account.functionCall({
    contractId: treasuryFactoryContractId, methodName: 'create_instance', args: {
        "sputnik_dao_factory_account_id": "sputnik-dao.near",
        "social_db_account_id": "social.near",
        "widget_reference_account_id": reference_widget_account_id,
        "name": instance_name,
        "create_dao_args": Buffer.from(JSON.stringify(create_dao_args)).toString('base64')
    },
    gas: 300000000000000,
    attachedDeposit: parseNearAmount("12")
});

console.log('All receipts should have a successvalue. The list below of failed receipts should be empty');
console.log(createInstanceResult.receipts_outcome.filter(receipt_outcome => receipt_outcome.outcome.status.Failure)
    .map(receipt_outcome => JSON.stringify(receipt_outcome)));

console.log(`Calling the web4_get of the new instance account ${instance_name}.near. You should see the web page html contents`);

const web4GetResult = await sandbox.account.viewFunction({ contractId: `${instance_name}.near`, methodName: 'web4_get', args: { request: { path: "/" } } });
console.log(Buffer.from(web4GetResult.body, 'base64').toString().substring(0, 200) + '.... and there is more, but too long to show here');

console.log(`Calling get_policy of the newly created dao ${instance_name}.sputnik-dao.near. You should see the policy`);
const daoGetPolicyResult = await sandbox.account.viewFunction({contractId: `${instance_name}.sputnik-dao.near`, methodName: 'get_policy', args: {}});
console.log(daoGetPolicyResult);

console.log(`Calling socialdb get to see the deployed widgets for the newly created instance. You should see the same contents of the reference widget.`);
const socialGetResult = await sandbox.account.viewFunction({contractId: 'social.near', methodName: 'get', args: {
    "keys": [`${instance_name}.near/widget/**`]
}});
console.log(socialGetResult);
await sandbox.quitSandbox();
