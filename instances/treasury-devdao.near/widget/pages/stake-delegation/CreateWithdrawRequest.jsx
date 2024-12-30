const { getNearBalances, LOCKUP_MIN_BALANCE_FOR_STORAGE, TooltipText } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const instance = props.instance;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});
const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
if (
  !instance ||
  typeof getNearBalances !== "function" ||
  typeof encodeToMarkdown !== "function" ||
  !LOCKUP_MIN_BALANCE_FOR_STORAGE
) {
  return <></>;
}

const { treasuryDaoID, lockupContract } = VM.require(
  `${instance}/widget/config.data`
);

const walletOptions = [
  {
    label: treasuryDaoID,
    value: treasuryDaoID,
  },
  {
    label: lockupContract,
    value: lockupContract,
  },
];
const [selectedWallet, setSelectedWallet] = useState(walletOptions[0]);
const [withdrawValidators, setWithdrawValidators] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);

const [daoPolicy, setDaoPolicy] = useState(null);

const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [nearUnStakedTokens, setNearUnStakedTokens] = useState(null);
const [nearStakedTotalTokens, setNearStakedTotalTokens] = useState(null);
const [nearWithdrawTokens, setNearWithdrawTokens] = useState(null);
const [nearStakedPoolsWithBalance, setNearStakedPoolsWithBalance] =
  useState(null);
const nearBalances = getNearBalances(treasuryDaoID);

const [lockupNearBalances, setLockupNearBalances] = useState(null);
const [lockupStakedTokens, setLockupStakedTokens] = useState(null);
const [lockupUnStakedTokens, setLockupUnStakedTokens] = useState(null);
const [lockupStakedTotalTokens, setLockupStakedTotalTokens] = useState(null);
const [lockupNearWithdrawTokens, setLockupNearWithdrawTokens] = useState(null);
const [lockupStakedPoolsWithBalance, setLockupStakedPoolsWithBalance] =
  useState(null);

const [hasUnstakedAssets, setHasUnstakedAssets] = useState(true);
const [isReadyToWithdraw, setIsReadyToWithdraw] = useState(true);
const [showLoader, setShowLoader] = useState(true);

function formatNearAmount(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(2);
}

function refreshData() {
  Storage.set("REFRESH_STAKE_TABLE_DATA", Math.random());
}

useEffect(() => {
  if (lockupContract) {
    Near.asyncView(lockupContract, "get_locked_amount").then((res) =>
      setLockupNearBalances((prev) => ({
        ...prev,
        locked: res,
        lockedParsed: formatNearAmount(res),
      }))
    );

    Near.asyncView(lockupContract, "get_balance").then((res) =>
      setLockupNearBalances((prev) => ({
        ...prev,
        total: res,
        totalParsed: formatNearAmount(res),
      }))
    );
  }
}, [lockupContract]);

useEffect(() => {
  if (lockupNearBalances.total && lockupNearBalances.locked) {
    const available = Big(lockupNearBalances.total)
      .minus(lockupNearBalances.locked)
      .toFixed();
    setLockupNearBalances((prev) => ({
      ...prev,
      available: available,
      availableParsed: formatNearAmount(available),
    }));
  }
}, [lockupNearBalances]);

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
  Near.asyncView(treasuryDaoID, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, []);

useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          onCloseCanvas();
          refreshData();
          setTxnCreated(false);
        } else {
          setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();
  }
}, [isTxnCreated]);

const BalanceDisplay = ({ label, balance, tooltipInfo, noBorder }) => {
  return (
    <div className="d-flex flex-column">
      <div className={!noBorder && "border-bottom"}>
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3">
          <div className="h6 mb-0">
            {label}
            {"  "}{" "}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="tooltip">{tooltipInfo}</Tooltip>}
            >
              <i className="bi bi-info-circle text-secondary"></i>
            </OverlayTrigger>
          </div>
          <div className="h6 mb-0 d-flex align-items-center gap-1">
            {balance} NEAR
          </div>
        </div>
      </div>
    </div>
  );
};

