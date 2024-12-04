const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;

const { treasuryDaoID, lockupContract } = VM.require(
  `${instance}/widget/config.data`
);

if (!instance || !treasuryDaoID) return <></>;

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

  .text-grey {
    color: rgba(153, 153, 153, 1);
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

const nearPrice = useCache(
  () =>
    asyncFetch(`https://api3.nearblocks.io/v1/charts/latest`).then((res) => {
      return res.body.charts?.[0].near_price;
    }),
  "price",
  { subscribe: false }
);

const userFTTokens = useCache(
  () =>
    asyncFetch(
      `https://api3.nearblocks.io/v1/account/${treasuryDaoID}/inventory`
    ).then((res) => {
      const fts = res.body.inventory.fts;
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
      return {
        totalCummulativeAmt: amounts.reduce(
          (acc, value) => acc + parseFloat(value),
          0
        ),
        fts,
      };
    }),
  "all-token-amount",
  { subscribe: false }
);

function formatNearAmount(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(4);
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

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

const totalBalance = Big(nearBalances?.totalParsed ?? "0")
  .mul(nearPrice ?? 1)
  .plus(Big(lockupNearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1))
  .plus(Big(userFTTokens?.totalCummulativeAmt ?? "0"))
  .toFixed(4);

function formatCurrency(amount) {
  const formattedAmount = Number(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + formattedAmount;
}

return (
  <Wrapper>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
      props={{
        accountId: treasuryDaoID,
        setNearStakedTokens: (v) => setNearStakedTokens(Big(v).toFixed(4)),
        setNearUnstakedTokens: (v) => setNearUnStakedTokens(Big(v).toFixed(4)),
        setNearStakedTotalTokens: (v) =>
          setNearStakedTotalTokens(Big(v).toFixed(4)),
        setNearWithdrawTokens: (v) => setNearWithdrawTokens(Big(v).toFixed(4)),
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
        }}
      />
    )}
    <div className="d-flex gap-3 flex-wrap">
      <div className="d-flex flex-column gap-3 flex-container">
        <div className="card card-body" style={{ maxHeight: "100px" }}>
          <div className="h6 text-grey">Total Balance</div>
          {typeof getNearBalances !== "function" || nearPrice === null ? (
            loading
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
            ftTokens: userFTTokens.fts,
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
                  <span className="text-sm text-grey">Wallet: </span>
                  <span className="text-theme  text-sm fw-bold">
                    {treasuryDaoID}
                  </span>
                </div>
              </div>
            ),
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
                    <span className="text-sm text-grey">Wallet: </span>
                    <span className="text-theme  text-sm fw-bold">
                      {lockupContract}
                    </span>
                  </div>
                </div>
              ),
            }}
          />
        )}
      </div>
      <div className="d-flex flex-column gap-2 flex-wrap dashboard-item flex-1 flex-container">
        <Widget
          src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Chart"}
          props={{
            nearPrice,
            totalBalance: formatCurrency(
              Big(nearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1)
            ),
            ftTokens: userFTTokens.fts,
            accountId: treasuryDaoID,
          }}
        />

        {lockupContract && (
          <Widget
            src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Chart"}
            props={{
              nearPrice,
              totalBalance: formatCurrency(
                Big(lockupNearBalances?.totalParsed ?? "0").mul(nearPrice ?? 1)
              ),
              ftTokens: userFTTokens.fts,
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
