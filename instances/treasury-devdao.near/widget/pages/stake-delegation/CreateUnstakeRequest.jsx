const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});
const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

if (!instance) {
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

const [showWarning, setShowWarning] = useState(false);
const [lockupStakedPoolId, setLockupStakedPoolId] = useState(null);

function formatNearAmount(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(4);
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
        fee: i.numerator / i.denominator,
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
      (nearStakedTokens <= 0 || nearStakedTokens === "0.0000")
    ) {
      setShowWarning(true);
    }

    if (
      selectedWallet.value === lockupContract &&
      (lockupStakedTokens <= 0 || lockupStakedTokens === "0.0000")
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

function cleanInputs() {
  setValidatorAccount("");
  setNotes("");
  setAmount("");
}

useEffect(() => {
  if (isTxnCreated) {
    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (lastProposalId !== id) {
          cleanInputs();
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
              <i className="bi bi-info-circle text-dark-grey"></i>
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
        available: lockupNearBalances.totalParsed - lockupStakedTotalTokens,
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

  Near.call({
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
  });
}

const Container = styled.div`
  font-size: 14px;

  .text-grey {
    color: #b9b9b9 !important;
  }

  .text-grey a {
    color: inherit !important;
  }

  label {
    font-weight: 600;
    margin-bottom: 3px;
    font-size: 15px;
  }

  .p-2 {
    padding: 0px !important;
  }

  .theme-btn {
    background: var(--theme-color) !important;
    color: white;
  }

  .primary-text-color a {
    color: var(--theme-color) !important;
  }

  .btn:hover {
    color: black !important;
  }

  .text-sm {
    font-size: 13px;
  }

  .use-max-bg {
    background-color: #ecf8fb;
    color: #1d62a8;
    cursor: pointer;
  }

  .text-dark-grey {
    color: rgba(85, 85, 85, 1) !important;
  }

  .bg-validator-info {
    background: rgba(0, 16, 61, 0.06);
    color: #1b1b18;
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;
  }

  .bg-validator-warning {
    background: rgba(255, 158, 0, 0.1);
    color: rgba(177, 113, 8, 1);
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;
  }
`;

useEffect(() => {
  const parsedAmount = parseFloat(amount);
  if (parsedAmount > parseFloat(getBalances().staked)) {
    setAmountError("The amount exceeds the balance you have staked.");
  } else {
    setAmountError(null);
  }
}, [amount, selectedWallet]);

useEffect(() => {
  if (selectedWallet.value === lockupContract) {
    const pool = (lockupStakedPoolsWithBalance ?? []).find(
      (i) => i.pool === lockupStakedPoolId
    );
    const isAlreadyStaked =
      (pool.stakedBalance || 0) > 0 ||
      (pool.unStakedBalance || 0) > 0 ||
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
        setNearStakedTokens: (v) => setNearStakedTokens(Big(v).toFixed(4)),
        setNearUnstakedTokens: (v) => setNearUnStakedTokens(Big(v).toFixed(4)),
        setNearStakedTotalTokens: (v) =>
          setNearStakedTotalTokens(Big(v).toFixed(4)),
        setNearWithdrawTokens: (v) => setNearWithdrawTokens(Big(v).toFixed(4)),
        setPoolWithBalance: setNearStakedPoolsWithBalance,
      }}
    />

    {lockupContract && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
        props={{
          accountId: lockupContract,
          setNearStakedTokens: (v) => setLockupStakedTokens(Big(v).toFixed(4)),
          setNearUnstakedTokens: (v) =>
            setLockupUnStakedTokens(Big(v).toFixed(4)),
          setNearStakedTotalTokens: (v) =>
            setLockupStakedTotalTokens(Big(v).toFixed(4)),
          setNearWithdrawTokens: (v) =>
            setLockupNearWithdrawTokens(Big(v).toFixed(4)),
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
      <div className="d-flex flex-column gap-1 border border-1 rounded-3 p-2">
        <BalanceDisplay
          label={"Ready to stake"}
          balance={getBalances().available}
          tooltipInfo={
            "This is your spendable NEAR balance, and can be used or transferred immediately."
          }
        />
        <BalanceDisplay
          label={"Staked"}
          balance={getBalances().staked}
          tooltipInfo={
            "NEAR tokens currently staked with validators. These tokens are accumulating rewards. To access these tokens, you must first unstake and then withdraw them."
          }
        />
        <BalanceDisplay
          label={"Pending release"}
          balance={getBalances().unstaked}
          tooltipInfo={
            "These tokens have been unstaked, but are not yet ready to withdraw. Tokens are ready to withdraw 52 to 65 hours after unstaking."
          }
        />
        <BalanceDisplay
          noBorder={true}
          label={"Available for withdrawal"}
          balance={getBalances().withdrawl}
          tooltipInfo={
            "These tokens have been unstaked, and are ready to be withdrawn."
          }
        />
      </div>
      {showWarning ? (
        <div className="d-flex gap-2 align-items-center rounded-2 bg-validator-warning">
          <i class="bi bi-exclamation-triangle"></i>
          You do not have any validators to unstake from. You must first stake
          tokens with a validator.
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
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
                disabled: selectedWallet?.value === lockupContract,
              }}
            />
          </div>
          <div className="d-flex flex-column gap-1">
            <label className="d-flex align-items-center justify-content-between">
              Amount to Unstake
              {validatorAccount && (
                <div
                  className="use-max-bg px-3 py-1 rounded-2"
                  onClick={() => {
                    setAmount(
                      formatNearAmount(
                        validatorAccount?.stakedBalance[selectedWallet.value]
                          ?.stakedBalance ?? 0
                      )
                    );
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
                  prefix: (
                    <img
                      src="${REPL_NEAR_TOKEN_ICON}"
                      style={{ height: 20, width: 20 }}
                    />
                  ),
                },
              }}
            />
            {validatorAccount && (
              <div className="d-flex align-items-center text-sm gap-1 text-muted">
                <div>Available to unstake:</div>
                <div>
                  {formatNearAmount(
                    validatorAccount?.stakedBalance[selectedWallet.value]
                      ?.stakedBalance ?? 0
                  )}{" "}
                  NEAR
                </div>
              </div>
            )}
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
                  root: "btn-outline shadow-none border-0",
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
                disabled: !validatorAccount || !amount || amountError,
                label: "Submit",
                onClick: onSubmitClick,
                loading: isTxnCreated,
              }}
            />
          </div>
        </div>
      )}
    </div>
  </Container>
);
