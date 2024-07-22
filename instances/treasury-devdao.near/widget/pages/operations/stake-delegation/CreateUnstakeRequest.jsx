const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const treasuryAccount = "${REPL_TREASURY}";
const archiveNodeUrl = "https://rpc.mainnet.near.org/";

const Wrapper = styled.div`
  width: 50%;
  margin: auto;
  @media screen and (max-width: 1300px) {
    width: 60%;
  }
  @media screen and (max-width: 1000px) {
    width: 100%;
  }

  .border-line {
    border: 2px solid rgba(236, 238, 240, 1);
  }
`;

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
    background-color: #f4f4f4;
    overflow-y: auto;
    height: 300px;
  }

  .white-btn {
    background-color: white;
    border: 0.5px solid #e3e3e0;
    padding-inline: 0.7rem;
    padding-block: 0.3rem;
    font-weight: 500;
  }

  .use-max-bg {
    background-color: #ecf8fb;
    color: #1d62a8;
    cursor: pointer;
  }

  .text-red {
    color: #de4437;
  }
`;

const balanceResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryAccount}`
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

const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [poolWithBalance, setPoolWithBalance] = useState(null);
const [amount, setAmount] = useState(null);
const [validatorAccount, setValidatorAccount] = useState(null);

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

function onUnstake() {
  Near.call({
    contractName: validatorAccount,
    methodName: "unstake",
    args: {
      amount: Big(amount).mul(Big(10).pow(24)).toFixed(),
    },
    gas: 200000000000000,
  });
}

const loading = (
  <div
    style={{ height: "45vh" }}
    className="w-100 d-flex align-items-center justify-content-center"
  >
    <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
  </div>
);

return (
  <Container className="container-xxl">
    <Widget
      src={`${REPL_TREASURY}/widget/components.StakedNearIframe`}
      props={{
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
        <div className="d-flex gap-1 align-items-center mb-2 bolder h6 primary-text-color">
          <Link
            to={href({
              widgetSrc: `${REPL_TREASURY}/widget/app`,
              params: {
                page: "operations",
                tab: "stake-delegation",
              },
            })}
          >
            <div className="">Stake Delegation</div>
          </Link>
          <span>/</span>
          <div style={{ fontWeight: 700 }}>Create New</div>
        </div>
        <div className="card card-body">
          <Wrapper className="d-flex gap-3 flex-column">
            <div className="h5 bolder my-2 text-center">
              Create Staking Request
            </div>
            <div className="border-line p-3 rounded-3 d-flex flex-column gap-3">
              <div className="d-flex flex-column gap-1">
                <label>From Wallet: {treasuryAccount}</label>
                <div class="balance-bg px-3 py-2 rounded-2 d-flex flex-column gap-2">
                  <div className="text-green">
                    Available balance:{" "}
                    <span className="fw-bold"> {nearBalance}</span>
                    NEAR
                  </div>
                  <div className="text-muted">
                    Staked :{" "}
                    <span className="fw-bold">{nearStakedTokens} </span>
                    NEAR (${getNearValue(nearStakedTokens)})
                  </div>
                </div>
              </div>
              {!stakedValidators.length ? (
                <div
                  className="validators-list p-3 mt-2 rounded-3 d-flex flex-column gap-2"
                  style={{ height: 110 }}
                >
                  <div className="text-muted text-sm">
                    Your current validators:
                  </div>
                  <div className="text-red d-flex gap-2 align-items-center">
                    <img
                      src="https://ipfs.near.social/ipfs/bafkreieq4222tf3hkbccfnbw5kpgedm3bf2zcfgzbnmismxav2phqdwd7q"
                      height={20}
                    />
                    You do not have any validators to unstake from. You must
                    first stake tokens with a validator.
                  </div>
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
                    <div className="validators-list p-3 mt-2 rounded-3">
                      <div className="text-muted">Your current validators:</div>
                      <div className="d-flex flex-column gap-2">
                        {stakedValidators.map((validator) => {
                          const { account, fee, isActive, stakedAmt } =
                            validator;
                          const isSelected = validatorAccount === account;
                          return (
                            <div className="d-flex gap-2 align-items-center justify-content-between">
                              <div
                                className="d-flex gap-2 align-items-center gap-2"
                                style={{ flex: 1 }}
                              >
                                <div style={{ width: "50%" }}>
                                  <div className="fw-bold"> {account} </div>
                                  <div className="text-sm">
                                    <span className="text-muted">
                                      {fee}% Fee -{" "}
                                    </span>
                                    <span className="text-green">
                                      {isActive && "active"}
                                    </span>
                                  </div>
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
                                  <div className="text-green"> Staking</div>
                                  <div className="fw-bold">
                                    {" "}
                                    {stakedAmt}NEAR
                                  </div>
                                  <div className="text-muted">
                                    ${getNearValue(stakedAmt)}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <button
                                  className="white-btn"
                                  onClick={() => setValidatorAccount(account)}
                                  disabled={isSelected}
                                >
                                  {isSelected ? "Selected" : "Select"}
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
                      Amount to Unstake in NEAR
                      {validatorAccount && (
                        <div
                          className="use-max-bg px-3 py-1"
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
                        },
                      }}
                    />
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>Available to unstake:</div>
                    <div>{nearStakedTokens} NEAR</div>
                  </div>
                  <div className="d-flex mt-2 gap-3 justify-content-end">
                    <Link
                      to={href({
                        widgetSrc: `${REPL_TREASURY}/widget/app`,
                        params: {
                          page: "operations",
                          tab: "stake-delegation",
                        },
                      })}
                    >
                      <Widget
                        src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                        props={{
                          classNames: {
                            root: "btn-outline-danger shadow-none border-0",
                          },
                          label: "Cancel",
                        }}
                      />
                    </Link>
                    <Widget
                      src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                      props={{
                        classNames: { root: "green-btn" },
                        disabled: !amount || !validatorAccount,
                        label: "Submit",
                        onClick: onUnstake,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Wrapper>
        </div>
      </div>
    )}
  </Container>
);
