const { accountToLockup, deserializeLockupContract } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  getNearBalances: () => {},
};

const lockupNearBalances = props.lockupNearBalances;
const instance = props.instance;
const selectedValue = props.selectedValue;
const onUpdate = props.onUpdate;
const showIntents = props.showIntents;
const isStakingDelegationPage = props.isStakingDelegationPage;

if (
  !instance ||
  typeof accountToLockup !== "function" ||
  typeof deserializeLockupContract !== "function"
) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const lockupContract = accountToLockup(treasuryDaoID);
const [isLockupStakingAllowed, setLockupStakingAllowed] = useState(false);
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

useEffect(() => {
  if (isStakingDelegationPage) {
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
      const isStakingNotAllowed = stakingPoolId === "lockup-no-whitelist.near";
      setLockupStakingAllowed(!isStakingNotAllowed);
    });
  }
}, [isStakingDelegationPage, lockupContract]);

if (!isLockupStakingAllowed && isStakingDelegationPage) return <></>;
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
        dataTestId: "wallet-dropdown",
      }}
    />
  </div>
);
