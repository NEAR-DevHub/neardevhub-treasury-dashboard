import { test, expect } from '@playwright/test';
import { SandboxRPC } from '../../util/sandboxrpc';
import { getLocalWidgetSource } from '../../util/bos-workspace';
import nearApi from 'near-api-js';

test("should be able to create a treasury instance with sandbox", async () => {
    const sandbox = new SandboxRPC();
    await sandbox.init();

    const widget_reference_account_id = 'treasury-testing.near';

    await sandbox.setupWidgetReferenceAccount(widget_reference_account_id);

    const instance_name = "test-factory-created-instance";
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
        contractId: "treasury-factory.near", methodName: 'create_instance', args: {
            "sputnik_dao_factory_account_id": "sputnik-dao.near",
            "social_db_account_id": "social.near",
            "widget_reference_account_id": widget_reference_account_id,
            "name": instance_name,
            "create_dao_args": Buffer.from(JSON.stringify(create_dao_args)).toString('base64')
        },
        gas: 300000000000000,
        attachedDeposit: nearApi.utils.format.parseNearAmount("9")
    });
    
    expect(
        createInstanceResult.receipts_outcome.filter(receipt_outcome => receipt_outcome.outcome.status.Failure).length
    ).toBe(0);
    
    const web4GetResult = await sandbox.account.viewFunction({ contractId: `${instance_name}.near`, methodName: 'web4_get', args: { request: { path: "/" } } });
    expect(Buffer.from(web4GetResult.body, 'base64').toString().substring(0, "<!doctype html>".length)).toEqual("<!doctype html>");

    const daoGetPolicyResult = await sandbox.account.viewFunction({contractId: `${instance_name}.sputnik-dao.near`, methodName: 'get_policy', args: {}});
    expect(daoGetPolicyResult).toEqual(create_dao_args.policy);

    const referenceWidgetSources = await getLocalWidgetSource(widget_reference_account_id + "/widget/**");
    
    const socialGetResult = await sandbox.account.viewFunction({contractId: 'social.near', methodName: 'get', args: {
        "keys": [`${instance_name}.near/widget/**`]
    }});

    expect(JSON.stringify(socialGetResult)).toEqual(JSON.stringify(referenceWidgetSources).replaceAll(widget_reference_account_id, instance_name+".near"));

    await sandbox.quitSandbox();
});