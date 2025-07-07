import { tokens, networks } from "@web3icons/common";
import { svgs } from "@web3icons/core";

export async function getWeb3IconMaps() {
  const tokenIconMap = {};
  const networkIconMap = {};
  const networkNames = {};

  const allTokens = (
    await fetch("https://api-mng-console.chaindefuser.com/api/tokens").then(
      (r) => r.json()
    )
  ).items;

  const supportedTokens = await fetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "supported_tokens",
      params: [{}],
    }),
  }).then((r) => r.json());

  for (const token of supportedTokens.result.tokens) {
    if (token.standard !== "nep141") {
      continue;
    }
    const blockchain = allTokens.find(
      (t) => t.defuse_asset_id === token.intents_token_id
    )?.blockchain;
    if (!blockchain) {
      console.log("skipping", token.intents_token_id);
      continue;
    }
    const defuse_asset_id_parts = token.defuse_asset_identifier.split(":");
    const layer1 = defuse_asset_id_parts[0];
    const layer2 = defuse_asset_id_parts[1];

    const web3IconToken = tokens.find(
      (web3IconToken) =>
        web3IconToken.symbol.toLowerCase() === token.asset_name.toLowerCase()
    );
    if (web3IconToken) {
      const web3IconNetwork =
        networks.find(
          (web3IconNetwork) => `${web3IconNetwork.chainId}` === layer2
        ) ||
        networks.find((web3IconNetwork) =>
          web3IconNetwork.id.startsWith(layer1)
        ) ||
        networks.find(
          (web3IconNetwork) => web3IconNetwork.id === web3IconToken.id
        );

      const tokenSvg = svgs.tokens.background[web3IconToken.fileName].default;

      const networkSvg = web3IconNetwork
        ? svgs.networks.background[web3IconNetwork.fileName].default
        : null;
      const networkName = web3IconNetwork
        ? web3IconNetwork.name
        : blockchain.toUpperCase();

      if (tokenSvg) {
        tokenIconMap[token.asset_name] = tokenSvg;
      }
      if (networkSvg) {
        networkIconMap[blockchain] = networkSvg;
      }
      if (networkName) {
        networkNames[blockchain] = networkName;
      }
    }
  }

  return { tokenIconMap, networkIconMap, networkNames };
}
