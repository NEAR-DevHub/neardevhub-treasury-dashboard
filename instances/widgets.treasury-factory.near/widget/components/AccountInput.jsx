const { asyncAccountToLockup } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

if (!asyncAccountToLockup) return <></>;

const value = props.value;
const placeholder = props.placeholder;
const onUpdate = props.onUpdate;
const setParentAccountValid = props.setParentAccountValid;
const disabled = props.disabled;
const instance = props.instance;
const allowNonExistentImplicit = props.allowNonExistentImplicit;
const checkAccountLockup = props.checkAccountLockup;

const [account, setAccount] = useState(value);
const [showAccountAutocomplete, setAutoComplete] = useState(false);
const [isValidAccount, setValidAccount] = useState(false);
const [selectedFromAutoComplete, setSelectedFromAuto] = useState(false);
const [hasLockup, setHasLockup] = useState(false);

const maxWidth = props.maxWidth;
const AutoComplete = styled.div`
  max-width: ${maxWidth ?? "400px"};
  margin-top: 1rem;
`;

useEffect(() => {
  if (value !== account) {
    setAccount(value);
  }
}, [value]);

useEffect(() => {
  if (value !== account) {
    onUpdate(account);
  }
}, [account]);

useEffect(() => {
  const handler = setTimeout(() => {
    const valid =
      account.length === 64 ||
      (account ?? "").includes(".near") ||
      (account ?? "").includes(".tg") ||
      (account ?? "").includes(".aurora");
    setValidAccount(valid);
    if (valid) {
      checkAccountAvailability();
    }
    setAutoComplete(true);
  }, 100);

  return () => {
    clearTimeout(handler);
  };
}, [account]);

useEffect(() => {
  setParentAccountValid(isValidAccount);
}, [isValidAccount]);

function isHexString(str) {
  return /^[0-9a-fA-F]+$/.test(str);
}

const checkAccountAvailability = async () => {
  // skip check if it's implicit account
  if (
    allowNonExistentImplicit &&
    (account ?? "").length === 64 &&
    isHexString(account)
  ) {
    return;
  }

  if (checkAccountLockup) {
    asyncAccountToLockup(account).then((resp) => {
      if (resp.body?.result?.amount) {
        setHasLockup(true);
        setValidAccount(false);
      } else {
        setHasLockup(false);
        setValidAccount(true);
      }
    });
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
        request_type: "view_account",
        finality: "final",
        account_id: account,
      },
    }),
  }).then((resp) => {
    if (
      resp.body?.error?.cause.name === "UNKNOWN_ACCOUNT" ||
      resp?.status === 400
    ) {
      setValidAccount(false);
      setAutoComplete(false);
    }
  });
};

return (
  <div>
    <Widget
      src="${REPL_DEVHUB}/widget/devhub.components.molecule.Input"
      props={{
        className: "flex-grow-1",
        value: account,
        onChange: (e) => {
          setAccount(e.target.value);
          setSelectedFromAuto(false);
        },
        skipPaddingGap: true,
        placeholder: placeholder,
        inputProps: {
          max: 64,
          prefix: "@",
          disabled,
        },
      }}
    />
    {account && (
      <div style={{ color: "red" }} className="text-sm mt-1">
        {hasLockup
          ? "This account already has an active lockup. You can only have one active lockup at a time."
          : !isValidAccount
          ? "Please enter valid account ID"
          : null}
      </div>
    )}
    {showAccountAutocomplete && !selectedFromAutoComplete && account && (
      <AutoComplete>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.AccountAutocomplete"
          props={{
            term: account,
            onSelect: (id) => {
              setAccount(id);
              setAutoComplete(false);
              setSelectedFromAuto(true);
            },
            onClose: () => setAutoComplete(false),
            instance,
          }}
        />
      </AutoComplete>
    )}
  </div>
);
