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
                        "Group": [sandbox.account.accountId],
                    },
                    "name": "Create Requests",
                    "permissions": [
                        "*:AddProposal",
                        "config:Finalize",
                    ],
                    "vote_policy": {},
                },
                {
                    "kind": {
                        "Group": [sandbox.account.accountId],
                    },
                    "name": "Manage Members",
                    "permissions": [
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
                    "vote_policy": {},
                },
                {
                    "kind": {
                        "Group": [sandbox.account.accountId],
                    },
                    "name": "Vote",
                    "permissions": ["*:VoteReject", "*:VoteApprove", "*:RemoveProposal", "*:VoteRemove","*:Finalize"],
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

    // check permissions to to add a voting duration change proposal

    const addVotingDurationChangeResult = await sandbox.account.functionCall({
        contractId: `${instance_name}.sputnik-dao.near`, methodName: 'add_proposal', args: {
            proposal:
            {
            description: "test",
            kind: {
              ChangePolicyUpdateParameters: {
                parameters: {
                  proposal_period:
                    (60 * 60 * 24 * 20).toString() + "000000000",
                },
              },
            },
            }
          },
        gas: 300000000000000,
        attachedDeposit: nearApi.utils.format.parseNearAmount("0.1")
    });

    expect(
        addVotingDurationChangeResult.receipts_outcome.filter(receipt_outcome => receipt_outcome.outcome.status.Failure).length
    ).toBe(0);
    
    await sandbox.quitSandbox();
});