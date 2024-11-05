const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

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
`;

const [nearStakedTokens, setNearStakedTokens] = useState(null);
const [nearUnStakedTokens, setNearUnStakedTokens] = useState(null);
const [nearStakedTotalTokens, setNearStakedTotalTokens] = useState(null);
const nearBalances = getNearBalances(treasuryDaoID);

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

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

const totalBalance = Big(nearBalances?.totalParsed ?? "0")
  .mul(nearPrice ?? 1)
  .plus(Big(userFTTokens?.totalCummulativeAmt ?? "0"))
  .toFixed(4);

return (
  <Wrapper className="d-flex flex-column gap-3">
    <div className="d-flex justify-content-between gap-2 mt-3">
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.StakedNearIframe`}
        props={{
          instance,
          setNearStakedTokens: (v) => setNearStakedTokens(Big(v).toFixed(4)),
          setNearUnstakedTokens: (v) =>
            setNearUnStakedTokens(Big(v).toFixed(4)),
          setNearStakedTotalTokens: (v) =>
            setNearStakedTotalTokens(Big(v).toFixed(4)),
        }}
      />
      <h4 className="page-header">Dashboard</h4>
    </div>
    <div className="card card-body" style={{ maxHeight: "100px" }}>
      <div className="h5">Total Balance</div>
      {typeof getNearBalances !== "function" || nearPrice === null ? (
        loading
      ) : (
        <div className="fw-bold h3">${totalBalance} USD</div>
      )}
    </div>
    <div className="d-flex gap-2 flex-wrap dashboard-item">
      <Widget
        src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Portfolio"}
        props={{
          instance,
          ftTokens: userFTTokens.fts,
          nearStakedTokens,
          nearUnStakedTokens,
          nearPrice,
          nearStakedTotalTokens,
        }}
      />
      <Widget
        src={
          "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.TransactionHistory"
        }
        props={{
          nearPrice: nearPrice,
          ...props,
        }}
      />
    </div>
  </Wrapper>
);
