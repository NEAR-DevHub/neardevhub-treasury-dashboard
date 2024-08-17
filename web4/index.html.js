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
    <p class="nav-text text-light" style="margin-top: 1rem; margin-right: 1rem">Choose your gateway</p>
    <div class="navbar-nav gatewaylinks">
        <a href="https://near.org/devhub.near/widget/app" class="nav-link">
            <img src="https://ipfs.web4.near.page/ipfs/bafybeia2ptgyoz7b6oxu3k57jmiras2pgigmw7a3cp6osjog67rndmf36y/nearorg.svg" />
        </a>
        <a href="https://near.social/devhub.near/widget/app" class="nav-link">
            <img src="https://ipfs.web4.near.page/ipfs/bafybeia2ptgyoz7b6oxu3k57jmiras2pgigmw7a3cp6osjog67rndmf36y/nearsocial.svg" />
        </a>
    </div>
</nav>
    <near-social-viewer src="treasury-devdao.near/widget/app" initialProps='{"page":""}'></near-social-viewer>
</body>
</html>`;