function getBalances() {
  switch (selectedWallet?.value) {
    case lockupContract: {
      return {
        staked: lockupStakedTokens,
        unstaked: lockupUnStakedTokens,
        withdrawl: lockupNearWithdrawTokens,
        available: Big(lockupNearBalances.totalParsed ?? "0")
          .minus(lockupStakedTotalTokens ?? "0")
          .minus(formatNearAmount(LOCKUP_MIN_BALANCE_FOR_STORAGE))
          .toFixed(2),
      };
    }
    default:
      return {
        staked: nearStakedTokens,
        unstaked: nearUnStakedTokens,
        withdrawl: nearWithdrawTokens,
        available: nearBalances.availableParsed,
      };
  }
}

function checkIfUnstakeBalanceExists(arrayToCheck) {
  return arrayToCheck.find((i) => i.unstakedBalance > 0);
}

function checkIfWithdrawBalanceExists(arrayToCheck) {
  return arrayToCheck.find((i) => i.availableToWithdrawBalance > 0);
}

function getFeeOfStakedPools(stakedPoolsWithBalance) {
  const promises = stakedPoolsWithBalance
    .filter((item) => item.availableToWithdrawBalance > 0) // Filter items with withdrawl balance
    .map((item) => {
      return Near.asyncView(item.pool, "get_reward_fee_fraction").then((i) => ({
        pool_id: item.pool,
        fee: i.numerator,
        stakedBalance: {
          [isLockupContract ? lockupContract : treasuryDaoID]: item,
        },
      }));
    });

  Promise.all(promises).then((res) => {
    setWithdrawValidators(res);
    setShowLoader(false);
  });
}

useEffect(() => {
  const stakedPoolsWithBalance =
    selectedWallet.value === lockupContract
      ? lockupStakedPoolsWithBalance
      : nearStakedPoolsWithBalance;

  if (Array.isArray(stakedPoolsWithBalance)) {
    getFeeOfStakedPools(stakedPoolsWithBalance);
    setHasUnstakedAssets(checkIfUnstakeBalanceExists(stakedPoolsWithBalance));
    setIsReadyToWithdraw(checkIfWithdrawBalanceExists(stakedPoolsWithBalance));
  }
}, [
  lockupStakedPoolsWithBalance,
  nearStakedPoolsWithBalance,
  selectedWallet.value,
]);

useEffect(() => {
  if (!isReadyToWithdraw) {
    setShowLoader(false);
  }
}, [isReadyToWithdraw, selectedWallet]);

function onSubmitClick() {
  setTxnCreated(true);
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;
  const description = {
    proposal_action: "withdraw",
  };

  const isLockupContractSelected = lockupContract === selectedWallet.value;
  const calls = [];

  withdrawValidators.map((i) => {
    calls.push({
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
          kind: {
            FunctionCall: {
              receiver_id: isLockupContractSelected
                ? lockupContract
                : i.pool_id,
              actions: isLockupContractSelected
                ? [
                    {
                      method_name: "withdraw_all_from_staking_pool",
                      args: "",
                      deposit: "0",
                      gas: "250000000000000",
                    },
                  ]
                : [
                    {
                      method_name: "withdraw_all",
                      args: "",
                      deposit: "0",
                      gas: "200000000000000",
                    },
                  ],
            },
          },
        },
      },
      gas: 200000000000000,
    });
  });

  Near.call(calls);
}

const WarningMessage = ({ message }) => {
  return (
    <div className="d-flex gap-2 align-items-center rounded-2 bg-withdraw-warning">
      <i className="bi bi-exclamation-triangle"></i>
      {message}
    </div>
  );
};

