const {
  getNearBalances,
  LOCKUP_MIN_BALANCE_FOR_STORAGE,
  TooltipText,
  accountToLockup,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const instance = props.instance;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});
const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

if (
  !instance ||
  !LOCKUP_MIN_BALANCE_FOR_STORAGE ||
  typeof accountToLockup !== "function"
) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const lockupContract = accountToLockup(treasuryDaoID);

const walletOptions = [
  {
    label: treasuryDaoID,
    value: treasuryDaoID,
  },
];
const [selectedWallet, setSelectedWallet] = useState(walletOptions[0]);
const [validators, setValidators] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);

const [validatorAccount, setValidatorAccount] = useState(null);
const [daoPolicy, setDaoPolicy] = useState(null);
const [amountError, setAmountError] = useState(null);

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

const [showWarning, setShowWarning] = useState(false);
const [lockupStakedPoolId, setLockupStakedPoolId] = useState(null);
const [showErrorToast, setShowErrorToast] = useState(false);

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

    Near.asyncView(lockupContract, "get_staking_pool_account_id").then((res) =>
      setLockupStakedPoolId(res)
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

function getFeeOfStakedPools() {
  const isLockupContract =
    lockupContract && selectedWallet.value === lockupContract;
  const promises = (
    isLockupContract ? lockupStakedPoolsWithBalance : nearStakedPoolsWithBalance
  )

    .filter((item) => item.stakedBalance > 0) // Filter items with staked balance
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
    setValidators(res);
  });
}

useEffect(() => {
  if (
    Array.isArray(nearStakedPoolsWithBalance) &&
    ((lockupContract && Array.isArray(lockupStakedPoolsWithBalance)) ||
      !lockupContract)
  ) {
    getFeeOfStakedPools();
    setShowWarning(false);
    if (
      selectedWallet.value === treasuryDaoID &&
      (nearStakedTokens <= 0 || nearStakedTokens === "0.00")
    ) {
      setShowWarning(true);
    }

    if (
      selectedWallet.value === lockupContract &&
      (lockupStakedTokens <= 0 || lockupStakedTokens === "0.00")
    ) {
      setShowWarning(true);
    }
  }
}, [
  selectedWallet,
  nearStakedPoolsWithBalance,
  lockupStakedPoolsWithBalance,
  lockupContract,
]);

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
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          onCloseCanvas();
          refreshData();
          clearTimeout(checkTxnTimeout);
          setTxnCreated(false);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated, lastProposalId]);

