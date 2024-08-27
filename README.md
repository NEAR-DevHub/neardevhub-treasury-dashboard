NEAR DevHub trustees dashboard BOS components
==============================================

This is the repository of the BOS components for the NEAR DevHub trustees dashboard.

Please refer to [NEAR DevHub](https://github.com/NEAR-DevHub/neardevhub-bos/blob/main/CONTRIBUTING.md) for general contribution guidelines. Details specific for this repository will be added later.

# Web4 gateway

In the [web4](./web4) folder there is a setup for a web4 gateway. The contract is written in Javascript, in the file [web4/contract.js](./web4/contract.js). It is deployed to by calling the `post_javascript` to an account that has the [JSinRust minimum web4](https://github.com/petersalomonsen/quickjs-rust-near/tree/master/examples/minimumweb4) base contract deployed.

Before deploying you need to create the contract bundle that contains both the html to be served and the javascript code. This is done by typing the command:

```bash
npm run npm run web4:createdeployargs
```

After that you can call the `post_javascript` function like this using [near-cli-rs](https://github.com/near/near-cli-rs):

```bash
near contract call-function as-transaction $CONTRACT_ID post_javascript file-args args.json prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' sign-as $CONTRACT_ID network-config testnet sign-with-plaintext-private-key --signer-public-key $SIGNER_PUBLIC_KEY --signer-private-key $SIGNER_PRIVATE_KEY send
```

Remember to set the environment variables for `CONTRACT_ID`, `SIGNER_PUBLIC_KEY` and `SIGNER_PRIVATE_KEY`.

## Local development

You can also locally develop the html page served by the web4 gateway. To run a local gateway, type the following:

```bash
npm run gateway:treasury
```

This will create a temporary folder for the static html file, and patch the [web4/public_html/index.html](./web4/public_html/index.html) file with an RPC setting pointing to the local api proxy. If you want to see changes to the html you have to restart the gateway.
