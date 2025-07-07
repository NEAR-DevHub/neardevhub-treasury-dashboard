const rpcUrl = `https://rpc.mainnet.fastnear.com`;

/**
 * Calls a read-only method on a NEAR smart contract using the NEAR RPC API.
 *
 * @async
 * @function callContractReadOnly
 * @param {Object} params - The parameters for the contract call
 * @param {string} params.contractId - The NEAR account ID of the smart contract
 * @param {string} params.methodName - The name of the contract method to call
 * @param {Object} [params.args={}] - The arguments to pass to the contract method
 * @returns {Promise<Buffer>} A Promise that resolves to a Buffer containing the raw result bytes from the contract call
 * @throws {Error} Throws an error if the RPC call fails or returns an error response
 *
 * @example
 * // Call a contract method with no arguments
 * const result = await callContractReadOnly({
 *   contractId: 'example.near',
 *   methodName: 'get_balance'
 * });
 *
 * @example
 * // Call a contract method with arguments
 * const result = await callContractReadOnly({
 *   contractId: 'token.near',
 *   methodName: 'ft_balance_of',
 *   args: { account_id: 'user.near' }
 * });
 */
export async function callContractReadOnly({
  contractId,
  methodName,
  args = {},
}) {
  const responseBody = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: methodName,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      },
    }),
  }).then((r) => r.json());
  const resultBytes = Buffer.from(new Uint8Array(responseBody.result.result));
  return resultBytes;
}
