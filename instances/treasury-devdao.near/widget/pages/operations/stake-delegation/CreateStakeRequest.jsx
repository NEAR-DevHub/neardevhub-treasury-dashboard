const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const treasuryAccount = "${REPL_TREASURY}";
const archiveNodeUrl = "https://rpc.mainnet.near.org/";
const [validators, setValidators] = useState([]);

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
`;

const balanceResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryAccount}`
);
const nearBalance = Big(balanceResp?.body?.account?.[0]?.amount ?? "0")
  .div(Big(10).pow(24))
  .toFixed(4);

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

const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [amount, setAmount] = useState(null);
const [validatorAccount, setValidatorAccount] = useState(null);

function onStake() {
  Near.call({
    contractName: validatorAccount,
    methodName: "deposit_and_stake",
    args: {},
    deposit: Big(amount).mul(Big(10).pow(24)).toFixed(),
    gas: 200000000000000,
  });
}

const loading = (
  <div
    style={{ height: "80vh" }}
    className="w-100 d-flex align-items-center justify-content-center"
  >
    <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
  </div>
);

if (
  !Array.isArray(validators) ||
  validators.length === 0 ||
  nearBalance === null
) {
  return loading;
}

return (
  <Container className="container-xxl">
    <Widget
      src={`${REPL_TREASURY}/widget/components.StakedNearIframe`}
      props={{
        setNearStakedTokens: (v) => setNearStakedTokens(Big(v).toFixed(4)),
      }}
    />
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
        <div className="h5 bolder my-2 text-center">Create Staking Request</div>
        <div className="border-line p-3 rounded-3 d-flex flex-column gap-3">
          <div className="d-flex flex-column gap-1">
            <label>From Wallet: {treasuryAccount}</label>
            <div class="balance-bg px-3 py-2 rounded-2 d-flex flex-column gap-2">
              <div className="text-green">
                Available balance:{" "}
                <span className="fw-bold"> {nearBalance}</span>
                NEAR
              </div>
              <div className="text-muted">Staked : {nearStakedTokens} NEAR</div>
            </div>
          </div>
          <div className="d-flex flex-column gap-1">
            <label>Amount to Stake in NEAR</label>
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
          <div className="d-flex flex-column gap-1">
            <label>Choose Validator Account ID</label>
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
              <div className="d-flex flex-column gap-2">
                {validators.map((validator) => {
                  const { pool_id, fee } = validator;
                  const isSelected = validatorAccount === pool_id;
                  return (
                    <div className="d-flex gap-2 align-items-center justify-content-between">
                      <div>
                        <div className="fw-bold"> {pool_id} </div>
                        <div className="text-sm">
                          <span className="text-muted">{fee}% Fee - </span>
                          <span className="text-green">active</span>
                        </div>
                      </div>
                      <div>
                        <button
                          className="white-btn"
                          onClick={() => setValidatorAccount(pool_id)}
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
                onClick: onStake,
              }}
            />
          </div>
        </div>
      </Wrapper>
    </div>
  </Container>
);
