const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const {
  getNearBalances,
  decodeProposalDescription,
  formatSubmissionTimeStamp,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const instance = props.instance;
const policy = props.policy;
const { RowsSkeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);
if (
  !instance ||
  !RowsSkeleton ||
  typeof getNearBalances !== "function" ||
  typeof decodeProposalDescription !== "function" ||
  typeof formatSubmissionTimeStamp !== "function"
) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const tokenDisplayLib =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.tokenDisplay") || null;

const proposals = props.proposals;
const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.SettingsDropdown`
  ) ?? "[]"
);

const highlightProposalId =
  props.highlightProposalId ||
  props.highlightProposalId === "0" ||
  props.highlightProposalId === 0
    ? parseInt(props.highlightProposalId)
    : null;

const loading = props.loading;
const isPendingRequests = props.isPendingRequests;
const functionCallApproversGroup = props.functionCallApproversGroup;
const deleteGroup = props.deleteGroup;
const refreshTableData = props.refreshTableData;

const accountId = context.accountId;

// State for token icons, token mapping, and prices
const [tokenIcons, setTokenIcons] = useState({});
const [tokenMap, setTokenMap] = useState({});
const [oneClickPrices, setOneClickPrices] = useState({});
const [networkNames, setNetworkNames] = useState({});

// Initialize the token display library with state references
if (tokenDisplayLib && tokenDisplayLib.init) {
  tokenDisplayLib.init({
    tokenIcons,
    networkNames,
    setTokenIcons,
    setNetworkNames,
  });
}

// Fetch 1Click token mappings and prices
useEffect(() => {
  asyncFetch("https://1click.chaindefuser.com/v0/tokens")
    .then((res) => {
      if (res.body && Array.isArray(res.body)) {
        const mapping = {};
        // Create a mapping from NEAR contract addresses to symbols
        // Look for tokens that have assetId starting with "nep141:" and extract the contract address
        for (const token of res.body) {
          if (token.assetId && token.assetId.startsWith("nep141:")) {
            // Extract the contract address from assetId (e.g., "nep141:eth.omft.near" -> "eth.omft.near")
            const contractAddress = token.assetId.replace("nep141:", "");
            mapping[contractAddress.toLowerCase()] = token.symbol;
          }
        }
        setTokenMap(mapping);
      }
    })
    .catch((err) => {
      console.log("Failed to fetch 1Click token mappings:", err);
    });

  // Fetch 1Click token prices once for all tokens
  if (tokenDisplayLib) {
    tokenDisplayLib.fetch1ClickTokenPrices().then((prices) => {
      setOneClickPrices(prices);
    });
  }
}, []);

// Map 1Click contract addresses to token symbols using fetched data
function getTokenSymbolFromAddress(address) {
  if (!address || typeof address !== "string") return address;
  return tokenMap[address.toLowerCase()] || address;
}

const hasVotingPermission = (
  functionCallApproversGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const Container = styled.div`
  font-size: 13px;
  min-height: 60vh;

  table {
    overflow-x: auto;

    thead td {
      text-wrap: nowrap;
    }
  }

  .text-warning {
    color: var(--other-warning) !important;
  }
`;

function updateVoteSuccess(status, proposalId) {
  props.setToastStatus(status);
  props.setVoteProposalId(proposalId);
  props.onSelectRequest(null);
  refreshTableData();
}

function checkProposalStatus(proposalId) {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: proposalId,
  })
    .then((result) => {
      updateVoteSuccess(result.status, proposalId);
    })
    .catch(() => {
      // deleted request (thus proposal won't exist)
      updateVoteSuccess("Removed", proposalId);
    });
}

function isVisible(column) {
  return columnsVisibility.find((i) => i.title === column)?.show !== false
    ? ""
    : "display-none";
}

const requiredVotes = functionCallApproversGroup.requiredVotes;

const hideApproversCol = isPendingRequests && requiredVotes === 1;

const proposalPeriod = policy.proposal_period;

const daoFTTokens = fetch(
  `${REPL_BACKEND_API}/ft-tokens/?account_id=${treasuryDaoID}`
);

const nearBalances = getNearBalances(treasuryDaoID);

const hasOneDeleteIcon =
  isPendingRequests &&
  hasDeletePermission &&
  (proposals ?? []).find(
    (i) =>
      i.proposer === accountId &&
      !Object.keys(i.votes ?? {}).includes(accountId)
  );

// Collect tokens that need icons to be fetched
const tokensToFetch = [];
const tokenSet = new Set();
if (proposals) {
  for (let i = 0; i < proposals.length; i++) {
    const item = proposals[i];
    const tokenIn = decodeProposalDescription("tokenIn", item.description);
    const tokenOut = decodeProposalDescription("tokenOut", item.description);
    const quoteDeadlineStr = decodeProposalDescription(
      "quoteDeadline",
      item.description
    );

    // For 1Click exchanges, fetch icons for the mapped symbols
    if (quoteDeadlineStr && tokenIn) {
      const tokenSymbol = getTokenSymbolFromAddress(tokenIn);
      if (!tokenSymbol.includes(".") && !tokenSet.has(tokenSymbol)) {
        tokenSet.add(tokenSymbol);
        tokensToFetch.push(tokenSymbol);
      }
    } else if (tokenIn && !tokenIn.includes(".") && !tokenSet.has(tokenIn)) {
      tokenSet.add(tokenIn);
      tokensToFetch.push(tokenIn);
    }

    if (tokenOut && !tokenOut.includes(".") && !tokenSet.has(tokenOut)) {
      tokenSet.add(tokenOut);
      tokensToFetch.push(tokenOut);
    }
  }
}

const ProposalsComponent = () => {
  return (
    <tbody style={{ overflowX: "auto" }}>
      {proposals?.map((item) => {
        const notes = decodeProposalDescription("notes", item.description);
        const amountIn = decodeProposalDescription(
          "amountIn",
          item.description
        );
        const tokenIn = decodeProposalDescription("tokenIn", item.description);
        const tokenOut = decodeProposalDescription(
          "tokenOut",
          item.description
        );
        const slippage = decodeProposalDescription(
          "slippage",
          item.description
        );
        const amountOut = decodeProposalDescription(
          "amountOut",
          item.description
        );

        const outEstimate = parseFloat(amountOut) || 0;
        const slippageValue = parseFloat(slippage) || 0;
        const minAmountReceive = Number(
          outEstimate * (1 - slippageValue / 100)
        );

        // Extract quote deadline from JSON for 1Click API proposals
        let quoteDeadline = null;
        let isQuoteExpired = false;
        const quoteDeadlineStr = decodeProposalDescription(
          "quoteDeadline",
          item.description
        );
        if (quoteDeadlineStr) {
          // Parse the ISO string deadline
          quoteDeadline = new Date(quoteDeadlineStr);
          const currentTime = Date.now();
          isQuoteExpired = quoteDeadline.getTime() < currentTime;
        }

        // Determine source wallet
        const sourceWallet = quoteDeadlineStr ? "NEAR Intents" : "SputnikDAO";
        return (
          <tr
            data-testid={"proposal-request-#" + item.id}
            onClick={() => {
              props.onSelectRequest(item.id);
            }}
            className={
              "cursor-pointer proposal-row " +
              (highlightProposalId === item.id ||
              props.selectedProposalDetailsId === item.id
                ? "bg-highlight"
                : "")
            }
          >
            <td className="fw-semi-bold">{item.id}</td>
            <td className={isVisible("Created Date")}>
              <Widget
                loading=""
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
                props={{
                  timestamp: item.submission_time / 1e6,
                  format: "date-time",
                  instance,
                }}
              />
            </td>
            {!isPendingRequests && (
              <td>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
                  props={{
                    instance,
                    isVoteStatus: false,
                    status: item.status,
                  }}
                />
              </td>
            )}

            <td className={"text-left"} style={{ minWidth: 150 }}>
              <div className="fw-semi-bold">{sourceWallet}</div>
            </td>

            <td className={"text-right " + isVisible("Send")}>
              {quoteDeadlineStr ? (
                // For 1Click exchanges, use TokenAmount with symbol prop
                <div className="d-flex flex-column align-items-end">
                  <div className="d-flex align-items-center justify-content-end gap-1">
                    <Widget
                      loading=""
                      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                      props={{
                        instance,
                        amountWithDecimals: amountIn,
                        symbol: getTokenSymbolFromAddress(tokenIn), // Pass mapped symbol for 1Click tokens
                        showUSDValue: true,
                        price:
                          oneClickPrices[getTokenSymbolFromAddress(tokenIn)] ||
                          undefined,
                      }}
                    />
                    {tokenDisplayLib?.getTokenIcon &&
                      tokenDisplayLib.getTokenIcon(
                        getTokenSymbolFromAddress(tokenIn)
                      ) && (
                        <img
                          src={tokenDisplayLib.getTokenIcon(
                            getTokenSymbolFromAddress(tokenIn)
                          )}
                          width="16"
                          height="16"
                          alt={getTokenSymbolFromAddress(tokenIn)}
                          style={{ borderRadius: "50%" }}
                        />
                      )}
                  </div>
                </div>
              ) : (
                // For regular exchanges, use TokenAmount with address prop (original behavior)
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                  props={{
                    instance,
                    amountWithDecimals: amountIn,
                    address: tokenIn,
                    showUSDValue: true,
                  }}
                />
              )}
            </td>
            <td className={isVisible("Receive") + " text-right"}>
              {quoteDeadlineStr ? (
                // For 1Click exchanges, use TokenAmount with symbol prop
                <div className="d-flex flex-column align-items-end">
                  <div className="d-flex align-items-center justify-content-end gap-1">
                    <Widget
                      loading=""
                      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                      props={{
                        instance,
                        amountWithDecimals: amountOut,
                        symbol: tokenOut, // tokenOut is already a symbol, not a contract address
                        showUSDValue: true,
                        price: oneClickPrices[tokenOut] || undefined,
                      }}
                    />
                    {tokenDisplayLib?.getTokenIcon &&
                      tokenDisplayLib.getTokenIcon(tokenOut) && (
                        <img
                          src={tokenDisplayLib.getTokenIcon(tokenOut)}
                          width="16"
                          height="16"
                          alt={tokenOut}
                          style={{ borderRadius: "50%" }}
                        />
                      )}
                  </div>
                </div>
              ) : (
                // For regular exchanges, use TokenAmount with address prop (original behavior)
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                  props={{
                    instance,
                    amountWithDecimals: amountOut,
                    address: tokenOut,
                    showUSDValue: true,
                  }}
                />
              )}
            </td>
            <td className={isVisible("Minimum received") + " text-right"}>
              {quoteDeadlineStr ? (
                // For 1Click exchanges, use TokenAmount with symbol prop
                <div className="d-flex align-items-center justify-content-end gap-1">
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                    props={{
                      instance,
                      amountWithDecimals: minAmountReceive,
                      symbol: tokenOut, // tokenOut is already a symbol, not a contract address
                      showUSDValue: true,
                      price: oneClickPrices[tokenOut] || undefined,
                    }}
                  />
                  {tokenIcons[tokenOut] && (
                    <img
                      src={tokenIcons[tokenOut]}
                      width="16"
                      height="16"
                      alt={tokenOut}
                      style={{ borderRadius: "50%" }}
                    />
                  )}
                </div>
              ) : (
                // For regular exchanges, use TokenAmount with address prop (original behavior)
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
                  props={{
                    instance,
                    amountWithDecimals: minAmountReceive,
                    address: tokenOut,
                    showUSDValue: true,
                  }}
                />
              )}
            </td>

            <td className={"fw-semi-bold text-center " + isVisible("Creator")}>
              <div className="d-inline-block">
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                  props={{
                    accountId: item.proposer,
                    showKYC: false,
                    displayImage: false,
                    displayName: false,
                    instance,
                  }}
                />
              </div>
            </td>
            <td className={"text-sm text-left " + isVisible("Notes")}>
              {notes ?? "-"}
            </td>
            {isPendingRequests && (
              <td className={isVisible("Required Votes") + " text-center"}>
                {requiredVotes}
              </td>
            )}
            {isPendingRequests && (
              <td className={isVisible("Votes") + " text-center"}>
                <Widget
                  loading=""
                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Votes`}
                  props={{
                    votes: item.votes,
                    requiredVotes,
                    isInProgress: true,
                  }}
                />
              </td>
            )}
            <td
              className={
                isVisible("Approvers") +
                " text-center " +
                (hideApproversCol && " display-none")
              }
              style={{ minWidth: 100 }}
            >
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Approvers`}
                props={{
                  votes: item.votes,
                  approversGroup: functionCallApproversGroup?.approverAccounts,
                }}
              />
            </td>

            {isPendingRequests && (
              <td
                className={isVisible("Expiring Date") + " text-left"}
                style={{ minWidth: 150 }}
              >
                {formatSubmissionTimeStamp(
                  item.submission_time,
                  proposalPeriod,
                  instance
                )}
              </td>
            )}
            {isPendingRequests &&
              (hasVotingPermission || hasDeletePermission) && (
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.VoteActions`}
                    props={{
                      instance,
                      votes: item.votes,
                      proposalId: item.id,
                      hasDeletePermission,
                      hasVotingPermission,
                      proposalCreator: item.proposer,
                      nearBalance: nearBalances.available,
                      currentAmount: amountIn,
                      currentContract: tokenIn,
                      requiredVotes,
                      isHumanReadableCurrentAmount: true,
                      checkProposalStatus: () => checkProposalStatus(item.id),
                      hasOneDeleteIcon,
                      proposal: item,
                      isQuoteExpired,
                      quoteDeadline,
                    }}
                  />
                </td>
              )}
          </tr>
        );
      })}
    </tbody>
  );
};

