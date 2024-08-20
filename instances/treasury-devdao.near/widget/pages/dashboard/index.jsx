const treasuryAccount = "${REPL_TREASURY}";

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
    min-width: 400px;
  }
`;

const [nearStakedTokens, setNearStakedTokens] = useState(null);

const balanceResp = fetch(
  `https://api3.nearblocks.io/v1/account/${treasuryAccount}`
);
const nearBalance = Big(balanceResp?.body?.account?.[0]?.amount ?? "0")
  .div(Big(10).pow(24))
  .toFixed();

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
      `https://api3.nearblocks.io/v1/account/${treasuryAccount}/inventory`
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

const code = `
  <!doctype html>
  <html>
    <body>
      <script>
        const archiveNodeUrl = "https://archival-rpc.mainnet.near.org";
        const treasuryAccount = "${treasuryAccount}"

        async function getAccountBalance(stakingpool_id, account_id) {
        return await fetch(archiveNodeUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "dontcare",
            method: "query",
            params: {
              request_type: "call_function",
              finality: 'final',
              account_id: stakingpool_id,
              method_name: "get_account_total_balance",
              args_base64: btoa(
                JSON.stringify({
                  account_id: account_id,
                })
              ),
            },
          }),
        })
          .then((r) => r.json())
          .then((r) =>
            parseInt(
              r.result.result
                .map((c) => String.fromCharCode(c))
                .join("")
                .replace(/\"/g, "")
            )
          );
      }

      async function getStakingPools() {
        return await fetch("https://api.fastnear.com/v1/account/" + treasuryAccount + "/staking").then(r => r.json())
      }

      window.onload = async () => {
        const poolResp = await getStakingPools();
        const pools = await Promise.all(poolResp.pools.map(async (i) => {
          const balance = await getAccountBalance(i.pool_id, poolResp.account_id);
          return balance;
        }));
        window.parent.postMessage({ handler: "stakedNearPool", pools }, "*");
      };
      </script>
    </body>
  </html> 
  `;

const iframe = (
  <iframe
    style={{
      display: "none",
    }}
    srcDoc={code}
    message={{}}
    onMessage={(e) => {
      switch (e.handler) {
        case "stakedNearPool":
          const pools = e.pools;
          let sum = new Big(0);
          pools.forEach((num) => {
            let bigNum = new Big(num).div(1e24);
            sum = sum.plus(bigNum);
          });
          setNearStakedTokens(sum.toFixed());
          break;
      }
    }}
  />
);

const totalBalance = Big(nearBalance ?? "0")
  .plus(Big(nearStakedTokens ?? 0 ?? "0"))
  .mul(nearPrice ?? 1)
  .plus(Big(userFTTokens?.totalCummulativeAmt ?? "0"))
  .toFixed(4);

return (
  <Wrapper className="d-flex flex-column gap-3">
    <div className="d-flex justify-content-between gap-2 mt-3">
      {iframe}
      <h4 className="page-header">Dashboard</h4>
    </div>
    <div className="card card-body" style={{ maxHeight: "100px" }}>
      <div className="h5">Total Balance</div>
      {balanceResp === null || nearPrice === null ? (
        loading
      ) : (
        <div className="fw-bold h3">${totalBalance} USD</div>
      )}
    </div>
    <div className="d-flex gap-2 flex-wrap dashboard-item">
      <Widget
        src={"${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.Portfolio"}
        props={{
          ftTokens: userFTTokens.fts,
          nearStakedTokens: nearStakedTokens,
          nearBalance: nearBalance,
          nearPrice: nearPrice,
        }}
      />
      <Widget
        src={
          "${REPL_DEPLOYMENT_ACCOUNT}/widget/pages.dashboard.TransactionHistory"
        }
        props={{
          nearPrice: nearPrice,
        }}
      />
    </div>
  </Wrapper>
);
