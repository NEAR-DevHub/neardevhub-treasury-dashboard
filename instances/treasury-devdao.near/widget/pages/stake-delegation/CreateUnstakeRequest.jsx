const { getLinkUsingCurrentGateway } = VM.require(
  "${REPL_DEVHUB}/widget/core.lib.url"
) || { getLinkUsingCurrentGateway: () => {} };

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
const [poolWithBalance, setPoolWithBalance] = useState(null);
const [amount, setAmount] = useState(null);
const [validatorAccount, setValidatorAccount] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [notes, setNotes] = useState(null);
const [showCancelModal, setShowCancelModal] = useState(false);

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
`;

const balanceResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryDaoID}`
);
const nearBalance = Big(balanceResp?.body?.account?.[0]?.amount ?? "0")
  .div(Big(10).pow(24))
  .toFixed(4);

function getAllStakingPools() {
  return fetch("https://api.nearblocks.io/v1/validators");
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

const allValidators = getAllStakingPools();
let stakedValidators = [];
if (
  allValidators !== null &&
  Array.isArray(allValidators?.body?.validatorFullData) &&
  Array.isArray(poolWithBalance)
) {
  stakedValidators = allValidators.body.validatorFullData.reduce(
    (acc, validator) => {
      const pool = poolWithBalance.find((i) => i.pool === validator.accountId);
      if (pool) {
        acc.push({
          account: validator.accountId,
          fee:
            validator.poolInfo.fee.numerator /
            validator.poolInfo.fee.denominator,
          isActive: validator.stakingStatus === "active",
          stakedAmt: new Big(pool.balance).div(1e24).toFixed(4),
        });
      }
      return acc;
    },
    []
  );
}

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
            actions: {
              method_name: "unstake",
              args: {
                amount: Big(amount).mul(Big(10).pow(24)).toFixed(),
              },
              deposit: "0",
              gas: 200000000000000,
            },
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
      }}
    />
    {!Array.isArray(allValidators?.body?.validatorFullData) ||
    nearBalance === null ||
    !nearStakedTokens ? (
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
                    <h6 className="mb-0">{nearBalance}</h6>
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
            {!stakedValidators.length ? (
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
                      onChange: (e) => setValidatorAccount(e.target.value),
                      placeholder: "validator-name.near",
                      value: validatorAccount,
                    }}
                  />
                  <div className="validators-list mt-2 rounded-3">
                    <div className="d-flex flex-column gap-2">
                      {stakedValidators.map((validator) => {
                        const { account, fee, isActive, stakedAmt } = validator;
                        const isSelected = validatorAccount === account;
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
                                  <span className="text-green">
                                    {isActive && "Active"}
                                  </span>
                                </div>
                                <div className="fw-bold"> {account} </div>
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
                                <div className="fw-bold"> {stakedAmt}NEAR</div>
                                <div className="text-muted">
                                  ${getNearValue(stakedAmt)}
                                </div>
                              </div>
                            </div>
                            <div>
                              <button
                                className={
                                  "rounded-2 border border-1 " +
                                  (isSelected ? "selected-btn " : "white-btn")
                                }
                                onClick={() => setValidatorAccount(account)}
                                disabled={isSelected}
                              >
                                {isSelected ? (
                                  <div className="d-flex gap-2 align-items-center">
                                    <i class="bi bi-check2 h6 mb-0"></i>Selected
                                  </div>
                                ) : (
                                  "Select"
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
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
                          const pool = stakedValidators.find(
                            (i) => i.account === validatorAccount
                          );
                          setAmount(pool?.stakedAmt);
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
                      onChange: (e) => setAmount(e.target.value),
                      placeholder: "Enter amount",
                      value: amount,
                      inputProps: {
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
                      disabled: !validatorAccount || !amount,
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
