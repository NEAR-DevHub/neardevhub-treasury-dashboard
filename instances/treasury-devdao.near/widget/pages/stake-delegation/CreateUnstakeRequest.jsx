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
if (!instance) {
  return <></>;
}

const { treasuryDaoID, proposalIndexerQueryName, proposalIndexerHasuraRole } =
  VM.require(`${instance}/widget/config.data`);

const archiveNodeUrl = "https://rpc.mainnet.near.org/";

const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [nearStakedTotalTokens, setNearStakedTotalTokens] = useState(null);
const [poolWithBalance, setPoolWithBalance] = useState(null);
const [amount, setAmount] = useState(null);
const [validatorAccount, setValidatorAccount] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [notes, setNotes] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);
const [daoPolicy, setDaoPolicy] = useState(null);
const [amountError, setAmountError] = useState(null);
const [validatorError, setValidatorError] = useState(null);
const [stakedPools, setStakedPools] = useState(null);

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
  .green-btn {
    background-color: #04a46e !important;
    color: white;
  }

  .primary-text-color a {
    color: var(--theme-color) !important;
  }

  .balance-bg {
    background-color: #ecf8fb !important;
  }

  .text-green {
    color: #04a46e;
  }

  .validators-list {
    border: 1px solid #dee2e6;
    overflow-y: auto;
    height: 300px;
    padding: 10px;
    font-size: 13px;
  }

  .white-btn {
    background-color: white;
    border: 0.5px solid #e3e3e0;
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

  .border-left {
    border-left: 1px solid #dee2e6;
  }

  .use-max-bg {
    background-color: #ecf8fb;
    color: #1d62a8;
    cursor: pointer;
  }

  .text-red {
    color: #de4437;
  }

  .no-validator {
    font-weight: 500;
    font-size: 12px;
    padding: 10px;
    background-color: rgba(0, 16, 61, 0.06);
    color: #1b1b18;
  }

  .theme-btn {
    background-color: var(--theme-color) !important;
    color: white;
  }
`;

const nearBalances = getNearBalances(treasuryDaoID);

function getFeeOfStakedPools() {
  const promises = poolWithBalance.map((item) => {
    return Near.asyncView(item.pool, "get_reward_fee_fraction").then((i) => {
      return {
        pool_id: item.pool,
        fee: i.numerator / i.denominator,
        balance: new Big(item.stakedBalance).div(1e24).toFixed(4),
      };
    });
  });
  Promise.all(promises).then((res) => {
    setStakedPools(res);
  });
}

const nearPrice = useCache(
  () =>
    asyncFetch(`https://api3.nearblocks.io/v1/charts/latest`).then((res) => {
      return res.body.charts?.[0].near_price;
    }),
  "near-price",
  { subscribe: false }
);

function getNearValue(amount) {
  return Big(amount ?? "0")
    .mul(nearPrice ?? 1)
    .toFixed(4);
}

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

useEffect(() => {
  if (Array.isArray(poolWithBalance) && poolWithBalance.length) {
    getFeeOfStakedPools();
  }
}, [poolWithBalance]);

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
                method_name: "unstake",
                args: Buffer.from(
                  JSON.stringify({
                    amount: Big(amount).mul(Big(10).pow(24)).toFixed(),
                  })
                ).toString("base64"),
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

function cleanInputs() {
  setValidatorAccount("");
  setNotes("");
  setAmount("");
}

const loading = (
  <div className="w-100 h-100 d-flex align-items-center justify-content-center">
    <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
  </div>
);

function checkValidatorAccount() {
  if (
    !validatorAccount ||
    validatorAccount.endsWith("poolv1.near") ||
    validatorAccount.endsWith("pool.near")
  ) {
    return setValidatorError(null);
  }

  setValidatorError("Please enter a valid validator pool account.");
}

useEffect(() => {
  checkValidatorAccount();
}, [validatorAccount]);

const nearAvailableBalance = Big(
  nearBalances.availableParsed - (nearStakedTotalTokens ?? 0) ?? "0"
).toFixed(4);

