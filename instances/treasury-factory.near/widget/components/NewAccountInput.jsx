const { alertMsg, setAlertMsg, onChange, defaultValue, postfix } = props;

const [value, setValue] = useState(defaultValue ?? "");

const checkAccountAvailable = async (accountId) => {
  if (accountId.length === 0) return;

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
        request_type: "view_account",
        finality: "final",
        account_id: `${accountId}${postfix}`,
      },
    }),
  }).then((resp) => {
    if (!resp) return;

    const err = resp.body?.error?.cause;
    let errMsg = null;

    if (!err) errMsg = `Account ${accountId}${postfix} already been taken`;
    else if (err.name !== "UNKNOWN_ACCOUNT") errMsg = err?.info?.error_message;

    setAlertMsg(errMsg);
  });
};

return (
  <div className="account-field position-relative d-flex align-items-center">
    <input
      type="text"
      placeholder="app-account"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        checkAccountAvailable(v);
        setValue(v);
        onChange(v);
      }}
    />
    <div
      style={{
        position: "absolute",
        right: "0px",
        borderLeft: "1px solid var(--bs-border-color)",
      }}
      className="py-2 px-3"
    >
      {postfix}
    </div>
  </div>
);
