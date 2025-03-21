import { readFile } from "fs/promises";

import http from "http";

const SOCIAL_CONTRACT = "social.near";

const RPCS = [
  "https://rpc.mainnet.fastnear.com/",
  "https://free.rpc.fastnear.com",
  "https://1rpc.io/near",
  "https://rpc.mainnet.near.org",
  "https://near.lava.build",
];

let rpcIndex = 0;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      req.body = JSON.parse(body);
      const { params } = req.body;

      const forwardToRealRPC = async () => {
        const MAX_RETRIES = RPCS.length;
        for (let n = 0; n < MAX_RETRIES; n++) {
          const nextRPC = RPCS[rpcIndex++ % RPCS.length];
          try {
            const proxyResponse = await fetch(nextRPC, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: body,
            });

            const proxyData = await proxyResponse.text();
            res.statusCode = proxyResponse.status;
            res.setHeader("Content-Type", "application/json");
            res.end(proxyData);
            break;
          } catch (error) {
            if (n === MAX_RETRIES - 1) {
              console.error("Error fetching from proxy:", error);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Internal Server Error" }));
            } else {
              console.warn(
                "Failed fetching from rpc",
                nextRPC,
                error.message,
                "trying next one"
              );
            }
          }
        }
      };

      if (
        params &&
        params.account_id === SOCIAL_CONTRACT &&
        params.method_name === "get"
      ) {
        const social_get_key = JSON.parse(atob(params.args_base64)).keys[0];

        const localWidgetFilename = `./build/instances/${social_get_key.replace(
          "/widget/",
          "/src/widget/"
        )}.jsx`;
        let widgetContent;
        try {
          widgetContent = await readFile(localWidgetFilename);
        } catch (e) {
          console.log(`Widget not found locally: ${localWidgetFilename}`);
          forwardToRealRPC();
          return;
        }

        const createNestedObject = (base, names, value) => {
          let lastName = names.pop();
          for (let i = 0; i < names.length; i++) {
            base = base[names[i]] = base[names[i]] || {};
          }
          base[lastName] = value;
          return base;
        };

        const keyParts = social_get_key.split("/");
        const resultObj = {};
        createNestedObject(resultObj, keyParts, widgetContent.toString());

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            result: {
              block_hash: "C4Mei8iX3Fda7s4Vwnh3iLtuAqNUBwCbBZioH6GaKUfR",
              block_height: 138766983,
              logs: [],
              result: Array.from(
                new TextEncoder().encode(JSON.stringify(resultObj))
              ),
            },
            id: "dontcare",
          })
        );
      } else {
        forwardToRealRPC();
      }
    });
  } else {
    res.statusCode = 200;
    res.end("");
  }
});

const PORT = process.env.PORT || 14500;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