const BalanceDisplay = ({ label, balance, tooltipInfo, noBorder }) => {
  return (
    <div className="d-flex flex-column">
      <div className={!noBorder && "border-bottom"}>
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3">
          <div className="h6 mb-0">
            {label}
            {"  "}{" "}
            <Widget
              src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
              props={{
                popup: tooltipInfo,
                children: <i className="bi bi-info-circle text-secondary"></i>,
                instance,
              }}
            />
          </div>
          <div className="h6 mb-0 d-flex align-items-center gap-1">
            {Number(balance).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            NEAR
          </div>
        </div>
      </div>
    </div>
  );
};

function getBalances() {
  switch (selectedWallet?.value) {
    case lockupContract: {
      let available = Big(lockupNearBalances.totalParsed ?? "0")
        .minus(lockupStakedTotalTokens ?? "0")
        .minus(formatNearAmount(LOCKUP_MIN_BALANCE_FOR_STORAGE))
        .toFixed(2);
      available = parseFloat(available) < 0 ? 0 : available;
      return {
        staked: lockupStakedTokens,
        unstaked: lockupUnStakedTokens,
        withdrawal: lockupNearWithdrawTokens,
        available,
      };
    }
    default:
      return {
        staked: nearStakedTokens,
        unstaked: nearUnStakedTokens,
        withdrawal: nearWithdrawTokens,
        available: nearBalances.availableParsed,
      };
  }
}

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

function onSubmitClick(validatorAccount, amount, notes) {
  setTxnCreated(true);
  const deposit = daoPolicy?.proposal_bond || 0;
  const description = {
    proposal_action: "unstake",
    notes: notes,
  };

  const isLockupContractSelected = lockupContract === selectedWallet.value;

  const calls = [
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
          kind: {
            FunctionCall: {
              receiver_id: isLockupContractSelected
                ? lockupContract
                : validatorAccount,
              actions: [
                {
                  method_name: "unstake",
                  args: toBase64({
                    amount: Big(amount).mul(Big(10).pow(24)).toFixed(),
                  }),
                  deposit: "0",
                  gas: "200000000000000",
                },
              ],
            },
          },
        },
      },
      gas: 200000000000000,
      deposit,
    },
  ];

  const link = href({
    widgetSrc: `${instance}/widget/app`,
    params: {
      page: "stake-delegation",
      id: lastProposalId,
    },
  });

  // add withdraw request along with stake
  calls.push({
    contractName: treasuryDaoID,
    methodName: "add_proposal",
    args: {
      proposal: {
        description: encodeToMarkdown({
          proposal_action: "withdraw",
          showAfterProposalIdApproved: lastProposalId,
          customNotes: `Following to [#${lastProposalId}](${link}) unstake request`,
        }),
        kind: {
          FunctionCall: {
            receiver_id: isLockupContractSelected
              ? lockupContract
              : validatorAccount,
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
    deposit,
  });

  Near.call(calls);
}

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
`;

useEffect(() => {
  if (selectedWallet.value === lockupContract) {
    const pool = (lockupStakedPoolsWithBalance ?? []).find(
      (i) => i.pool === lockupStakedPoolId
    );
    const isAlreadyStaked =
      (pool.stakedBalance || 0) > 0 ||
      (pool.unstakedBalance || 0) > 0 ||
      (pool.availableToWithdrawBalance || 0) > 0;
    if (isAlreadyStaked) {
      setValidatorAccount({
        stakedBalance: {
          [lockupContract]: pool,
        },
        pool_id: lockupStakedPoolId,
      });
    }
  }
}, [selectedWallet, lockupStakedTokens]);

return (
  <Container>
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: "Are you sure you want to cancel?",
        content:
          "This action will clear all the information you have entered in the form and cannot be undone.",
        confirmLabel: "Yes",
        isOpen: showCancelModal,
        onCancelClick: () => setShowCancelModal(false),
        onConfirmClick: () => {
          setShowCancelModal(false);
          onCloseCanvas();
        },
      }}
    />
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
    <div className="d-flex flex-column gap-3">
      {lockupContract && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.WalletDropdown`}
          props={{
            lockupNearBalances,
            instance,
            selectedValue: selectedWallet,
            onUpdate: (v) => {
              setValidatorAccount(null);
              setSelectedWallet(v);
            },
          }}
        />
      )}
      <div className="d-flex flex-column gap-1 border border-1 rounded-3 py-2">
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
          balance={getBalances().withdrawal}
          tooltipInfo={TooltipText?.availableForWithdraw}
        />
      </div>
      {showWarning ? (
        <div className="d-flex gap-2 align-items-center rounded-2 bg-validator-warning">
          <i class="bi bi-exclamation-triangle"></i>
          You do not have any validators to unstake from. You must first stake
          tokens with a validator.
        </div>
      ) : (
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.ValidatorsDropDownWithSearch"
          props={{
            selectedValue: validatorAccount,
            options: validators,
            selectedWallet: selectedWallet?.value,
            disabledDropdown: selectedWallet?.value === lockupContract,
            disbabledActionButtons: isTxnCreated,
            lockupContract,
            treasuryDaoID,
            availableBalance: getBalances().available,
            instance,
            onCancel: () => setShowCancelModal(true),
            onSubmit: (validatorAccount, amount, notes, selectedOption) => {
              onSubmitClick(validatorAccount, amount, notes);
              setValidatorAccount(selectedOption);
            },
            lockupStakedPoolId,
            isStakePage: false,
          }}
        />
      )}
    </div>

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
  </Container>
);
