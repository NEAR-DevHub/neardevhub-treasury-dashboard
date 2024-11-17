import { exec } from 'child_process';
import { connect, utils, keyStores } from 'near-api-js';
import { SandboxRPC } from '../playwright-tests/util/sandboxrpc.js';

const sandbox = new SandboxRPC();
await sandbox.init();

await sandbox.setupSandboxForSputnikDao('testdao');


const daopolicy = await sandbox.account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_policy', args: {}});
console.log(JSON.stringify(daopolicy));

const updateParametersResult = await sandbox.account.functionCall({
    contractId: 'testdao.sputnik-dao.near', methodName: 'add_proposal', args: {
        proposal: {
            description: "Change proposal period",
            kind: {
                ChangePolicyUpdateParameters: {
                    parameters: {
                        proposal_period: (1_000_000_000n * 60n * 60n * 24n * 8n).toString(),
                    }
                }
            }
        }
    },
    attachedDeposit: "100000000000000000000000"
});
console.log(updateParametersResult);

const proposals = await sandbox.account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_proposals', args: {
    from_index: 0,
    limit: 10
}});
console.log(JSON.stringify(proposals));


await sandbox.quitSandbox();
