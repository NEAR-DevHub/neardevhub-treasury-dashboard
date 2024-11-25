import { exec } from 'child_process';
import { connect, utils, keyStores } from 'near-api-js';
import { SandboxRPC } from '../playwright-tests/util/sandboxrpc.js';

const sandbox = new SandboxRPC();
await sandbox.init();

await sandbox.setupSandboxForSputnikDao('testdao');

const daopolicy = await sandbox.account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_policy', args: {}});

const updateParametersResult = await sandbox.account.functionCall({
    contractId: 'testdao.sputnik-dao.near', methodName: 'add_proposal', args: {
        proposal: {
            description: "Change proposal period",
            kind: {
                ChangePolicyUpdateParameters: {
                    parameters: {
                        proposal_period: (1_000_000_000n * 3n ).toString(),
                    }
                }
            }
        }
    },
    attachedDeposit: "100000000000000000000000"
});

let proposals = await sandbox.account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_proposals', args: {
    from_index: 0,
    limit: 10
}});

await sandbox.account.functionCall({
    contractId: 'testdao.sputnik-dao.near', methodName: 'act_proposal', args: {
        id: 0,
        action: "VoteApprove"
    }
});

proposals = await sandbox.account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_proposals', args: {
    from_index: 0,
    limit: 10
}});

await sandbox.account.functionCall({
    contractId: 'testdao.sputnik-dao.near', methodName: 'add_proposal', args: {
        proposal: {
            description: "Change proposal period",
            kind: {
                ChangePolicyUpdateParameters: {
                    parameters: {
                        proposal_period: (1_000_000_000n * 60n * 60n ).toString(),
                    }
                }
            }
        }
    },
    attachedDeposit: "100000000000000000000000"
});


console.log('wait 10 seconds to ensure that proposal is expired');
await new Promise(resolve => setTimeout(() => resolve(), 10_000));

proposals = await sandbox.account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_proposals', args: {
    from_index: 0,
    limit: 10
}});
console.log('Proposal 1 should be in progress, even though time has expired', proposals[1].status);


await sandbox.account.functionCall({
    contractId: 'testdao.sputnik-dao.near', methodName: 'act_proposal', args: {
        id: 1,
        action: "VoteApprove"
    }
});

proposals = await sandbox.account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_proposals', args: {
    from_index: 0,
    limit: 10
}});

console.log('After voting Proposal 1 should be expired, since time has expired', proposals[1].status);

await sandbox.account.functionCall({
    contractId: 'testdao.sputnik-dao.near', methodName: 'add_proposal', args: {
        proposal: {
            description: "Change proposal period",
            kind: {
                ChangePolicyUpdateParameters: {
                    parameters: {
                        proposal_period: (1_000_000_000n * 60n * 60n * 24n ).toString(),
                    }
                }
            }
        }
    },
    attachedDeposit: "100000000000000000000000"
});

await sandbox.account.functionCall({
    contractId: 'testdao.sputnik-dao.near', methodName: 'act_proposal', args: {
        id: 2,
        action: "VoteApprove"
    }
});

proposals = await sandbox.account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_proposals', args: {
    from_index: 0,
    limit: 10
}});

console.log('After voting Proposal 2 should be approved', proposals[2].status);

console.log('Try approving proposal 1 which was previously expired');
try {
    await sandbox.account.functionCall({
        contractId: 'testdao.sputnik-dao.near', methodName: 'act_proposal', args: {
            id: 1,
            action: "VoteApprove"
        }
    });
} catch(e) {
    console.log('should not be able to vote on an expired proposal', e);
}
console.log(JSON.stringify(proposals, null, 1));
await sandbox.quitSandbox();
