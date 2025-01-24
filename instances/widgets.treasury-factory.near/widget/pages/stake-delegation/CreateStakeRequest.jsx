const { getNearBalances, LOCKUP_MIN_BALANCE_FOR_STORAGE, TooltipText } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");
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

if (!instance || !LOCKUP_MIN_BALANCE_FOR_STORAGE) {
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
const [notes, setNotes] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);

const [amount, setAmount] = useState(null);
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

function cleanInputs() {
  setValidatorAccount("");
  setNotes("");
  setAmount("");
}

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;
    let errorTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          cleanInputs();
          onCloseCanvas();
          refreshData();
          clearTimeout(errorTimeout);
          setTxnCreated(false);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    // if in 20 seconds there is no change, show error condition
    errorTimeout = setTimeout(() => {
      setShowErrorToast(true);
      setTxnCreated(false);
      clearTimeout(checkTxnTimeout);
    }, 25_000);

    return () => {
      clearTimeout(checkTxnTimeout);
      clearTimeout(errorTimeout);
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
            {balance} NEAR
          </div>
        </div>
      </div>
    </div>
  );
};

const allValidators = useCache(
  () =>
    asyncFetch("https://rpc.mainnet.near.org/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "validators",
        params: [null],
      }),
    }).then((resp) => {
      if (Array.isArray(resp.body.result?.current_validators)) {
        const validatorsAccounts = resp.body.result.current_validators;
        return Promise.all(
          validatorsAccounts.map((item) =>
            item.account_id
              ? Near.asyncView(item.account_id, "get_reward_fee_fraction").then(
                  (feeData) => ({
                    pool_id: item.account_id,
                    fee: feeData.numerator,
                  })
                )
              : null
          )
        ).then((results) => results.filter((result) => result !== null));
      }
      return [];
    }),
  treasuryDaoID + "-stake-request-validators",
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
      return {
        staked: lockupStakedTokens,
        unstaked: lockupUnStakedTokens,
        withdrawal: lockupNearWithdrawTokens,
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
        withdrawal: nearWithdrawTokens,
        available: nearBalances.availableParsed,
      };
  }
}

function toBase64(json) {
  return Buffer.from(JSON.stringify(json)).toString("base64");
}

function onSubmitClick() {
  setTxnCreated(true);
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;
  const description = {
    proposal_action: "stake",
    notes: notes,
  };

  const isLockupContractSelected = lockupContract === selectedWallet.value;

  const addSelectPoolCall =
    isLockupContractSelected && validatorAccount.pool_id !== lockupStakedPoolId;

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
                    staking_pool_account_id: validatorAccount.pool_id,
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
              : validatorAccount.pool_id,
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
  const parsedAmount = parseFloat(amount);
  if (parsedAmount > parseFloat(getBalances().available)) {
    setAmountError("Your account doesn't have sufficient balance.");
  } else {
    setAmountError(null);
  }
}, [amount, selectedWallet]);

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
      showError={showErrorToast}
      toggleToast={() => setShowErrorToast(false)}
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
          cleanInputs();
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
        <label>Validator</label>
        <Widget
          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ValidatorsDropDownWithSearch"
          props={{
            selectedValue: validatorAccount,
            onChange: (v) => setValidatorAccount(v),
            options: validators,
            showSearch: true,
            searchInputPlaceholder: "Search",
            defaultLabel: "Select",
            selectedWallet: selectedWallet?.value,
            disabled: lockupAlreadyStaked,
          }}
        />
        {selectedWallet.value === lockupContract && (
          <div className="d-flex gap-2 align-items-center my-2 rounded-2 bg-validator-info">
            <i class="bi bi-info-circle h6 mb-0"></i>
            {lockupStakedPoolId ? (
              <span>
                You cannot split your locked funds across multiple validators.
                To change your validator, please contact our support team.
              </span>
            ) : (
              <span>
                You cannot split your locked funds across multiple validators.
                Choose <span className="fw-bold">one</span> validator from the
                list. Once you select a validator and click submit, a one-time
                whitelist request will be created. You'll need to approve this
                request before you can proceed with approving the staking
                request. <br /> <br /> Note: We currently do not support
                changing validators through the treasury UI. If you need to
                change your validator, please contact our team.
              </span>
            )}
          </div>
        )}
      </div>
      <div className="d-flex flex-column gap-1">
        <label className="d-flex align-items-center justify-content-between">
          Amount to Stake
          {validatorAccount && (
            <div
              className="use-max-bg px-3 py-1 rounded-2"
              onClick={() => {
                setAmount(getBalances().available);
              }}
            >
              Use Max
            </div>
          )}
        </label>
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
          props={{
            className: "flex-grow-1",
            key: `total-amount`,
            onBlur: (e) => setAmount(e.target.value),
            placeholder: "Enter amount",
            value: amount,
            error: amountError,
            inputProps: {
              type: "number",
              min: "0",
              prefix: <NearToken />,
            },
          }}
        />
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Notes (Optional)</label>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Input`}
          props={{
            className: "flex-grow-1",
            key: `notes`,
            onBlur: (e) => setNotes(e.target.value),
            value: notes,
            multiline: true,
          }}
        />
      </div>
      <div className="d-flex mt-2 gap-3 justify-content-end">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "btn btn-outline-secondary shadow-none no-transparent",
            },
            label: "Cancel",
            onClick: () => {
              setShowCancelModal(true);
            },
            disabled: isTxnCreated,
          }}
        />
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: { root: "theme-btn" },
            disabled:
              !validatorAccount || !amount || amountError || isTxnCreated,
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
