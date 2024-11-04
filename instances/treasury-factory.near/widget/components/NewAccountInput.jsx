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
    if (resp) {
      const err = resp.body?.error?.cause;

      if (!err)
        return setAlertMsg(`Account ${accountId}${postfix} already been taken`);
      else if (err.name !== "UNKNOWN_ACCOUNT")
        return setAlertMsg(err?.info?.error_message);

      setAlertMsg();
    }
  });
};

return (
  <div className="position-relative d-flex align-items-center">
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
