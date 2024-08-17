export default /* html */ `
<!DOCTYPE html>
<html>
<head>
    <title></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta property="og:url" content="devhub.near/widget/app" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="near/dev/hub" />
    <meta property="og:description" content="The decentralized home base for NEAR builders" />
    <meta property="og:image" content="https://i.near.social/magic/large/https://near.social/magic/img/account/devhub.near" />

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="near/dev/hub">
    <meta name="twitter:description" content="The decentralized home base for NEAR builders">
    <meta name="twitter:image" content="https://i.near.social/magic/large/https://near.social/magic/img/account/devhub.near">
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@near-wallet-selector/modal-ui-js@8.7.2/styles.css"
    />
    <script src="https://ipfs.web4.near.page/ipfs/bafybeic6aeztkdlthx5uwehltxmn5i6owm47b7b2jxbbpwmydv2mwxdfca/main.794b6347ae264789bc61.bundle.js"></script>
    <script src="https://ipfs.web4.near.page/ipfs/bafybeic6aeztkdlthx5uwehltxmn5i6owm47b7b2jxbbpwmydv2mwxdfca/runtime.25b143da327a5371509f.bundle.js"></script>
    <style>
        @media screen and (max-width: 600px) {
            .gatewaylinks .nav-link {
                padding-top: 0px!important;
                padding-bottom: 0px!important;
                margin: 0px;
            }
            .gatewaylinks img {
                height: 30px;
            }
        }
    </style>
</head>
<body>
<nav class="navbar navbar-expand-sm navbar-light bg-dark" style="display: flex; flex-wrap: nowrap; padding-left: 5px; padding-right: 5px; height: 73px; border-bottom: rgb(0, 236, 151) solid 5px;">
    <a class="navbar-brand" href="/"><img src="https://i.near.social/magic/large/https://near.social/magic/img/account/devhub.near" style="height: 68px" /></a>
    <p class="nav-text" style="flex-grow: 1"></p>
    
    <div class="navbar-nav gatewaylinks">
        <button id="open-walletselector-button" type="button" class="nav-button">
        Open wallet selector
      </button>
    </div>
</nav>
    <near-social-viewer src="treasury-devdao.near/widget/app" initialProps='{"page":""}'></near-social-viewer>
</body>
<script
    async
    src="https://ga.jspm.io/npm:es-module-shims@1.8.2/dist/es-module-shims.js"
    crossorigin="anonymous"
  ></script>
  <script type="importmap">
    {
      "imports": {
        "@near-wallet-selector/core": "https://ga.jspm.io/npm:@near-wallet-selector/core@8.9.1/index.js",
        "@near-wallet-selector/here-wallet": "https://ga.jspm.io/npm:@near-wallet-selector/here-wallet@8.9.1/index.js",
        "@near-wallet-selector/meteor-wallet": "https://ga.jspm.io/npm:@near-wallet-selector/meteor-wallet@8.9.1/index.js",
        "@near-wallet-selector/modal-ui-js": "https://ga.jspm.io/npm:@near-wallet-selector/modal-ui-js@8.9.1/index.js",
        "@near-wallet-selector/my-near-wallet": "https://ga.jspm.io/npm:@near-wallet-selector/my-near-wallet@8.9.1/index.js",
        "@near-wallet-selector/sender": "https://ga.jspm.io/npm:@near-wallet-selector/sender@8.9.1/index.js"
      },
      "scopes": {
        "https://ga.jspm.io/": {
          "@here-wallet/core": "https://ga.jspm.io/npm:@here-wallet/core@1.5.1/build/index.js",
          "@meteorwallet/sdk": "https://ga.jspm.io/npm:@meteorwallet/sdk@1.0.5/dist/meteor-sdk/src/index.js",
          "@near-js/accounts": "https://ga.jspm.io/npm:@near-js/accounts@0.1.4/lib/index.js",
          "@near-js/crypto": "https://ga.jspm.io/npm:@near-js/crypto@0.0.5/lib/index.js",
          "@near-js/keystores": "https://ga.jspm.io/npm:@near-js/keystores@0.0.5/lib/index.js",
          "@near-js/keystores-browser": "https://ga.jspm.io/npm:@near-js/keystores-browser@0.0.5/lib/index.js",
          "@near-js/providers": "https://ga.jspm.io/npm:@near-js/providers@0.0.7/lib/index.js",
          "@near-js/signers": "https://ga.jspm.io/npm:@near-js/signers@0.0.5/lib/index.js",
          "@near-js/transactions": "https://ga.jspm.io/npm:@near-js/transactions@0.2.1/lib/index.js",
          "@near-js/types": "https://ga.jspm.io/npm:@near-js/types@0.0.4/lib/index.js",
          "@near-js/utils": "https://ga.jspm.io/npm:@near-js/utils@0.0.4/lib/index.js",
          "@near-js/wallet-account": "https://ga.jspm.io/npm:@near-js/wallet-account@0.0.7/lib/index.js",
          "@near-wallet-selector/wallet-utils": "https://ga.jspm.io/npm:@near-wallet-selector/wallet-utils@8.9.1/index.js",
          "ajv": "https://ga.jspm.io/npm:ajv@8.12.0/dist/dev.ajv.js",
          "ajv-formats": "https://ga.jspm.io/npm:ajv-formats@2.1.1/dist/index.js",
          "ajv/dist/compile/codegen": "https://ga.jspm.io/npm:ajv@8.12.0/dist/compile/codegen/index.js",
          "base-x": "https://ga.jspm.io/npm:base-x@3.0.9/src/index.js",
          "bn.js": "https://ga.jspm.io/npm:bn.js@5.2.1/lib/bn.js",
          "borsh": "https://ga.jspm.io/npm:borsh@0.7.0/lib/index.js",
          "bs58": "https://ga.jspm.io/npm:bs58@4.0.1/index.js",
          "buffer": "https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/browser/buffer.js",
          "capability": "https://ga.jspm.io/npm:capability@0.2.5/index.js",
          "capability/es5": "https://ga.jspm.io/npm:capability@0.2.5/es5.js",
          "charenc": "https://ga.jspm.io/npm:charenc@0.0.2/charenc.js",
          "copy-to-clipboard": "https://ga.jspm.io/npm:copy-to-clipboard@3.3.3/index.js",
          "crypt": "https://ga.jspm.io/npm:crypt@0.0.2/crypt.js",
          "crypto": "https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/browser/crypto.js",
          "decode-uri-component": "https://ga.jspm.io/npm:decode-uri-component@0.2.2/index.js",
          "depd": "https://ga.jspm.io/npm:depd@2.0.0/lib/browser/index.js",
          "dijkstrajs": "https://ga.jspm.io/npm:dijkstrajs@1.0.3/dijkstra.js",
          "encode-utf8": "https://ga.jspm.io/npm:encode-utf8@1.0.3/index.js",
          "error-polyfill": "https://ga.jspm.io/npm:error-polyfill@0.1.3/index.js",
          "events": "https://ga.jspm.io/npm:events@3.3.0/events.js",
          "fast-deep-equal": "https://ga.jspm.io/npm:fast-deep-equal@3.1.3/index.js",
          "filter-obj": "https://ga.jspm.io/npm:filter-obj@1.1.0/index.js",
          "http": "https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/browser/http.js",
          "http-errors": "https://ga.jspm.io/npm:http-errors@1.8.1/index.js",
          "https": "https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/browser/https.js",
          "inherits": "https://ga.jspm.io/npm:inherits@2.0.4/inherits_browser.js",
          "is-mobile": "https://ga.jspm.io/npm:is-mobile@4.0.0/index.js",
          "js-sha256": "https://ga.jspm.io/npm:js-sha256@0.9.0/src/sha256.js",
          "json-schema-traverse": "https://ga.jspm.io/npm:json-schema-traverse@1.0.0/index.js",
          "mustache": "https://ga.jspm.io/npm:mustache@4.2.0/mustache.js",
          "nanoid": "https://ga.jspm.io/npm:nanoid@3.3.6/index.browser.js",
          "near-abi": "https://ga.jspm.io/npm:near-abi@0.1.1/lib/index.js",
          "near-api-js": "https://ga.jspm.io/npm:near-api-js@2.1.4/lib/browser-index.js",
          "near-api-js/lib/providers": "https://ga.jspm.io/npm:near-api-js@2.1.4/lib/providers/index.js",
          "near-api-js/lib/utils": "https://ga.jspm.io/npm:near-api-js@2.1.4/lib/utils/index.js",
          "near-api-js/lib/utils/key_pair": "https://ga.jspm.io/npm:near-api-js@2.1.4/lib/utils/key_pair.js",
          "near-api-js/lib/utils/serialize": "https://ga.jspm.io/npm:near-api-js@2.1.4/lib/utils/serialize.js",
          "node-fetch": "https://ga.jspm.io/npm:node-fetch@2.7.0/browser.js",
          "o3": "https://ga.jspm.io/npm:o3@1.0.3/index.js",
          "process": "https://ga.jspm.io/npm:@jspm/core@2.0.1/nodelibs/browser/process.js",
          "qrcode": "https://ga.jspm.io/npm:qrcode@1.5.3/lib/browser.js",
          "query-string": "https://ga.jspm.io/npm:query-string@7.1.3/index.js",
          "rxjs": "https://ga.jspm.io/npm:rxjs@7.8.1/dist/esm5/index.js",
          "safe-buffer": "https://ga.jspm.io/npm:safe-buffer@5.2.1/index.js",
          "setprototypeof": "https://ga.jspm.io/npm:setprototypeof@1.2.0/index.js",
          "sha1": "https://ga.jspm.io/npm:sha1@1.1.1/sha1.js",
          "split-on-first": "https://ga.jspm.io/npm:split-on-first@1.1.0/index.js",
          "statuses": "https://ga.jspm.io/npm:statuses@1.5.0/dev.index.js",
          "strict-uri-encode": "https://ga.jspm.io/npm:strict-uri-encode@2.0.0/index.js",
          "text-encoding-utf-8": "https://ga.jspm.io/npm:text-encoding-utf-8@1.0.2/lib/encoding.lib.js",
          "toggle-selection": "https://ga.jspm.io/npm:toggle-selection@1.0.6/index.js",
          "toidentifier": "https://ga.jspm.io/npm:toidentifier@1.0.1/index.js",
          "tslib": "https://ga.jspm.io/npm:tslib@2.6.2/tslib.es6.mjs",
          "tweetnacl": "https://ga.jspm.io/npm:tweetnacl@1.0.3/nacl-fast.js",
          "u3": "https://ga.jspm.io/npm:u3@0.1.1/index.js",
          "uri-js": "https://ga.jspm.io/npm:uri-js@4.4.1/dist/es5/uri.all.js",
          "uuid4": "https://ga.jspm.io/npm:uuid4@2.0.3/browser.mjs"
        },
        "https://ga.jspm.io/npm:http-errors@1.8.1/": {
          "depd": "https://ga.jspm.io/npm:depd@1.1.2/lib/browser/index.js"
        }
      }
    }
  </script>
  <script type="module">
    import { setupWalletSelector } from "@near-wallet-selector/core";
    import { setupModal } from "@near-wallet-selector/modal-ui-js";
    import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
    import { setupHereWallet } from "@near-wallet-selector/here-wallet";
    import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
    import { setupSender } from "@near-wallet-selector/sender";

    const selector = await setupWalletSelector({
    network: "mainnet",
    modules: [setupMyNearWallet(), setupHereWallet(), setupMeteorWallet(), setupSender()],
    });

    const modal = setupModal(selector, {
        contractId: "social.near",
    });

    document.getElementById('open-walletselector-button').addEventListener('click', () => modal.show());

    const viewer = document.querySelector('near-social-viewer');
    viewer.selector = selector;
  </script>
</html>`;