return (
  <Container style={{ overflowX: "auto" }}>
    <table className="table">
      <thead>
        <tr className="text-secondary">
          <td>#</td>
          <td
            className={isVisible("Created Date") + " cursor-pointer"}
            onClick={props.handleSortClick}
            style={{ color: "var(--text-color)" }}
          >
            Created Date
            <span style={{ marginLeft: 4 }}>
              {props.sortDirection === "desc" ? (
                <i class="bi bi-arrow-down"></i>
              ) : (
                <i class="bi bi-arrow-up"></i>
              )}
            </span>
          </td>
          {!isPendingRequests && <td className={"text-center"}>Status</td>}
          <td className={"text-left"}>Source Wallet</td>
          <td className={isVisible("Send") + " text-right"}>Send</td>
          <td className={isVisible("Receive") + " text-right"}>Receive</td>
          <td className={isVisible("Minimum received") + " text-right"}>
            Minimum received
          </td>

          <td className={isVisible("Creator") + " text-center"}>Created by</td>
          <td className={isVisible("Notes") + " text-left"}>Notes</td>
          {isPendingRequests && (
            <td className={isVisible("Required Votes") + " text-center"}>
              Required Votes
            </td>
          )}
          {isPendingRequests && (
            <td className={isVisible("Votes") + " text-center"}>Votes</td>
          )}
          <td
            className={
              isVisible("Approvers") +
              " text-center " +
              (hideApproversCol && " display-none")
            }
          >
            Approvers
          </td>
          {isPendingRequests && (
            <td className={isVisible("Expiring Date") + " text-left "}>
              Expiring Date
            </td>
          )}
          {isPendingRequests &&
            (hasVotingPermission || hasDeletePermission) && (
              <td className="text-right">Actions</td>
            )}
        </tr>
      </thead>

      {loading === true ||
      proposals === null ||
      functionCallApproversGroup === null ||
      policy === null ||
      !Array.isArray(proposals) ? (
        <tbody>
          <RowsSkeleton
            numberOfCols={isPendingRequests ? 12 : 10}
            numberOfRows={4}
            numberOfHiddenRows={4}
          />
        </tbody>
      ) : !Array.isArray(proposals) || proposals.length === 0 ? (
        <tbody>
          <tr>
            <td colSpan={14} rowSpan={10} className="text-center align-middle">
              {isPendingRequests ? (
                <>
                  <h4>No Asset Exchange Requests Found</h4>
                  <h6>There are currently no asset exchange requests</h6>
                </>
              ) : (
                <>
                  <h4>No History Exchange Requests Found</h4>
                  <h6>There are currently no history exchange requests</h6>
                </>
              )}
            </td>
          </tr>
          {[...Array(8)].map((_, index) => (
            <tr key={index}></tr>
          ))}
        </tbody>
      ) : (
        <ProposalsComponent />
      )}
    </table>
    {/* Web3IconFetcher for loading token icons */}
    {tokensToFetch.length > 0 && (
      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher`}
        props={{
          tokens: tokensToFetch,
          onIconsLoaded: tokenDisplayLib?.createWeb3IconsHandler
            ? tokenDisplayLib.createWeb3IconsHandler()
            : () => {},
          fetchNetworkIcons: false,
        }}
      />
    )}
  </Container>
);
