const { accountToLockup } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  getNearBalances: () => {},
};

const lockupNearBalances = props.lockupNearBalances;
const instance = props.instance;
const selectedValue = props.selectedValue;
const onUpdate = props.onUpdate;

if (!instance || typeof accountToLockup !== "function") {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const lockupContract = accountToLockup(treasuryDaoID);

const [walletOptions, setWalletOptions] = useState([
  {
    label: "SputnikDAO",
    value: treasuryDaoID,
  },
  {
    label: "NEAR Intents",
    value: "intents.near",
  },
]);

useEffect(() => {
  if (lockupContract) {
    setWalletOptions([
      ...walletOptions,
      {
        label: "Lockup",
        value: lockupContract,
      },
    ]);
  }
}, [lockupContract]);

return (
  <div className="d-flex flex-column gap-1">
    <label>Treasury Wallet</label>
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDown`}
      props={{
        options: walletOptions,
        selectedValue,
        onUpdate,
        defaultLabel: "Select Wallet",
      }}
    />
  </div>
);
