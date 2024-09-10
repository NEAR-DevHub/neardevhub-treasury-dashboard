NEAR DevHub trustees dashboard BOS components
==============================================

This is the repository of the BOS components for the NEAR DevHub trustees dashboard.

Please refer to [NEAR DevHub](https://github.com/NEAR-DevHub/neardevhub-bos/blob/main/CONTRIBUTING.md) for general contribution guidelines. Details specific for this repository will be added later.

# Web4 gateway

In the [web4](./web4) folder there is a setup for a web4 gateway. The [public_html](./web4/public_html/) contains the gateway static index.html file that is served on the web4 page, and there is also the [treasury-web4](./web4/treasury-web4/) that contains the web4 contract that is written in Rust.

## Local development

You can also locally develop the html page served by the web4 gateway. To run a local gateway, type the following:

```bash
npm run gateway:treasury
```

This will create a temporary folder for the static html file, and patch the [web4/public_html/index.html](./web4/public_html/index.html) file with an RPC setting pointing to the local api proxy. If you want to see changes to the html you have to restart the gateway.
