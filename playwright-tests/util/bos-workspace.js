export async function getLocalWidgetSource(path) {
  const json = await fetch("http://127.0.0.1:14500", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      method: "query",
      params: {
        request_type: "call_function",
        account_id: "social.near",
        method_name: "get",
        args_base64: Buffer.from(JSON.stringify({ keys: [path] })).toString(
          "base64"
        ),
        finality: "optimistic",
      },
      id: 123,
      jsonrpc: "2.0",
    }),
  }).then((r) => r.json());
  return JSON.parse(
    new TextDecoder().decode(new Uint8Array(json.result.result))
  );
}
