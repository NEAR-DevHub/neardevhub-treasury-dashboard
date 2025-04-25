function base58EncodeFromHex(hex) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const base = 58;

  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }

  // Convert hex to bytes
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }

  // Count leading zeros
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  // Create a copy of bytes to work with
  const input = bytes.slice();
  const encoded = [];

  let startAt = zeros;
  while (startAt < input.length) {
    let remainder = 0;
    for (let i = startAt; i < input.length; i++) {
      const num = (remainder * 256) | input[i];
      input[i] = Math.floor(num / base);
      remainder = num % base;
    }
    encoded.push(alphabet[remainder]);

    // Skip leading zeros in input
    while (startAt < input.length && input[startAt] === 0) {
      startAt++;
    }
  }

  // Add '1' for each leading 0 byte
  for (let i = 0; i < zeros; i++) {
    encoded.push(alphabet[0]);
  }

  // Since we pushed remainders, reverse to get correct order
  return encoded.reverse().join("");
}

function checkIfDAOContractIsUpToDate(instance) {
  const {
    updatesNotApplied,
    finishedUpdates,
    setFinishedUpdates,
    UPDATE_TYPE_DAO_CONTRACT,
  } = VM.require(
    "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.system-updates.UpdateNotificationTracker"
  ) ?? { updatesNotApplied: [], setFinishedUpdates: () => {} };

  const daoContractUpdatesNotApplied = updatesNotApplied.filter(
    (update) => update.type === UPDATE_TYPE_DAO_CONTRACT
  );
  const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

  if (daoContractUpdatesNotApplied.length === 0 || !treasuryDaoID) {
    return;
  }
  asyncFetch(`${REPL_RPC_URL}`, {
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
        account_id: "sputnik-dao.near",
        method_name: "get_default_code_hash",
        args_base64: "",
      },
    }),
  }).then((response) => {
    const dao_code_hash_b58 = JSON.parse(
      Buffer.from(new Uint8Array(response.body.result.result)).toString()
    );
    console.log("DAO code hash", dao_code_hash_b58);
    asyncFetch(`${REPL_RPC_URL}`, {
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
          request_type: "view_code",
          finality: "final",
          account_id: treasuryDaoID,
        },
      }),
    }).then((response) => {
      const dao_contract_code_base64 = response.body.result.code_base64;
      const dao_contract_bytes = Buffer.from(
        dao_contract_code_base64,
        "base64"
      );

      const dao_contract_code_base58 = base58EncodeFromHex(
        ethers.utils.sha256(dao_contract_bytes)
      );
      if (dao_code_hash_b58 === dao_contract_code_base58) {
        console.log("The DAO contract hash is identical.");

        daoContractUpdatesNotApplied.forEach((update) => {
          finishedUpdates[update.id] = true;
        });
        setFinishedUpdates(finishedUpdates);
      } else {
        console.log("The DAO contract hashes are different.");
      }
    });
  });
}

return {
  checkIfDAOContractIsUpToDate,
};
