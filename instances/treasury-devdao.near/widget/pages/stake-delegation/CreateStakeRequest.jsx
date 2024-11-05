const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };

const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const onCloseCanvas = props.onCloseCanvas ?? (() => {});

const instance = props.instance;
if (!instance || typeof getNearBalances !== "function") {
  return <></>;
}

const { treasuryDaoID, proposalIndexerQueryName, proposalIndexerHasuraRole } =
  VM.require(`${instance}/widget/config.data`);

const archiveNodeUrl = "https://rpc.mainnet.near.org/";
const [validators, setValidators] = useState([]);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [notes, setNotes] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [amount, setAmount] = useState(null);
const [validatorAccount, setValidatorAccount] = useState(null);
const [daoPolicy, setDaoPolicy] = useState(null);
const [validatorError, setValidatorError] = useState(null);
const [amountError, setAmountError] = useState(null);

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

function refreshData() {
  Storage.set("REFRESH_STAKE_TABLE_DATA", Math.random());
}

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
  .rounded-pill {
    border-radius: 5px !important;
  }
  .theme-btn {
    background-color: var(--theme-color) !important;
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

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: #ff9e00;
  }

  .validators-list {
    border: 1px solid #dee2e6;
    overflow-y: auto;
    height: 300px;
    padding: 10px;
  }

  .white-btn {
    background-color: white;
    padding-inline: 0.7rem;
    padding-block: 0.3rem;
    font-weight: 500;
  }

  .selected-btn {
    background-color: var(--theme-color);
    padding-inline: 0.7rem;
    padding-block: 0.3rem;
    font-weight: 500;
    color: white;
    border: none !important;
  }

  .text-green {
    color: #34c759;
  }

  .border-left {
    border-left: 1px solid #dee2e6;
  }

  .use-max-bg {
    background-color: #ecf8fb;
    color: #1d62a8;
    cursor: pointer;
  }
`;

const nearBalances = getNearBalances(treasuryDaoID);

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
          (i) => {
            return {
              pool_id: item.account_id,
              fee: i.numerator / i.denominator,
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
  getAllStakingPools();
}, []);

function onSubmitClick() {
  setTxnCreated(true);
  const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;
  const description = {
    isStakeRequest: true,
    notes: notes,
  };
  Near.call({
    contractName: treasuryDaoID,
    methodName: "add_proposal",
    args: {
      proposal: {
        description: JSON.stringify(description),
        kind: {
          FunctionCall: {
            receiver_id: validatorAccount,
            actions: [
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
}

const [displayCount, setDisplayCount] = useState(10); // Start with a small number of items

const loadMoreItems = () => {
  setDisplayCount((prevCount) => prevCount + 10); // Increment display count
};

const renderedItems = (validators ?? [])
  .slice(0, displayCount)
  .map((validator) => {
    const { pool_id, fee } = validator;
    const isSelected = validatorAccount === pool_id;
    return (
      <div
        key={pool_id}
        className="d-flex gap-2 align-items-center justify-content-between border-bottom py-2"
      >
        <div className="flex-1 text-truncate">
          <div className="text-sm">
            <span className="text-muted">{fee}% Fee </span>
            <span className="text-green">Active</span>
          </div>
          <div className="fw-bold"> {pool_id} </div>
        </div>
        <div>
          <button
            className={
              "rounded-2 border border-1 " +
              (isSelected ? "selected-btn " : "white-btn")
            }
            onClick={() => setValidatorAccount(pool_id)}
            disabled={isSelected}
          >
            {isSelected ? (
              <div className="d-flex gap-2 align-items-center">
                <i className="bi bi-check2 h6 mb-0"></i>Selected
              </div>
            ) : (
              "Select"
            )}
          </button>
        </div>
      </div>
    );
  });

const loading = (
  <div className="w-100 h-100 d-flex align-items-center justify-content-center">
    <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
  </div>
);

if (!Array.isArray(validators) || validators.length === 0) {
  return loading;
}

function checkValidatorAccount(str) {
  if (
    !validatorAccount ||
    validatorAccount.endsWith("poolv1.near") ||
    validatorAccount.endsWith("pool.near")
  ) {
    return setValidatorError(null);
  }

  setValidatorError("Please enter a valid validator pool account.");
}

const nearAvailableBalance = Big(
  nearBalances.availableParsed - (nearStakedTokens ?? 0) ?? "0"
).toFixed(4);

useEffect(() => {
  checkValidatorAccount();
}, [validatorAccount]);

useEffect(() => {
  const parsedAmount = parseFloat(amount);
  if (parsedAmount > parseFloat(nearAvailableBalance)) {
    setAmountError("Your account doesn't have sufficient balance.");
  } else {
    setAmountError(null);
  }
}, [amount]);

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
        instance,
        setNearStakedTokens: (v) => setNearStakedTokens(Big(v).toFixed(4)),
      }}
    />
    <div className="d-flex flex-column gap-3">
      <div className="d-flex gap-1 border border-1 rounded-3 px-2">
        <div className="flex-1">
          <div
            className={
              "d-flex gap-2 align-items-center py-3 justify-content-center"
            }
          >
            <i class="bi bi-safe h5 mb-0"></i>
            <div>
              <div className="text-green fw-bold">Available Balance</div>
              <h6 className="mb-0">{nearAvailableBalance}</h6>
            </div>
          </div>
        </div>

        <div className="border-left d-flex gap-2 align-items-center flex-1 py-3 justify-content-center">
          <i class="bi bi-lock h5 mb-0"></i>
          <div>
            <div className="text-muted fw-bold">Staked</div>
            <h6>{nearStakedTokens} NEAR</h6>
          </div>
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <label>Validator</label>
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Input`}
          props={{
            className: "flex-grow-1",
            key: `validator`,
            onBlur: (e) => setValidatorAccount(e.target.value),
            placeholder: "validator-name.near",
            value: validatorAccount,
            error: validatorError,
          }}
        />
        <div className="validators-list mt-2 rounded-3">
          <InfiniteScroll
            pageStart={0}
            loadMore={loadMoreItems}
            hasMore={displayCount < validators.length}
            loader={loading}
            useWindow={false}
          >
            <div className="d-flex flex-column gap-2">{renderedItems}</div>
          </InfiniteScroll>
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        <label className="d-flex align-items-center justify-content-between">
          Amount to Stake
          {validatorAccount && (
            <div
              className="use-max-bg px-3 py-1 rounded-2"
              onClick={() => {
                setAmount(nearAvailableBalance);
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
            disabled:
              !validatorAccount || !amount || amountError || validatorError,
            label: "Submit",
            onClick: onSubmitClick,
            loading: isTxnCreated,
          }}
        />
      </div>
    </div>
  </Container>
);
