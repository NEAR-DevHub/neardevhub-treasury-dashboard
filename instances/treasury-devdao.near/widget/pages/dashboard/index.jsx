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

const DEFAULT_FTS = [
  {
    contract: "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near",
    ft_meta: {
      symbol: "USDC.e",
      decimals: 6,
      price: 1.0,
      icon: "data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Ccircle cx='16' cy='16' r='16' fill='%232775C9'/%3E%3Cpath d='M15.75 27.5C9.26 27.5 4 22.24 4 15.75S9.26 4 15.75 4 27.5 9.26 27.5 15.75A11.75 11.75 0 0115.75 27.5zm-.7-16.11a2.58 2.58 0 00-2.45 2.47c0 1.21.74 2 2.31 2.33l1.1.26c1.07.25 1.51.61 1.51 1.22s-.77 1.21-1.77 1.21a1.9 1.9 0 01-1.8-.91.68.68 0 00-.61-.39h-.59a.35.35 0 00-.28.41 2.73 2.73 0 002.61 2.08v.84a.705.705 0 001.41 0v-.85a2.62 2.62 0 002.59-2.58c0-1.27-.73-2-2.46-2.37l-1-.22c-1-.25-1.47-.58-1.47-1.14 0-.56.6-1.18 1.6-1.18a1.64 1.64 0 011.59.81.8.8 0 00.72.46h.47a.42.42 0 00.31-.5 2.65 2.65 0 00-2.38-2v-.69a.705.705 0 00-1.41 0v.74zm-8.11 4.36a8.79 8.79 0 006 8.33h.14a.45.45 0 00.45-.45v-.21a.94.94 0 00-.58-.87 7.36 7.36 0 010-13.65.93.93 0 00.58-.86v-.23a.42.42 0 00-.56-.4 8.79 8.79 0 00-6.03 8.34zm17.62 0a8.79 8.79 0 00-6-8.32h-.15a.47.47 0 00-.47.47v.15a1 1 0 00.61.9 7.36 7.36 0 010 13.64 1 1 0 00-.6.89v.17a.47.47 0 00.62.44 8.79 8.79 0 005.99-8.34z' fill='%23FFF'/%3E%3C/g%3E%3C/svg%3E",
    },
  },
  {
    contract: "dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near",
    ft_meta: {
      symbol: "USDT.e",
      decimals: 6,
      price: 1.0,
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle cx='16' cy='16' r='16' fill='%2326A17B'/%3E%3Cpath fill='%23FFF' d='M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117'/%3E%3C/g%3E%3C/svg%3E",
    },
  },
];

const userFTTokens = useCache(
  () =>
    asyncFetch(
      `https://api3.nearblocks.io/v1/account/${treasuryDaoID}/inventory`
    ).then((res) => {
      const fts = res.body.inventory.fts ?? DEFAULT_FTS;
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
            title: "Treasury Assets: Sputnik DAO",
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
              title: "Treasury Assets: Lockup",
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
