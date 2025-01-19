const { getNearBalances, LOCKUP_MIN_BALANCE_FOR_STORAGE } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

const instance = props.instance;

if (
  !instance ||
  typeof getNearBalances !== "function" ||
  !LOCKUP_MIN_BALANCE_FOR_STORAGE ||
  !Skeleton
) {
  return <></>;
}

const { treasuryDaoID, lockupContract } = VM.require(
  `${instance}/widget/config.data`
);

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
`;

const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [nearUnStakedTokens, setNearUnStakedTokens] = useState(null);
const [nearStakedTotalTokens, setNearStakedTotalTokens] = useState(null);
const [nearWithdrawTokens, setNearWithdrawTokens] = useState(null);
const nearBalances = getNearBalances(treasuryDaoID);

const [lockupNearBalances, setLockupNearBalances] = useState(null);
const [lockupStakedTokens, setLockupStakedTokens] = useState(null);
const [lockupUnStakedTokens, setLockupUnStakedTokens] = useState(null);
const [lockupStakedTotalTokens, setLockupStakedTotalTokens] = useState(null);
const [lockupNearWithdrawTokens, setLockupNearWithdrawTokens] = useState(null);
const [nearPrice, setNearPrice] = useState(null);
const [userFTTokens, setFTTokens] = useState(null);

useEffect(() => {
  asyncFetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd`
  ).then((res) => {
    if (res.body.near?.usd) {
      setNearPrice(res.body.near?.usd);
    }
  });

  asyncFetch(
    `https://api3.nearblocks.io/v1/account/${treasuryDaoID}/inventory`,
    { headers: { Authorization: "Bearer ${REPL_NEARBLOCKS_KEY}" } }
  ).then((res) => {
    let fts = res.body.inventory.fts;
    if (fts)
      fts = fts.sort(
        (a, b) => b.amount * b.ft_meta.price - a.amount * a.ft_meta.price
      );

    const amounts = fts.map((ft) => {
      const amount = ft.amount;
      const decimals = ft.ft_meta.decimals;
      const tokensNumber = Big(amount ?? "0")
        .div(Big(10).pow(decimals))
        .toFixed();
      const tokenPrice = ft.ft_meta.price;
      return Big(tokensNumber)
        .mul(tokenPrice ?? 0)
        .toFixed();
    });
    setFTTokens({
      totalCummulativeAmt: amounts.reduce(
        (acc, value) => acc + parseFloat(value),
        0
      ),
      fts,
    });
  });
}, []);

function formatNearAmount(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(2);
}

useEffect(() => {
  if (lockupContract) {
    Near.asyncView(lockupContract, "get_locked_amount").then((res) => {
      const locked = Big(res).minus(LOCKUP_MIN_BALANCE_FOR_STORAGE).toFixed(2);
      setLockupNearBalances((prev) => ({
        ...prev,
        locked,
        lockedParsed: formatNearAmount(locked),
        storage: LOCKUP_MIN_BALANCE_FOR_STORAGE,
        storageParsed: formatNearAmount(LOCKUP_MIN_BALANCE_FOR_STORAGE),
      }));
    });

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

const totalBalance = Big(nearBalances?.totalParsed ?? "0")
  .mul(nearPrice ?? 1)
  .plus(Big(lockupNearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1))
  .plus(Big(userFTTokens?.totalCummulativeAmt ?? "0"))
  .toFixed(2);

function formatCurrency(amount) {
  const formattedAmount = Number(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + formattedAmount;
}

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
    <Widget
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
      <div className="d-flex flex-column gap-3 flex-container">
        <div className="card card-body" style={{ maxHeight: "100px" }}>
          <div className="h6 text-secondary">Total Balance</div>
          {typeof getNearBalances !== "function" ||
          nearPrice === null ||
          userFTTokens === null ? (
            <Loading />
          ) : (
            <div className="fw-bold h3 mb-0">
              {formatCurrency(totalBalance)} USD
            </div>
          )}
        </div>
        <Widget
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Portfolio"
          }
          props={{
            ftTokens: userFTTokens.fts ?? null,
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
        {lockupContract && (
          <Widget
            src={
              "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Portfolio"
            }
            props={{
              ftTokens: [],
              isLockupContract: true,
              nearStakedTokens: lockupStakedTokens,
              nearUnStakedTokens: lockupUnStakedTokens,
              nearPrice,
              nearWithdrawTokens: lockupNearWithdrawTokens,
              nearBalances: lockupNearBalances,
              nearStakedTotalTokens: lockupStakedTotalTokens,
              heading: (
                <div className="d-flex flex-column gap-1 px-3 pt-3 pb-2">
                  <div className="h5 mb-0">Lockup</div>
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
      </div>
      <div className="d-flex flex-column gap-2 flex-wrap dashboard-item flex-1 flex-container">
        <Widget
          src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Chart"}
          props={{
            title: "Treasury Assets: Sputnik DAO",
            nearPrice,
            totalBalance: formatCurrency(
              Big(nearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1)
            ),
            ftTokens: userFTTokens.fts ?? null,
            instance,
            accountId: treasuryDaoID,
          }}
        />

        {lockupContract && (
          <Widget
            src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Chart"}
            props={{
              title: "Treasury Assets: Lockup",
              nearPrice,
              instance,
              totalBalance: formatCurrency(
                Big(lockupNearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1)
              ),
              ftTokens: userFTTokens.fts ?? null,
              accountId: lockupContract,
            }}
          />
        )}
        <Widget
          src={
            "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.TransactionHistory"
          }
          props={{ nearPrice, ...props }}
        />
      </div>
    </div>
  </Wrapper>
);
