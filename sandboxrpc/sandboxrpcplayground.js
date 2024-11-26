import { exec } from 'child_process';
import { connect, utils, keyStores } from 'near-api-js';
import { SandboxRPC } from '../playwright-tests/util/sandboxrpc.js';
import { parseNearAmount } from 'near-api-js/lib/utils/format.js';

const sandbox = new SandboxRPC();
await sandbox.init();

const daoName = 'testdao';
const daoContract = 'testdao.sputnik-dao.near';
await sandbox.setupSandboxForSputnikDao(daoName);
const lockupContractId = await sandbox.setupLockupContract(daoContract);

console.log('LOCKUP contract id', lockupContractId);

// -------- Select staking pool
let proposalId = Number.parseInt(Buffer.from((await sandbox.account.functionCall({
    contractId: daoContract, methodName: 'add_proposal', args: {
        "proposal": {
          "description": "Select staking pool",
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
    },
    gas: 300000000000000
});


// -------- Deposit and stake
proposalId = Number.parseInt(Buffer.from((await sandbox.account.functionCall({
  contractId: daoContract, methodName: 'add_proposal', args: {
      "proposal": {
        "description": "Deposit and stake",
        "kind": {
          "FunctionCall": {
            "receiver_id": lockupContractId,
            "actions": [
              {
                "method_name": "deposit_and_stake",
                "args": Buffer.from(JSON.stringify({"amount":parseNearAmount("1")})).toString('base64'),
                "deposit": "0",
                "gas": "100000000000000"
              }
            ]
          }
        }
      }
    },
  attachedDeposit: "100000000000000000000000",
  gas: 300000000000000n,
})).status.SuccessValue, 'base64').toString());

await sandbox.account.functionCall({
  contractId: daoContract, methodName: 'act_proposal', args: {
      id: proposalId,
      action: "VoteApprove"
  },
  gas: 300000000000000n
});

await sandbox.quitSandbox();