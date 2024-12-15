const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;
const onCloseCanvas = props.onCloseCanvas ?? (() => {});

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
const [lockupStakedPoolId, setLockupStakedPoolId] = useState(null);
const [lockupAlreadyStaked, setLockupAlreadyStaked] = useState(false);

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

function getAllStakingPools() {
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
    if (Array.isArray(resp.body.result.current_validators)) {
      const validatorsAccounts = resp.body.result.current_validators;
      const promises = validatorsAccounts.map((item) => {
        return Near.asyncView(item.account_id, "get_reward_fee_fraction").then(
          (feeData) => {
            const nearpoolBalance = (nearStakedPoolsWithBalance ?? [])?.find(
              (pool) => pool.pool === item.account_id
            );
            const lockupPool = (lockupStakedPoolsWithBalance ?? [])?.find(
              (pool) => pool.pool === item.account_id
            );
            return {
              pool_id: item.account_id,
              fee: feeData.numerator,
              stakedBalance: {
                [treasuryDaoID]: nearpoolBalance,
                [lockupContract]: lockupPool,
              },
            };
          }
        );
      });

      Promise.all(promises).then((res) => {
        setValidators(res);
      });
    }
  });
}

useEffect(() => {
  if (
    Array.isArray(nearStakedPoolsWithBalance) &&
    ((lockupContract && Array.isArray(lockupStakedPoolsWithBalance)) ||
      !lockupContract)
  ) {
    getAllStakingPools();
  }
}, [nearStakedPoolsWithBalance, lockupStakedPoolsWithBalance, lockupContract]);

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
            customNotes: "Approve to continue staking with this validator",
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
      <div className="d-flex flex-column gap-1 border border-1 rounded-3 p-2">
        <BalanceDisplay
          label={"Ready to stake"}
          balance={getBalances().available}
          tooltipInfo={
            "This is your spendable NEAR balance, and can be staked."
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
            <i class="bi bi-info-circle"></i>
            You cannot split the locked amount across multiple validators. To
            change your validator, you must first unstake and withdraw the
            entire amount.
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
              prefix: (
                <img
                  src="${REPL_NEAR_TOKEN_ICON}"
                  style={{ height: 20, width: 20 }}
                />
              ),
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
  </Container>
);
