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

function onSubmitClick() {
  setTxnCreated(true);
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;
  const description = {
    proposal_action: "stake",
    notes: notes,
  };

  const isLockupContractSelected = lockupContract === selectedWallet.value;
  const actions = [];

  actions.push(
    isLockupContractSelected
      ? {
          method_name: "withdraw_all_from_staking_pool",
          args: "",
          deposit: "0",
          gas: "250000000000000",
        }
      : {
          method_name: "withdraw_all",
          args: "",
          deposit: "0",
          gas: "200000000000000",
        }
  );

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
            actions: actions,
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

      <div className="d-flex gap-2 align-items-center rounded-2 bg-validator-info">
        <i class="bi bi-info-circle"></i>
        By submitting you create request to withdraw all available amount.
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
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