useEffect(() => {
  const parsedAmount = parseFloat(amount);
  if (parsedAmount > parseFloat(nearStakedTokens)) {
    setAmountError("The amount exceeds the balance you have staked.");
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
        setPoolWithBalance: setPoolWithBalance,
        setNearStakedTotalTokens: (v) =>
          setNearStakedTotalTokens(Big(v).toFixed(4)),
      }}
    />
    {!Array.isArray(poolWithBalance) || !nearStakedTokens ? (
      loading
    ) : (
      <div>
        <div className="d-flex flex-column gap-3">
          <div className="border-line p-3 rounded-3 d-flex flex-column gap-3">
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
            {!poolWithBalance?.length ? (
              <div className="no-validator d-flex gap-2 align-items-center rounded-2">
                <img
                  src="https://ipfs.near.social/ipfs/bafkreig4jinzfotpj6yc5bo7ktqccnu6rc7g3i5wsekinqtxtyingvxf5e"
                  height={20}
                />
                You do not have any validators to unstake from. You must first
                stake tokens with a validator.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                <div className="d-flex flex-column gap-1">
                  <label>Choose Validator Account ID to Unstake From</label>
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
                    <div className="d-flex flex-column gap-2">
                      {Array.isArray(stakedPools) && stakedPools.length
                        ? (stakedPools ?? []).map((validator) => {
                            const { pool_id, fee, balance } = validator;
                            const isSelected = validatorAccount === pool_id;
                            return (
                              <div className="d-flex gap-2 align-items-center justify-content-between border-bottom py-2">
                                <div className="d-flex gap-2 align-items-center gap-2 flex-1">
                                  <div
                                    className="text-truncate"
                                    style={{ width: "50%" }}
                                  >
                                    <div className="text-sm">
                                      <span className="text-muted">
                                        {fee}% Fee{" "}
                                      </span>
                                      <span className="text-green">Active</span>
                                    </div>
                                    <div className="fw-bold"> {pool_id} </div>
                                  </div>
                                  <div
                                    style={{
                                      width: "1.5px",
                                      backgroundColor: "#687076",
                                      height: 50,
                                      marginRight: 10,
                                    }}
                                  ></div>
                                  <div>
                                    <div className="text-green"> Staked</div>
                                    <div className="fw-bold">{balance}NEAR</div>
                                    <div className="text-muted">
                                      ${getNearValue(balance)}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <button
                                    className={
                                      "rounded-2 border border-1 " +
                                      (isSelected
                                        ? "selected-btn "
                                        : "white-btn")
                                    }
                                    onClick={() => setValidatorAccount(pool_id)}
                                    disabled={isSelected}
                                  >
                                    {isSelected ? (
                                      <div className="d-flex gap-2 align-items-center">
                                        <i class="bi bi-check2 h6 mb-0"></i>
                                        Selected
                                      </div>
                                    ) : (
                                      "Select"
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        : loading}
                    </div>
                  </div>
                </div>
                <div className="d-flex flex-column gap-1">
                  <label className="d-flex align-items-center justify-content-between">
                    Amount to Unstake
                    {validatorAccount && (
                      <div
                        className="use-max-bg px-3 py-1 rounded-2"
                        onClick={() => {
                          const pool = stakedPools.find(
                            (i) => i.pool_id === validatorAccount
                          );
                          setAmount(pool?.balance);
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
                        min: "0",
                        type: "number",
                        prefix: (
                          <img
                            src="${REPL_NEAR_TOKEN_ICON}"
                            style={{ height: 20, width: 20 }}
                          />
                        ),
                      },
                    }}
                  />
                  <div className="d-flex align-items-center text-sm gap-1">
                    <div>Available to unstake:</div>
                    <div>{nearStakedTokens} NEAR</div>
                  </div>
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
                        !validatorAccount ||
                        !amount ||
                        amountError ||
                        validatorError,
                      label: "Submit",
                      onClick: onSubmitClick,
                      loading: isTxnCreated,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </Container>
);
