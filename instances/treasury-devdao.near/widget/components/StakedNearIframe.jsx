const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const setNearStakedTokens = props.setNearStakedTokens || (() => {});
const setPoolWithBalance = props.setPoolWithBalance || (() => {});

const code = `
  <!doctype html>
  <html>
    <body>
      <script>
        const archiveNodeUrl = "https://archival-rpc.mainnet.near.org";
        const treasuryDaoID = "${treasuryDaoID}"
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
        return await fetch("https://api.fastnear.com/v1/account/" + treasuryDaoID + "/staking").then(r => r.json())
      }
      window.onload = async () => {
        const poolResp = await getStakingPools();
        const pools = await Promise.all(poolResp.pools.map(async (i) => {
          const balance = await getAccountBalance(i.pool_id, poolResp.account_id);
          return {pool: i.pool_id, balance};
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
    onMessage={(e) => {
      switch (e.handler) {
        case "stakedNearPool":
          const pools = e.pools;
          let sum = new Big(0);
          pools.forEach((pool) => {
            let bigNum = new Big(pool.balance).div(1e24);
            sum = sum.plus(bigNum);
          });
          setNearStakedTokens(sum.toFixed() ?? "0");
          setPoolWithBalance(pools);
          break;
      }
    }}
  />
);

return iframe;
