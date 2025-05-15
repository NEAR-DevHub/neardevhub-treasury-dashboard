const {
  alertMsg,
  setAlertMsg,
  onChange,
  defaultValue,
  postfix,
  placeholder,
  skipValdation,
  label,
  id,
} = props;

const [value, setValue] = useState("");
const [show, setShow] = useState(false);

useEffect(() => {
  if (value !== defaultValue) {
    setValue(defaultValue);
  }
}, [defaultValue]);

const checkAccountAvailability = async (accountId, postfix) => {
  if (!accountId || accountId.length === 0) return;

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

    if (!err) errMsg = `Account name already exists`;
    else if (err.name !== "UNKNOWN_ACCOUNT") errMsg = err?.info?.error_message;

    const newAlertMsg = alertMsg ?? {};
    newAlertMsg[postfix] = errMsg;
    setAlertMsg(newAlertMsg);
  });
};

useEffect(() => {
  if (!skipValdation) {
    if (value.length === 0) setAlertMsg({ ".near": null });

    const handler = setTimeout(() => {
      checkAccountAvailability(value, ".near");
      checkAccountAvailability(value, ".sputnik-dao.near");
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }
}, [value]);

return (
  <div className="account-field position-relative d-flex flex-column">
    {label && (
      <div className="d-flex gap-1 align-items-center">
        <label className="fw-semibold mb-1" for={id}>
          {label}
        </label>
      </div>
    )}
    <input
      id={id}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        setValue(v);
        onChange(v);
      }}
    />
    {postfix && (
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
    )}
  </div>
);
