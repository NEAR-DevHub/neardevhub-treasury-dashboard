const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || { getNearBalances: () => {} };

const lockupNearBalances = props.lockupNearBalances;
const instance = props.instance;
const selectedValue = props.selectedValue;
const onUpdate = props.onUpdate;

if (!instance) {
  return <></>;
}

const { treasuryDaoID, lockupContract } = VM.require(
  `${instance}/widget/config.data`
);

const nearBalances = getNearBalances(treasuryDaoID);

const nearPrice = useCache(
  () =>
    asyncFetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd`
    ).then((res) => {
      return res.body.near?.usd;
    }),
  "price",
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

return (
  <Widget
    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDown`}
    props={{
      options: walletOptions,
      selectedValue,
      onUpdate,
      DropdownItemRender: ({ item, setSelected, selected }) => {
        return (
          <li
            key={item.value}
            className="dropdown-item cursor-pointer link-underline link-underline-opacity-0 d-flex gap-1 text-sm justify-content-between align-items-center"
            onClick={() => {
              if (selected.label !== item.label) {
                setSelected(item);
              }
            }}
          >
            <div className="d-flex gap-2 align-items-center">
              <img
                src="https://ipfs.near.social/ipfs/bafkreihtkmmib3rrkl3ol7whwprbzx64av6htrfzjdm2sd5qjcgb3svs6m"
                height={20}
              />
              <div className="fw-bold work-break"> {item.label}</div>
            </div>
            {item.balance && (
              <div className="text-secondary"> ${item.balance}</div>
            )}
          </li>
        );
      },
    }}
  />
);