const Pools = () => {
  return (
    <div className="d-flex flex-column gap-3">
      {Array.isArray(withdrawValidators) && withdrawValidators.length > 0 && (
        <div className="border border-1 rounded-3">
          {withdrawValidators.map((i, index) => {
            const { pool_id, fee, stakedBalance } = i;

            return (
              <div
                key={pool_id}
                className={
                  `w-100 text-wrap px-3 py-2 text-truncate d-flex flex-column gap-1 ` +
                  (index > 0 && " border-top")
                }
              >
                <div className="d-flex align-items-center gap-2 text-sm">
                  <span className="text-secondary">{fee}% Fee </span>
                  <span className="text-green">Active</span>
                </div>
                <div className="h6 mb-0"> {pool_id} </div>

                <div className="d-flex flex-column gap-1">
                  <div className="d-flex align-items-center gap-1 text-sm">
                    <div className="text-secondary">
                      Available for withdrawal:{" "}
                    </div>
                    <div className="text-orange">
                      {formatNearAmount(
                        stakedBalance[selectedWallet.value]
                          .availableToWithdrawBalance
                      )}{" "}
                      NEAR
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {withdrawValidators?.length > 1 && (
        <WarningMessage message="By submitting, you request to withdraw all available funds. A separate withdrawal request will be created for each validator." />
      )}
    </div>
  );
};

const Container = styled.div`
  font-size: 14px;

  label {
    font-weight: 600;
    margin-bottom: 3px;
    font-size: 15px;
  }

  .p-2 {
    padding: 0px !important;
  }

  .text-green {
    color: #34c759;
  }

  .text-orange {
    color: rgba(255, 149, 0, 1) !important;
  }
`;

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
      props={{
        accountId: treasuryDaoID,
        setNearStakedTokens: (v) => setNearStakedTokens(Big(v).toFixed(2)),
        setNearUnstakedTokens: (v) => setNearUnStakedTokens(Big(v).toFixed(2)),
        setNearStakedTotalTokens: (v) =>
          setNearStakedTotalTokens(Big(v).toFixed(2)),
        setNearWithdrawTokens: (v) => setNearWithdrawTokens(Big(v).toFixed(2)),
        setPoolWithBalance: setNearStakedPoolsWithBalance,
      }}
    />

    {lockupContract && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
        props={{
          accountId: lockupContract,
          setNearStakedTokens: (v) => setLockupStakedTokens(Big(v).toFixed(2)),
          setNearUnstakedTokens: (v) =>
            setLockupUnStakedTokens(Big(v).toFixed(2)),
          setNearStakedTotalTokens: (v) =>
            setLockupStakedTotalTokens(Big(v).toFixed(2)),
          setNearWithdrawTokens: (v) =>
            setLockupNearWithdrawTokens(Big(v).toFixed(2)),
          setPoolWithBalance: setLockupStakedPoolsWithBalance,
        }}
      />
    )}
    <div className="d-flex flex-column gap-3">
      {lockupContract && (
        <div className="d-flex flex-column gap-1">
          <label>Treasury Wallet</label>
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.WalletDropdown`}
            props={{
              lockupNearBalances,
              instance,
              selectedValue: selectedWallet,
              onUpdate: (v) => {
                setShowLoader(true);
                setSelectedWallet(v);
              },
            }}
          />
        </div>
      )}
      <div className="d-flex flex-column gap-1 border border-1 rounded-3 p-2">
        <BalanceDisplay
          label={"Ready to stake"}
          balance={getBalances().available}
          tooltipInfo={TooltipText?.readyToStake}
        />
        <BalanceDisplay
          label={"Staked"}
          balance={getBalances().staked}
          tooltipInfo={TooltipText?.staked}
        />
        <BalanceDisplay
          label={"Pending release"}
          balance={getBalances().unstaked}
          tooltipInfo={TooltipText?.pendingRelease}
        />
        <BalanceDisplay
          noBorder={true}
          label={"Available for withdrawal"}
          balance={getBalances().withdrawl}
          tooltipInfo={TooltipText?.availableForWithdraw}
        />
      </div>
      {showLoader && (
        <div className="d-flex flex-column justify-content-center align-items-center w-100 h-100">
          <Widget
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
          />
        </div>
      )}
      {!isReadyToWithdraw && (
        <WarningMessage
          message={
            hasUnstakedAssets
              ? "Your balance is not ready for withdrawal yet. It is pending release and will take 1–2 days."
              : "You don’t have any unstaked balance available for withdrawal."
          }
        />
      )}
      <Pools />
      <div className="d-flex mt-2 gap-3 justify-content-end">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "btn-outline shadow-none border-0",
            },
            label: "Cancel",
            onClick: () => {
              onCloseCanvas();
            },
            disabled: isTxnCreated,
          }}
        />
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            label: "Submit",
            disabled: !withdrawValidators?.length,
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
