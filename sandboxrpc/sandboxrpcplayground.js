import { exec } from 'child_process';
import { connect, utils, keyStores } from 'near-api-js';
import { SandboxRPC } from '../playwright-tests/util/sandboxrpc.js';

const sandbox = new SandboxRPC();
await sandbox.init();

const daoName = 'testdao';
const daoContract = 'testdao.sputnik-dao.near';
await sandbox.setupSandboxForSputnikDao(daoName);
const lockupContractId = await sandbox.setupLockupContract(daoContract);

console.log('LOCKUP contract id', lockupContractId);
let proposalId = Number.parseInt(Buffer.from((await sandbox.account.functionCall({
    contractId: daoContract, methodName: 'add_proposal', args: {
        "proposal": {
          "description": "{}",
          "kind": {
            "FunctionCall": {
              "receiver_id": lockupContractId,
              "actions": [
                {
                  "method_name": "select_staking_pool",
                  "args": Buffer.from(JSON.stringify({"staking_pool_account_id":"astro-stakers.poolv1.near"})).toString('base64'),
                  "deposit": "0",
                  "gas": "100000000000000"
                }
              ]
            }
          }
        }
      },
    attachedDeposit: "100000000000000000000000",
    gas: 300000000000000,
})).status.SuccessValue, 'base64').toString());

await sandbox.account.functionCall({
    contractId: daoContract, methodName: 'act_proposal', args: {
        id: proposalId,
        action: "VoteApprove"
    }
});
