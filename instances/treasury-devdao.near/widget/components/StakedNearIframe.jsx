const accountId = props.accountId;

if (!accountId) {
  return <></>;
}

const setNearStakedTotalTokens = props.setNearStakedTotalTokens || (() => {});
const setNearUnstakedTokens = props.setNearUnstakedTokens || (() => {});
const setNearStakedTokens = props.setNearStakedTokens || (() => {});
const setNearWithdrawTokens = props.setNearWithdrawTokens || (() => {});

const setPoolWithBalance = props.setPoolWithBalance || (() => {});

const code = `
  <!doctype html>
  <html>
    <body>
    <script>
    const archiveNodeUrl = "https://archival-rpc.mainnet.near.org";
    const treasuryDaoID = "${accountId}";
  
    async function getAccountStakedBalance(stakingpool_id, account_id) {
      const response = await fetch(archiveNodeUrl, {
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
            finality: "final",
            account_id: stakingpool_id,
            method_name: "get_account_staked_balance",
            args_base64: btoa(
              JSON.stringify({
                account_id: account_id,
              })
            ),
          },
        }),
      });
      const result = await response.json();
      return parseInt(
        result.result.result
          .map((c) => String.fromCharCode(c))
          .join("")
          .replace(/\"/g, "")
      );
    }
  
    async function getAccountUnStakedBalance(stakingpool_id, account_id) {
      const response = await fetch(archiveNodeUrl, {
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
            finality: "final",
            account_id: stakingpool_id,
            method_name: "get_account_unstaked_balance",
            args_base64: btoa(
              JSON.stringify({
                account_id: account_id,
              })
            ),
          },
        }),
      });
      const result = await response.json();
      return parseInt(
        result.result.result
          .map((c) => String.fromCharCode(c))
          .join("")
          .replace(/\"/g, "")
      );
    }
  
    async function isAccountUnstakedBalanceAvailable(stakingpool_id, account_id) {
      const response = await fetch(archiveNodeUrl, {
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
            finality: "final",
            account_id: stakingpool_id,
            method_name: "is_account_unstaked_balance_available",
            args_base64: btoa(
              JSON.stringify({
                account_id: account_id,
              })
            ),
          },
        }),
      });
  
      const result = await response.json();
  
      if (result?.result?.result) {
        const decodedResult = result.result.result
          .map((c) => String.fromCharCode(c))
          .join("");
        return decodedResult.trim() === "true";
      }
  
      throw new Error("Invalid response format or data not found");
    }
  
    async function getStakingPools() {
      return await fetch("https://api.fastnear.com/v1/account/" + treasuryDaoID + "/staking").then(r => r.json())
    }
  
    window.onload = async () => {
      const poolResp = await getStakingPools();
      const pools = await Promise.all(
        poolResp.pools.map(async (pool) => {
          const stakedBalance = await getAccountStakedBalance(
            pool.pool_id,
            poolResp.account_id
          );
          let unstakedBalance = await getAccountUnStakedBalance(
            pool.pool_id,
            poolResp.account_id
          );
          const isUnstakedBalanceAvailable =
            await isAccountUnstakedBalanceAvailable(
              pool.pool_id,
              poolResp.account_id
            );  
          let availableToWithdrawBalance = 0;
          if (isUnstakedBalanceAvailable) {
            availableToWithdrawBalance = unstakedBalance;
            unstakedBalance = 0;
          }
  
          return {
            pool: pool.pool_id,
            stakedBalance,
            unstakedBalance,
            availableToWithdrawBalance,
          };
        })
      );
  
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
          let stakedBalance = new Big(0);
          let unstakedBalance = new Big(0);
          let availableToWithdrawBalance = new Big(0);
          pools.forEach((pool) => {
            stakedBalance = stakedBalance.plus(
              new Big(pool.stakedBalance).div(1e24)
            );
            unstakedBalance = unstakedBalance.plus(
              new Big(pool.unstakedBalance).div(1e24)
            );
            availableToWithdrawBalance = availableToWithdrawBalance.plus(
              new Big(pool.availableToWithdrawBalance).div(1e24)
            );
          });
          const totalBalance = stakedBalance
            .plus(unstakedBalance)
            .plus(availableToWithdrawBalance);
          setNearStakedTotalTokens(totalBalance.toFixed() ?? "0");
          setNearUnstakedTokens(unstakedBalance.toFixed() ?? "0");
          setNearWithdrawTokens(availableToWithdrawBalance.toFixed() ?? "0");
          setNearStakedTokens(stakedBalance.toFixed() ?? "0");
          setPoolWithBalance(pools);
          break;
      }
    }}
  />
);

return iframe;
