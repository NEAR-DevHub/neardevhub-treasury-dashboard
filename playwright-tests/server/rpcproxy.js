import { readFile } from "fs/promises";

import http from "http";

const SOCIAL_CONTRACT = "social.near";

const RPCS = [
  "https://1rpc.io/near",
  "https://rpc.mainnet.fastnear.com/",
  "https://free.rpc.fastnear.com",
  "https://near.lava.build",
  "https://near.blockpi.network/v1/rpc/public",
];

let rpcIndex = 0;

// Request queue to handle one request at a time
const requestQueue = [];
let isProcessing = false;

// Cache for identical POST bodies (1 second TTL)
const requestCache = new Map();
const CACHE_TTL = 1000; // 1 second

// Blacklist for nodes returning 429 (rate limited)
const blacklistedNodes = new Map();
const BLACKLIST_DURATION = 30000; // 30 seconds blacklist duration

// Helper to check if a node is blacklisted
function isNodeBlacklisted(nodeUrl) {
  const blacklistEntry = blacklistedNodes.get(nodeUrl);
  if (!blacklistEntry) return false;

  const now = Date.now();
  if (now > blacklistEntry.until) {
    // Blacklist period expired, remove from blacklist
    blacklistedNodes.delete(nodeUrl);
    console.log(`Node ${nodeUrl} removed from blacklist`);
    return false;
  }

  return true;
}

// Helper to blacklist a node
function blacklistNode(nodeUrl, duration = BLACKLIST_DURATION) {
  const until = Date.now() + duration;
  blacklistedNodes.set(nodeUrl, { until });
  console.log(
    `Node ${nodeUrl} blacklisted until ${new Date(until).toISOString()}`
  );
}

// Helper to create cache key from request body
function getCacheKey(body) {
  return body; // Using the raw body string as key since it's already stringified
}

// Helper to clean expired cache entries
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now > value.expiry) {
      requestCache.delete(key);
    }
  }
}

// Process queue function
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (requestQueue.length > 0) {
    const { body, req, res, callback } = requestQueue.shift();
    await callback(body, req, res);
  }

  isProcessing = false;
}

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
      // Clean expired cache entries periodically
      cleanExpiredCache();

      // Check cache first
      const cacheKey = getCacheKey(body);
      const cachedResponse = requestCache.get(cacheKey);

      if (cachedResponse && Date.now() < cachedResponse.expiry) {
        // Return cached response
        res.statusCode = cachedResponse.statusCode;
        res.setHeader("Content-Type", "application/json");
        res.end(cachedResponse.data);
        return;
      }

      // Add to queue for processing
      requestQueue.push({
        body,
        req,
        res,
        callback: async (body, req, res) => {
          req.body = JSON.parse(body);
          const { params } = req.body;

          const forwardToRealRPC = async () => {
            const MAX_RETRIES = RPCS.length * 2; // More retries to account for blacklisted nodes
            let attemptedNodes = 0;

            for (let n = 0; n < MAX_RETRIES; n++) {
              const nextRPC = RPCS[rpcIndex++ % RPCS.length];

              // Skip blacklisted nodes
              if (isNodeBlacklisted(nextRPC)) {
                continue;
              }

              attemptedNodes++;

              try {
                const proxyResponse = await fetch(nextRPC, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: body,
                });

                // Handle 429 (Too Many Requests) specifically
                if (proxyResponse.status === 429) {
                  blacklistNode(nextRPC);
                  console.warn(
                    `Node ${nextRPC} returned 429, blacklisted and trying next node`
                  );
                  continue;
                }

                if (proxyResponse.ok) {
                  const proxyData = await proxyResponse.text();

                  // Cache the successful response
                  requestCache.set(cacheKey, {
                    statusCode: proxyResponse.status,
                    data: proxyData,
                    expiry: Date.now() + CACHE_TTL,
                  });

                  res.statusCode = proxyResponse.status;
                  res.setHeader("Content-Type", "application/json");
                  res.end(proxyData);
                } else {
                  throw `${proxyResponse.status} ${
                    proxyResponse.statusText
                  }: ${await proxyResponse.text()}`;
                }
                break;
              } catch (error) {
                // Check if all non-blacklisted nodes have been tried
                const availableNodes = RPCS.filter(
                  (rpc) => !isNodeBlacklisted(rpc)
                ).length;

                if (attemptedNodes >= availableNodes) {
                  console.error("All available nodes exhausted:", error);
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      error: "Internal Server Error - All nodes unavailable",
                    })
                  );
                  break;
                } else {
                  console.warn(
                    "Failed fetching from rpc",
                    nextRPC,
                    error,
                    "trying next one",
                    body
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

            const responseData = JSON.stringify({
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
            });

            // Cache the social contract response
            requestCache.set(cacheKey, {
              statusCode: 200,
              data: responseData,
              expiry: Date.now() + CACHE_TTL,
            });

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(responseData);
          } else {
            forwardToRealRPC();
          }
        },
      });

      // Start processing the queue
      processQueue();
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
