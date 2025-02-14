const {
  getNearBalances,
  LOCKUP_MIN_BALANCE_FOR_STORAGE,
  TooltipText,
  isBosGateway,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");
const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };
const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});

if (
  !instance ||
  !LOCKUP_MIN_BALANCE_FOR_STORAGE ||
  typeof isBosGateway !== "function"
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
const [validators, setValidators] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [validatorAccount, setValidatorAccount] = useState(null);
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
const [lockupStakedPoolId, setLockupStakedPoolId] = useState(null);
const [lockupAlreadyStaked, setLockupAlreadyStaked] = useState(false);
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
          clearTimeout(checkTxnTimeout);
          refreshData();
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

const pikespeakKey = isBosGateway()
  ? "${REPL_GATEWAY_PIKESPEAK_KEY}"
  : props.pikespeakKey ?? "${REPL_INDIVIDUAL_PIKESPEAK_KEY}";

const pikespeakOptions = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": pikespeakKey,
  },
};
const allValidators = useCache(
  () =>
    asyncFetch(
      "https://api.pikespeak.ai/validators/current",
      pikespeakOptions
    ).then((resp) => {
      return (
        resp?.body?.map((item) => {
          return {
            pool_id: item.account_id,
            fee: item.fees.numerator,
          };
        }) ?? []
      );
    }),
  "-stake-request-validators",
  { subscribe: false }
);

function getAllStakingPools() {
  const nearStakedMap = new Map(
    (nearStakedPoolsWithBalance ?? []).map((pool) => [pool.pool, pool])
  );

  const lockupStakedMap = new Map(
    (lockupStakedPoolsWithBalance ?? []).map((pool) => [pool.pool, pool])
  );

  // Update allValidators with stakedBalance
  const updatedValidators = allValidators.map((validator) => {
    const nearpoolBalance = nearStakedMap.get(validator.pool_id);
    const lockupPool = lockupStakedMap.get(validator.pool_id);

    return {
      ...validator,
      stakedBalance: {
        [treasuryDaoID]: nearpoolBalance ?? null,
        [lockupContract]: lockupPool ?? null,
      },
    };
  });

  // Set the updated validators
  setValidators(updatedValidators);
}

useEffect(() => {
  if (
    Array.isArray(nearStakedPoolsWithBalance) &&
    Array.isArray(allValidators) &&
    ((lockupContract && Array.isArray(lockupStakedPoolsWithBalance)) ||
      !lockupContract)
  ) {
    getAllStakingPools();
  }
}, [
  nearStakedPoolsWithBalance,
  lockupStakedPoolsWithBalance,
  lockupContract,
  allValidators,
]);

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
    proposal_action: "stake",
    notes: notes,
  };

  const isLockupContractSelected = lockupContract === selectedWallet.value;

  const addSelectPoolCall =
    isLockupContractSelected && validatorAccount !== lockupStakedPoolId;

  const calls = [];
  if (addSelectPoolCall) {
    description["showAfterProposalIdApproved"] = lastProposalId;

    calls.push({
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown({
            proposal_action: "stake",
            customNotes:
              "Approve to designate this validator with this lockup account. Lockup accounts can only have one validator.",
          }),
          kind: {
            FunctionCall: {
              receiver_id: lockupContract,
              actions: [
                {
                  method_name: "select_staking_pool",
                  args: toBase64({
                    staking_pool_account_id: validatorAccount,
                  }),
                  deposit: "0",
                  gas: "100000000000000",
                },
              ],
            },
          },
        },
      },
      gas: 200000000000000,
      deposit,
    });
  }

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
              : validatorAccount,
            actions: isLockupContractSelected
              ? [
                  {
                    method_name: "deposit_and_stake",
                    args: toBase64({
                      amount: Big(amount).mul(Big(10).pow(24)).toFixed(),
                    }),
                    deposit: "0",
                    gas: "150000000000000",
                  },
                ]
              : [
                  {
                    method_name: "deposit_and_stake",
                    args: "",
                    deposit: Big(amount).mul(Big(10).pow(24)).toFixed(),
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

// check if staking pool is selected with some staked balance
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
        ...lockupStakedPoolsWithBalance,
        pool_id: lockupStakedPoolId,
      });
    }
    setLockupAlreadyStaked(isAlreadyStaked);
  } else {
    setLockupAlreadyStaked(false);
    setValidatorAccount("");
  }
}, [selectedWallet, lockupStakedPoolsWithBalance]);

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
        <div className="d-flex flex-column gap-1">
          <label>Treasury Wallet</label>
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
        </div>
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
      <div className="d-flex flex-column gap-1">
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.ValidatorsDropDownWithSearch"
          props={{
            selectedValue: validatorAccount,
            options: validators,
            selectedWallet: selectedWallet?.value,
            disabledDropdown: lockupAlreadyStaked,
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
            isStakePage: true,
          }}
        />
      </div>
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
