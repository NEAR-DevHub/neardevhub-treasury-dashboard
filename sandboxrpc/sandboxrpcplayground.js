import { exec } from 'child_process';
import { connect, utils, keyStores } from 'near-api-js';

const { rpc_url, account_id, secret_key } = await new Promise(resolve => {
    const sandbox = exec('cargo run', (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error}`);
            return;
        }

        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }

        // Process the output to find the RPC address
        const rpcAddressMatch = stdout.match(/RPC\s(.+)/);
        if (rpcAddressMatch) {
            const rpcAddress = rpcAddressMatch[1].trim();
            console.log(`Captured RPC Address: ${rpcAddress}`);
        } else {
            console.log('RPC Address not found in output.');
        }
    });

    sandbox.stdout.on('data', (/** @type String */data) => {
        try {
            resolve(JSON.parse(data));
        } catch (e) {
            console.log('unable to parse as JSON', data);
        }
    });

    sandbox.stderr.on('data', (data) => {
        // console.error(`Error output: ${data}`);
    });
});
console.log(rpc_url);
const keyStore = new keyStores.InMemoryKeyStore();
keyStore.setKey('sandbox', account_id, utils.KeyPair.fromString(secret_key));

const near = await connect({
    networkId: 'sandbox',
    nodeUrl: rpc_url,
    keyStore
});

const account = await near.account(account_id);

const createDaoConfig = {
    config: {
        name: "created-dao-name",
        purpose: "creating dao treasury",
        metadata: "",
    },
    policy: {
        roles: [
            {
                kind: {
                    Group: ["acc1.near", "acc2.near", "acc3.near"],
                },
                name: "Create Requests",
                permissions: [
                    "call:AddProposal",
                    "transfer:AddProposal",
                    "config:Finalize",
                ],
                vote_policy: {},
            },
            {
                kind: {
                    Group: ["acc1.near"],
                },
                name: "Manage Members",
                permissions: [
                    "config:*",
                    "policy:*",
                    "add_member_to_role:*",
                    "remove_member_from_role:*",
                ],
                vote_policy: {},
            },
            {
                kind: {
                    Group: ["acc1.near", "acc2.near"],
                },
                name: "Vote",
                permissions: ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
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


const result = await account.functionCall({
    contractId: 'sputnik-dao.near', methodName: 'create', args: {
        name: 'testdao',
        args: Buffer.from(JSON.stringify(createDaoConfig)).toString('base64')
    }, gas: 300000000000000,
    attachedDeposit: utils.format.parseNearAmount('6')
});
console.log(result);

const daoconfig = await account.viewFunction({contractId: 'testdao.sputnik-dao.near', methodName: 'get_config', args: {}});
console.log(daoconfig);

process.exit(0);
