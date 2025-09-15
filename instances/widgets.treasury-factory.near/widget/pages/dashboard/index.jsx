const { getNearBalances, accountToLockup } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const instance = props.instance;

if (
  !instance ||
  typeof getNearBalances !== "function" ||
  !Skeleton ||
  typeof accountToLockup !== "function" ||
  !Modal ||
  typeof accountToLockup !== "function"
) {
  return <></>;
}
if (props.deposit) {
  return (
    <div className="w-100 h-100">
      <div className="d-flex flex-column gap-4">
        <div className="mx-auto">
          <div className="d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center">
              <a
                className="btn btn-outline-secondary d-flex gap-1 align-items-center"
                href={href({
                  widgetSrc: `${instance}/widget/app`,
                  params: {
                    page: "dashboard",
                  },
                })}
              >
                <i class="bi bi-arrow-left"></i> Back
              </a>
              <div className="h3 mb-0 position-absolute start-50 translate-middle-x">
                Deposit
              </div>
            </div>
            {props.deposit === "sputnik-dao" ? (
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.intents-deposit.SputnikDao`}
                props={{
                  instance,
                }}
              />
            ) : (
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.intents-deposit.Intents`}
                props={{
                  instance,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
const { treasuryDaoID, ftLockups } = VM.require(
  `${instance}/widget/config.data`
);

const lockupContract = accountToLockup(treasuryDaoID);

if (!treasuryDaoID) return <></>;

const Wrapper = styled.div`
  min-height: 80vh;
  .flex-1 {
    flex: 1;
  }

  .text-sm {
    font-size: 12px;
  }

  .border-bottom {
    border-bottom: 1px solid var(--border-color);
  }

  .text-align-end {
    text-align: end !important;
  }

  .pointer {
    cursor: pointer;
  }

  .dashboard-item > div {
    min-width: 280px;
  }

  .text-theme {
    color: var(--theme-color) !important;
  }

  .flex-container {
    min-width: 400px;
    height: fit-content;
  }

  @media screen and (max-width: 1000px) {
    .flex-container {
      width: 100%;
    }
  }

  .flex-3 {
    flex: 3;
  }
`;

const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [nearUnStakedTokens, setNearUnStakedTokens] = useState(null);
const [nearStakedTotalTokens, setNearStakedTotalTokens] = useState(null);
const [nearWithdrawTokens, setNearWithdrawTokens] = useState(null);
const nearBalances = getNearBalances(treasuryDaoID);
const lockupAccountBalances = getNearBalances(lockupContract);

const [lockupNearBalances, setLockupNearBalances] = useState(null);
const [lockupStakedTokens, setLockupStakedTokens] = useState(null);
const [lockupUnStakedTokens, setLockupUnStakedTokens] = useState(null);
const [lockupStakedTotalTokens, setLockupStakedTotalTokens] = useState(null);
const [lockupNearWithdrawTokens, setLockupNearWithdrawTokens] = useState(null);
const [nearPrice, setNearPrice] = useState(null);
const [daoFTTokens, setFTTokens] = useState(null);
const [show404Modal, setShow404Modal] = useState(false);
const [disableRefreshBtn, setDisableRefreshBtn] = useState(false);
const [lockupState, setLockupState] = useState(false);
const [intentsTotalUsdBalance, setIntentsTotalUsdBalance] = useState("0"); // New state for intents balance
const [isFtLockupCollapsed, setIsFtLockupCollapsed] = useState(true);
const [fullyClaimedFtLockups, setFullyClaimedFtLockups] = useState([]);
const [partiallyClaimedFtLockups, setPartiallyClaimedFtLockups] = useState([]);
const [ftLockupBalance, setFtLockupBalance] = useState(null);
const [refreshData, setRefreshData] = useState(false);

useEffect(() => {
  asyncFetch(`${REPL_BACKEND_API}/near-price`)
    .then((res) => {
      if (typeof res.body === "number") {
        setNearPrice(res.body);
      } else {
        setShow404Modal(true);
      }
    })
    .catch((err) => {
      setShow404Modal(true);
    });
  asyncFetch(`${REPL_BACKEND_API}/ft-tokens/?account_id=${treasuryDaoID}`)
    .then((res) => {
      if (typeof res.body.totalCumulativeAmt === "number") {
        setFTTokens(res.body);
      } else {
        setShow404Modal(true);
      }
    })
    .catch((err) => {
      setShow404Modal(true);
    });
}, [refreshData]);

useEffect(() => {
  if (
    ftLockups?.length &&
    !(fullyClaimedFtLockups?.length || partiallyClaimedFtLockups?.length)
  ) {
    Promise.all(
      ftLockups.map(async (ftLockup) => {
        return Near.asyncView(ftLockup, "get_account", {
          account_id: treasuryDaoID,
        }).then((res) => {
          return {
            ...res,
            contractId: ftLockup,
          };
        });
      })
    ).then((res) => {
      // Categorize FT lockups based on claim status
      const fullyClaimed = [];
      const partiallyClaimed = [];

      res.forEach((ftLockup) => {
        const claimedAmount = Big(ftLockup.claimed_amount).toFixed();

        if (Big(claimedAmount).gte(Big(ftLockup.deposited_amount))) {
          fullyClaimed.push(ftLockup);
        } else {
          partiallyClaimed.push(ftLockup);
        }
      });

      setFullyClaimedFtLockups(fullyClaimed);
      setPartiallyClaimedFtLockups(partiallyClaimed);
    });
  }
}, [ftLockups]);

// disable refresh btn for 30 seconds
useEffect(() => {
  if (show404Modal) {
    setDisableRefreshBtn(true);
  }
}, [show404Modal]);

useEffect(() => {
  let timer;

  if (disableRefreshBtn) {
    timer = setTimeout(() => {
      setDisableRefreshBtn(false);
    }, 30_000);
  }

  return () => {
    clearTimeout(timer);
  };
}, [disableRefreshBtn]);

function formatNearAmount(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(2);
}

useEffect(() => {
  if (lockupContract) {
    Near.asyncView(lockupContract, "get_locked_amount").then((res) => {
      setLockupNearBalances((prev) => ({
        ...prev,
        contractLocked: res,
        locked: res,
        lockedParsed: formatNearAmount(res),
      }));
    });

    asyncFetch(`${REPL_RPC_URL}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "view_state",
          finality: "final",
          account_id: lockupContract,
          prefix_base64: "",
        },
      }),
    }).then((res) => setLockupState(atob(res.body?.result?.values?.[0].value)));
  }
}, [lockupContract]);

useEffect(() => {
  if (
    lockupAccountBalances &&
    (lockupNearBalances.locked || lockupNearBalances.locked === 0) &&
    lockupStakedTotalTokens &&
    !lockupNearBalances.total
  ) {
    const stakedTokensYoctoNear = Big(lockupStakedTotalTokens)
      .mul(Big(10).pow(24))
      .toFixed();
    const allLockedStaked = Big(lockupStakedTotalTokens).gte(
      lockupNearBalances.lockedParsed
    );
    let locked = allLockedStaked
      ? 0
      : Big(lockupStakedTotalTokens)
          .minus(lockupNearBalances.lockedParsed)
          .abs()
          .mul(Big(10).pow(24))
          .toFixed();

    let total = Big(lockupAccountBalances.total)
      .plus(stakedTokensYoctoNear)
      .toFixed();

    let available = Big(total)
      .minus(stakedTokensYoctoNear)
      .minus(locked)
      .minus(lockupAccountBalances.storage)
      .toFixed();

    if (available < 0) {
      available = 0;
    }

    let storage = lockupAccountBalances.storage;
    const sumTotal = Big(locked)
      .plus(available)
      .plus(stakedTokensYoctoNear)
      .plus(storage);
    if (Big(total).lt(sumTotal)) {
      storage = Big(storage).minus(sumTotal.minus(total)).toFixed();
    }

    setLockupNearBalances((prev) => ({
      ...lockupAccountBalances,
      ...prev,
      storage,
      storageParsed: formatNearAmount(storage),
      available: available,
      availableParsed: formatNearAmount(available),
      total: total,
      totalParsed: formatNearAmount(total),
      locked,
      lockedParsed: formatNearAmount(locked),
    }));
  }
}, [lockupNearBalances, lockupAccountBalances, lockupStakedTotalTokens]);

const totalBalance = Big(nearBalances?.totalParsed ?? "0")
  .mul(nearPrice ?? 1)
  .plus(Big(nearStakedTotalTokens ?? "0").mul(nearPrice ?? 1))
  .plus(Big(lockupNearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1))
  .plus(Big(daoFTTokens?.totalCumulativeAmt ?? "0"))
  .plus(Big(intentsTotalUsdBalance ?? "0")) // Add intents balance
  .plus(Big(ftLockupBalance ?? "0"))
  .toFixed(2);

function formatCurrency(amount) {
  const formattedAmount = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return "$" + formattedAmount;
}

const TooManyRequestModal = () => {
  return (
    <Modal>
      <ModalHeader>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex gap-3 align-items-center">
            <img
              src="https://ipfs.near.social/ipfs/bafkreiggx7y2qhmywarmefat4bfnm3yndnrx4fsz4e67gkwkcqmggmzadq"
              height={30}
              width={50}
            />
            Please wait a moment... 
          </div>
          <i
            className="bi bi-x-lg h4 mb-0 cursor-pointer"
            onClick={() => setShow404Modal(false)}
          ></i>
        </div>
      </ModalHeader>
      <ModalContent>
        We're experiencing a high volume of requests right now. Some
        information, such as token prices, might be temporarily unavailable.
        Please wait a few minutes before refreshing. Thanks for your patience.
      </ModalContent>
      <ModalFooter>
        <Widget
          loading=""
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
          props={{
            classNames: {
              root: "btn btn-outline-secondary shadow-none no-transparent",
            },
            label: "Close",
            onClick: () => setShow404Modal(false),
          }}
        />
        <a style={{ all: "unset" }} href={`app?page=dashboard`}>
          <Widget
            loading=""
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
            props={{
              classNames: { root: "theme-btn" },
              label: "Refresh",
              disabled: disableRefreshBtn,
            }}
          />
        </a>
      </ModalFooter>
    </Modal>
  );
};

const Loading = () => {
  return (
    <div className="d-flex align-items-center gap-2 w-100 mt-2 mb-2">
      <div className="d-flex flex-column gap-1 w-75">
        <Skeleton
          style={{ height: "32px", width: "100%" }}
          className="rounded-2"
        />
      </div>
      <div className="d-flex flex-column gap-1 w-25">
        <Skeleton
          style={{ height: "32px", width: "100%" }}
          className="rounded-2"
        />
      </div>
    </div>
  );
};

return (
  <Wrapper>
    {show404Modal && <TooManyRequestModal />}

    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
      props={{
        accountId: treasuryDaoID,
        setNearStakedTokens: (v) => setNearStakedTokens(Big(v).toFixed(2)),
        setNearUnstakedTokens: (v) => setNearUnStakedTokens(Big(v).toFixed(2)),
        setNearStakedTotalTokens: (v) =>
          setNearStakedTotalTokens(Big(v).toFixed(2)),
        setNearWithdrawTokens: (v) => setNearWithdrawTokens(Big(v).toFixed(2)),
      }}
    />
    {lockupContract && (
      <Widget
        loading=""
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
        }}
      />
    )}
    <div className="d-flex gap-3 flex-wrap">
      <div
        className="d-flex flex-column gap-3 flex-container"
        style={{ flex: 1.1 }}
      >
        <div className="card card-body" style={{ minHeight: "100px" }}>
          {" "}
          {/* Adjusted minHeight for button */}
          <div className="h6 text-secondary">Total Balance</div>
          {typeof getNearBalances !== "function" ||
          nearPrice === null ||
          daoFTTokens === null ? (
            <Loading />
          ) : (
            <>
              <div className="fw-bold h3 mb-0">
                <span data-testid="total-balance">
                  {formatCurrency(totalBalance)} USD
                </span>
                <div className="mt-2">
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.intents-deposit.DepositButton`}
                    props={{
                      instance,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <Widget
          loading=""
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Portfolio"
          }
          props={{
            ftTokens: daoFTTokens.fts ? daoFTTokens.fts : null,
            nearStakedTokens,
            nearUnStakedTokens,
            nearPrice,
            nearStakedTotalTokens,
            nearBalances,
            nearWithdrawTokens,
            heading: (
              <div className="d-flex flex-column gap-1 px-3 pt-3 pb-2">
                <div className="h5 mb-0">Sputnik DAO</div>
                <div>
                  <span className="text-sm text-secondary">Wallet: </span>
                  <span className="text-theme text-sm fw-medium">
                    {treasuryDaoID}
                  </span>
                </div>
              </div>
            ),
            instance,
          }}
        />
        <Widget
          loading=""
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.IntentsPortfolio"
          }
          props={{
            onTotalBalanceChange: setIntentsTotalUsdBalance,
            treasuryDaoID,
            heading: (
              <div className="px-3 pt-3 pb-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="h5 mb-0">NEAR Intents </div>
                  <Widget
                    loading=""
                    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                    props={{
                      popup: (
                        <div>
                          The total token amount includes all transfers across
                          different networks. Network details are available
                          below in the distribution section.
                        </div>
                      ),
                      children: (
                        <i className="bi bi-info-circle text-secondary"></i>
                      ),
                      instance,
                    }}
                  />
                </div>
              </div>
            ),
            instance,
          }}
        />
        {lockupContract && (
          <Widget
            loading=""
            src={
              "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Portfolio"
            }
            props={{
              ftTokens: [],
              isLockupContract: true,
              lockupState,
              nearStakedTokens: lockupStakedTokens,
              nearUnStakedTokens: lockupUnStakedTokens,
              nearPrice,
              nearWithdrawTokens: lockupNearWithdrawTokens,
              nearBalances: lockupNearBalances,
              nearStakedTotalTokens: lockupStakedTotalTokens,
              heading: (
                <div className="d-flex flex-column gap-1 px-3 pt-3 pb-2">
                  <div className="h5 mb-0">NEAR Lockup</div>
                  <div>
                    <span className="text-sm text-secondary">Wallet: </span>
                    <span className="text-theme text-sm fw-medium">
                      {lockupContract}
                    </span>
                  </div>
                </div>
              ),
              instance,
            }}
          />
        )}
        {/* Partially claimed FT lockups - always visible */}
        {partiallyClaimedFtLockups.map((ftLockup) => (
          <Widget
            key={ftLockup.contractId}
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.FtLockupPortfolio`}
            props={{
              contractId: ftLockup.contractId,
              metadata: ftLockup,
              instance,
              treasuryDaoID,
              setFtLockupBalance: (balance) => {
                setFtLockupBalance((prev) =>
                  Big(prev ?? 0)
                    .plus(balance)
                    .toFixed()
                );
              },
              refreshData: () => setRefreshData(!refreshData),
            }}
          />
        ))}

        {/* Fully claimed FT lockups - collapsible */}
        {fullyClaimedFtLockups.length > 0 && (
          <div className="d-flex flex-column gap-2">
            <div className="collapse" id="hidden-ft-lockup">
              {fullyClaimedFtLockups.map((ftLockup) => (
                <Widget
                  key={ftLockup.contractId}
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.FtLockupPortfolio`}
                  props={{
                    contractId: ftLockup.contractId,
                    instance,
                    treasuryDaoID,
                    metadata: ftLockup,
                  }}
                />
              ))}
            </div>
            <button
              className="btn btn-outline-secondary w-100"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#hidden-ft-lockup"
              aria-expanded={!isFtLockupCollapsed}
              aria-controls="hidden-ft-lockup"
              onClick={() => setIsFtLockupCollapsed(!isFtLockupCollapsed)}
            >
              {isFtLockupCollapsed ? "Show History" : "Show Less"}
            </button>
          </div>
        )}
      </div>
      <div className="d-flex flex-column gap-2 flex-wrap dashboard-item flex-container flex-3">
        <Widget
          loading=""
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.ChartParent"
          }
          props={{
            title: "Sputnik DAO",
            nearPrice,
            nearBalance: nearBalances?.totalParsed ?? "0",
            totalBalance: formatCurrency(
              Big(nearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1)
            ),
            ftTokens: daoFTTokens.fts ? daoFTTokens.fts : null,
            instance,
            accountId: treasuryDaoID,
          }}
        />

        {/* Intents Chart */}
        <Widget
          loading=""
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.IntentsHistoricalGraph"
          }
          props={{
            title: "Intents",
            instance,
          }}
        />

        {/* Lockup Chart */}
        {lockupContract && (
          <Widget
            loading=""
            src={
              "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.ChartParent"
            }
            props={{
              title: "NEAR Lockup",
              nearPrice,
              instance,
              nearBalance: lockupNearBalances?.totalParsed ?? "0",
              totalBalance: formatCurrency(
                Big(lockupNearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1)
              ),
              ftTokens: [], // lockup doesn't have any FTs
              accountId: lockupContract,
            }}
          />
        )}

        {/* Transaction History */}
        <Widget
          loading=""
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.TransactionHistory"
          }
          props={{ nearPrice, ...props }}
        />
      </div>
    </div>
  </Wrapper>
);
