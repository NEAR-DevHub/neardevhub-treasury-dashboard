const { accountToLockup } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  getNearBalances: () => {},
};

const lockupNearBalances = props.lockupNearBalances;
const instance = props.instance;
const selectedValue = props.selectedValue;
const onUpdate = props.onUpdate;
const showIntents = props.showIntents;

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
]);

useEffect(() => {
  const baseOptions = [
    {
      label: "SputnikDAO",
      value: treasuryDaoID,
    },
  ];

  const additionalOptions = [];

  // Add lockup option if contract exists
  if (lockupContract) {
    additionalOptions.push({
      label: "Lockup",
      value: lockupContract,
    });
  }

  // Add intents option if showIntents is true
  if (showIntents) {
    additionalOptions.push({
      label: "NEAR Intents",
      value: "intents.near",
    });
  }

  setWalletOptions([...baseOptions, ...additionalOptions]);
}, [lockupContract, showIntents, treasuryDaoID]);

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
