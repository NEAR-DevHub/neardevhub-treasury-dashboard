const { getNearBalances, accountToLockup, deserializeLockupContract } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
    getNearBalances: () => {},
  };

const lockupNearBalances = props.lockupNearBalances;
const instance = props.instance;
const selectedValue = props.selectedValue;
const onUpdate = props.onUpdate;

if (
  !instance ||
  typeof accountToLockup !== "function" ||
  typeof deserializeLockupContract !== "function"
) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const lockupContract = accountToLockup(treasuryDaoID);
const nearBalances = getNearBalances(treasuryDaoID);
const [isLockupStakingAllowed, setLockupStakingAllowed] = useState(false);

const nearPrice = useCache(
  () =>
    asyncFetch(`${REPL_BACKEND_API}/near-price`).then((res) => {
      return res.body;
    }),
  "near-price",
  { subscribe: false }
);

function getTokenValue(amount) {
  return Big(amount ? amount : 0)
    .mul(nearPrice ?? 1)
    .toFixed(2);
}

const [walletOptions, setWalletOptions] = useState([
  {
    label: treasuryDaoID,
    value: treasuryDaoID,
    balance: null,
  },
  {
    label: lockupContract,
    value: lockupContract,
    balance: null,
  },
]);

useEffect(() => {
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
        request_type: "view_state",
        finality: "final",
        account_id: lockupContract,
        prefix_base64: "",
      },
    }),
  }).then((res) => {
    const lockupState = atob(res.body?.result?.values?.[0].value);
    const deserialized = deserializeLockupContract(
      new Uint8Array([...lockupState].map((c) => c.charCodeAt(0)))
    );
    const stakingPoolId = deserialized.staking_pool_whitelist_account_id
      ? deserialized.staking_pool_whitelist_account_id.toString()
      : null;
    const isStakingAllowed = stakingPoolId === "lockup-no-whitelist.near";
    setLockupStakingAllowed(!isStakingAllowed);
  });
}, [lockupContract]);

useEffect(() => {
  if (
    nearBalances?.availableParsed &&
    lockupNearBalances.availableParsed &&
    !walletOptions?.[0]?.balance
  ) {
    setWalletOptions((prev) => [
      {
        ...prev[0],
        balance: getTokenValue(nearBalances.availableParsed),
      },
      {
        ...prev[1],
        balance: getTokenValue(lockupNearBalances.availableParsed),
      },
    ]);
  }
}, [nearBalances, lockupNearBalances]);

const Container = styled.div`
  .custom-tag {
    width: 90px;
    background-color: var(--grey-035);
    color: var(--text-color);
    padding-block: 3px;
    padding-inline: 10px;
  }

  .w-40 {
    width: 40%;
  }
`;

if (!isLockupStakingAllowed) return <></>;

return (
  <Container>
    <div className="d-flex flex-column gap-1">
      <label>Treasury Wallet</label>
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDown`}
        props={{
          options: walletOptions,
          selectedValue,
          SelectedValueRender: () => {
            return (
              <div className="d-flex gap-2 align-items-center">
                <div className="custom-tag rounded-3 text-sm text-center">
                  {selectedValue?.value === treasuryDaoID
                    ? "SputnikDAO"
                    : "Lockup"}
                </div>
                <div className="text-truncate flex-1">
                  {selectedValue?.value}
                </div>
              </div>
            );
          },
          onUpdate,
          DropdownItemRender: ({ item, setSelected, selected }) => {
            return (
              <li
                key={item.value}
                className="dropdown-item cursor-pointer link-underline link-underline-opacity-0 d-flex gap-2 text-sm justify-content-between align-items-center"
                onClick={() => {
                  if (selected.label !== item.label) {
                    setSelected(item);
                  }
                }}
              >
                <div className="custom-tag rounded-3 text-sm text-center">
                  {item.label === treasuryDaoID ? "SputnikDAO" : "Lockup"}
                </div>
                <div className="fw-bold work-break text-left flex-1">
                  {" "}
                  {item.label}
                </div>
                {item.balance && (
                  <div className="text-secondary w-15"> ${item.balance}</div>
                )}
              </li>
            );
          },
        }}
      />
    </div>
  </Container>
);
