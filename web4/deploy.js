import nearApi from 'near-api-js';

import { createDeployArgs } from './createdeployargs.js';

// near contract call-function as-transaction $CONTRACT_ID post_javascript file-args web4/args.json prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as $CONTRACT_ID network-config testnet sign-with-plaintext-private-key --signer-public-key $SIGNER_PUBLIC_KEY --signer-private-key $SIGNER_PRIVATE_KEY send

const networkId = process.env.NEAR_NETWORK;
const contractId = process.env.NEAR_SOCIAL_ACCOUNT_ID;

const keyStore = new nearApi.keyStores.InMemoryKeyStore();
const keyPair = nearApi.KeyPair.fromString(process.env.SIGNER_PRIVATE_KEY);
await keyStore.setKey(networkId, contractId, keyPair);

const near = await nearApi.connect({
    networkId,
    nodeUrl: process.env.NEAR_RPC,
    keyStore
});
const args = await createDeployArgs();
const account = await near.account(contractId);
await account.functionCall({contractId, methodName: 'post_javascript', args});
