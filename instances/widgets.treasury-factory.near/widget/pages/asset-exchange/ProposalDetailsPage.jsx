const { id, instance } = props;
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
if (!instance) {
  return <></>;
}
const {
  getNearBalances,
  decodeProposalDescription,
  decodeBase64,
  getApproversAndThreshold,
  formatSubmissionTimeStamp,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const tokenDisplayLib = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.tokenDisplay"
);

if (!tokenDisplayLib) {
  return <></>;
}
const [proposalData, setProposalData] = useState(null);
const [isDeleted, setIsDeleted] = useState(false);
const [tokenMap, setTokenMap] = useState({});
const [tokenPrices, setTokenPrices] = useState({});
const [intentsTokensData, setIntentsTokensData] = useState(null);
const [tokenIcons, setTokenIcons] = useState({});
const [networkNames, setNetworkNames] = useState({});

// Initialize the token display library with state references
tokenDisplayLib.init({
  tokenIcons,
  networkNames,
  setTokenIcons,
  setNetworkNames,
});

// Fetch 1Click token mappings and prices
useEffect(() => {
  asyncFetch("https://1click.chaindefuser.com/v0/tokens")
    .then((res) => {
      if (res.body && Array.isArray(res.body)) {
        const mapping = {};
        const prices = {};
        // Create a mapping from NEAR contract addresses to symbols and prices
        for (const token of res.body) {
          if (token.assetId && token.assetId.startsWith("nep141:")) {
            const contractAddress = token.assetId.replace("nep141:", "");
            mapping[contractAddress.toLowerCase()] = token.symbol;
            // Store price for the symbol
            if (token.price) {
              prices[token.symbol] = token.price;
            }
          }
        }
        setTokenMap(mapping);
        setTokenPrices(prices);
      }
    })
    .catch((err) => {
      console.log("Failed to fetch 1Click token mappings:", err);
    });
}, []);

// Fetch network information and Web3Icons data
useEffect(() => {
  // Fetch intents tokens data

  tokenDisplayLib.fetchIntentsTokensData().then((data) => {
    setIntentsTokensData(data);
  });
}, []);

// Map 1Click contract addresses to token symbols using fetched data
function getTokenSymbolFromAddress(address) {
  if (!address || typeof address !== "string") return address;
  return tokenMap[address.toLowerCase()] || address;
}

// Collect tokens that need icons
const tokensToFetch = [];
if (proposalData) {
  // For 1Click exchanges, fetch icons based on mapped symbols
  if (proposalData.quoteDeadline && proposalData.tokenIn) {
    const tokenSymbol = getTokenSymbolFromAddress(proposalData.tokenIn);
    if (!tokenSymbol.includes(".")) {
      tokensToFetch.push(tokenSymbol);
    }
  } else if (proposalData.tokenIn && !proposalData.tokenIn.includes(".")) {
    tokensToFetch.push(proposalData.tokenIn);
  }

  if (proposalData.tokenOut && !proposalData.tokenOut.includes(".")) {
    tokensToFetch.push(proposalData.tokenOut);
  }
}

const isCompactVersion = props.isCompactVersion;
const accountId = context.accountId;
const functionCallApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  accountId
);

const nearBalances = getNearBalances(treasuryDaoID);
const deleteGroup = getApproversAndThreshold(
  treasuryDaoID,
  "call",
  accountId,
  true
);
const requiredVotes = functionCallApproversGroup?.requiredVotes;

const hasVotingPermission = (
  functionCallApproversGroup?.approverAccounts ?? []
).includes(accountId);

const hasDeletePermission = (deleteGroup?.approverAccounts ?? []).includes(
  accountId
);

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const proposalPeriod = policy?.proposal_period;

useEffect(() => {
  if (proposalPeriod && intentsTokensData && !proposalData) {
    Near.asyncView(treasuryDaoID, "get_proposal", { id: parseInt(id) })
      .then((item) => {
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

        // Extract additional fields for 1Click API proposals
        let quoteDeadline = null;
        const quoteDeadlineStr = decodeProposalDescription(
          "quoteDeadline",
          item.description
        );
        if (quoteDeadlineStr) {
          // Parse the ISO string deadline
          quoteDeadline = new Date(quoteDeadlineStr);
        }

        const destinationNetwork = decodeProposalDescription(
          "destinationNetwork",
          item.description
        );

        // Extract additional 1Click fields
        const timeEstimate = decodeProposalDescription(
          "timeEstimate",
          item.description
        );
        const depositAddress = decodeProposalDescription(
          "depositAddress",
          item.description
        );
        const signature = decodeProposalDescription(
          "signature",
          item.description
        );

        const outEstimate = parseFloat(amountOut) || 0;
        const slippageValue = parseFloat(slippage) || 0;
        const minAmountReceive = Number(
          outEstimate * (1 - slippageValue / 100)
        );
        let status = item.status;
        if (status === "InProgress") {
          const endTime = Big(item.submission_time ?? "0")
            .plus(proposalPeriod ?? "0")
            .toFixed();
          const timestampInMilliseconds = Big(endTime) / Big(1_000_000);
          const currentTimeInMilliseconds = Date.now();
          if (Big(timestampInMilliseconds).lt(currentTimeInMilliseconds)) {
            status = "Expired";
          }
        }

        // Determine source wallet and network
        const sourceWallet = quoteDeadlineStr ? "NEAR Intents" : "SputnikDAO";

        // For NEAR Intents, decode the proposal args to get the actual token_id
        let intentsToken = null;
        let blockchain = null;
        let intentsTokenContractId = null; // The token contract ID from mt_transfer

        if (quoteDeadlineStr && item.kind?.FunctionCall) {
          // Decode the args from the mt_transfer action (for asset exchange)
          const action = item.kind.FunctionCall?.actions?.[0];
          if (action && action.method_name === "mt_transfer") {
            const args = action.args;
            if (args) {
              const decodedArgs = decodeBase64(args);
              const tokenId = decodedArgs?.token_id;

              // For mt_transfer, the token_id IS the actual token contract address
              // Strip the "nep141:" prefix if it exists
              intentsTokenContractId = tokenId?.startsWith("nep141:")
                ? tokenId.replace("nep141:", "")
                : tokenId;

              if (tokenId && intentsTokensData) {
                intentsToken = intentsTokensData.find(
                  (token) => token.intents_token_id === tokenId
                );

                if (intentsToken) {
                  blockchain = intentsToken.defuse_asset_identifier
                    .split(":")
                    .slice(0, 2)
                    .join(":");
                }
              }
            }
          }
        }

        setProposalData({
          id: item.id,
          proposer: item.proposer,
          votes: item.votes,
          submissionTime: item.submission_time,
          notes,
          status,
          amountIn,
          amountOut,
          minAmountReceive,
          tokenIn, // Store original, will map when displaying
          tokenOut,
          slippage,
          proposal: item,
          quoteDeadline,
          destinationNetwork,
          timeEstimate,
          depositAddress,
          signature,
          sourceWallet,
          blockchain,
          intentsTokenContractId, // The actual token contract from mt_transfer
        });
      })
      .catch(() => {
        // proposal is deleted or doesn't exist
        setIsDeleted(true);
      });
  }
}, [id, intentsTokensData]);

useEffect(() => {
  if (proposalData.id !== id) {
    setProposalData(null);
  }
}, [id]);

function refreshData() {
  setProposalData(null);

  if (props.transactionHashes) {
    return;
  }
  if (isCompactVersion) {
    setTimeout(() => {
      Storage.set("REFRESH_ASSET_TABLE_DATA", Math.random());
    }, 1000);
  }
}

function updateVoteSuccess(status, proposalId) {
  props.setVoteProposalId(proposalId);
  props.setToastStatus(status);
  refreshData();
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

return (
  <>
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalDetails`}
      props={{
        ...props,
        proposalPeriod,
        page: "asset-exchange",
        VoteActions: (hasVotingPermission || hasDeletePermission) &&
          proposalData.status === "InProgress" && (
            <Widget
              loading=""
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.VoteActions`}
              props={{
                instance,
                votes: proposalData?.votes,
                proposalId: proposalData?.id,
                hasDeletePermission,
                hasVotingPermission,
                proposalCreator: proposalData?.proposer,
                nearBalance: nearBalances.available,
                currentAmount: proposalData?.amountIn,
                currentContract:
                  proposalData?.intentsTokenContractId || proposalData?.tokenIn,
                isHumanReadableCurrentAmount: true,
                requiredVotes,
                isIntentsRequest: !!proposalData?.quoteDeadline,
                checkProposalStatus: () =>
                  checkProposalStatus(proposalData?.id),
                isProposalDetailsPage: true,
                proposal: proposalData.proposal,
                // Pass quote deadline to disable voting if expired
                isQuoteExpired:
                  proposalData.quoteDeadline &&
                  new Date() > proposalData.quoteDeadline,
                quoteDeadline: proposalData.quoteDeadline,
              }}
            />
          ),
        ProposalContent: (
          <div className="card card-body d-flex flex-column gap-2">
            <div className="d-flex flex-column gap-2">
              <label>Source Wallet</label>
              <div className="text-secondary">{proposalData?.sourceWallet}</div>
            </div>
            <div className="d-flex flex-column gap-2 mt-1 border-top">
              <label>Send</label>
              <h5 className="mb-0">
                {proposalData?.quoteDeadline ? (
                  // For 1Click exchanges, show custom display with optional icon
                  <div
                    className="d-flex align-items-center gap-1"
                    style={{ fontSize: "18px" }}
                  >
                    {tokenDisplayLib?.getTokenIcon &&
                      tokenDisplayLib.getTokenIcon(
                        getTokenSymbolFromAddress(proposalData?.tokenIn)
                      ) && (
                        <img
                          src={tokenDisplayLib.getTokenIcon(
                            getTokenSymbolFromAddress(proposalData?.tokenIn)
                          )}
                          width="20"
                          height="20"
                          alt={getTokenSymbolFromAddress(proposalData?.tokenIn)}
                          style={{ borderRadius: "50%" }}
                        />
                      )}
                    <span className="bolder mb-0">
                      {tokenDisplayLib?.formatTokenAmount &&
                      tokenPrices[
                        getTokenSymbolFromAddress(proposalData?.tokenIn)
                      ]
                        ? tokenDisplayLib.formatTokenAmount(
                            proposalData?.amountIn,
                            tokenPrices[
                              getTokenSymbolFromAddress(proposalData?.tokenIn)
                            ]
                          )
                        : proposalData?.amountIn}
                    </span>
                    <span>
                      {getTokenSymbolFromAddress(proposalData?.tokenIn)}
                    </span>
                    {tokenPrices[
                      getTokenSymbolFromAddress(proposalData?.tokenIn)
                    ] && (
                      <span className="text-muted">
                        (
                        {tokenDisplayLib?.formatUsdValue
                          ? tokenDisplayLib.formatUsdValue(
                              proposalData?.amountIn,
                              tokenPrices[
                                getTokenSymbolFromAddress(proposalData?.tokenIn)
                              ]
                            )
                          : `$${(
                              proposalData?.amountIn *
                              tokenPrices[
                                getTokenSymbolFromAddress(proposalData?.tokenIn)
                              ]
                            ).toFixed(2)}`}
                        )
                      </span>
                    )}
                  </div>
                ) : (
                  // For regular exchanges, use TokenAmountAndIcon (original behavior)
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                    props={{
                      instance,
                      amountWithDecimals: proposalData?.amountIn,
                      address: proposalData?.tokenIn,
                      showUSDValue: true,
                    }}
                  />
                )}
              </h5>
              {proposalData?.blockchain && (
                <div className="text-muted small mt-1">
                  {tokenDisplayLib.getNetworkDisplayName(
                    proposalData.blockchain
                  )}
                </div>
              )}
              {tokenPrices[
                getTokenSymbolFromAddress(proposalData?.tokenIn)
              ] && (
                <div className="text-muted small">
                  1 {getTokenSymbolFromAddress(proposalData?.tokenIn)} = $
                  {tokenPrices[
                    getTokenSymbolFromAddress(proposalData?.tokenIn)
                  ].toLocaleString()}
                </div>
              )}
            </div>
            <div className="d-flex flex-column gap-2 mt-1">
              <label className="border-top">Receive</label>
              <h5 className="mb-0">
                {proposalData?.quoteDeadline ? (
                  // For 1Click exchanges, show custom display with optional icon
                  <div
                    className="d-flex align-items-center gap-1"
                    style={{ fontSize: "18px" }}
                  >
                    {tokenDisplayLib?.getTokenIcon &&
                      tokenDisplayLib.getTokenIcon(proposalData?.tokenOut) && (
                        <img
                          src={tokenDisplayLib.getTokenIcon(
                            proposalData?.tokenOut
                          )}
                          width="20"
                          height="20"
                          alt={proposalData?.tokenOut}
                          style={{ borderRadius: "50%" }}
                        />
                      )}
                    <span className="bolder mb-0">
                      {tokenDisplayLib?.formatTokenAmount &&
                      tokenPrices[proposalData?.tokenOut]
                        ? tokenDisplayLib.formatTokenAmount(
                            proposalData?.amountOut,
                            tokenPrices[proposalData?.tokenOut]
                          )
                        : proposalData?.amountOut}
                    </span>
                    <span>{proposalData?.tokenOut}</span>
                    {tokenPrices[proposalData?.tokenOut] && (
                      <span className="text-muted">
                        (
                        {tokenDisplayLib?.formatUsdValue
                          ? tokenDisplayLib.formatUsdValue(
                              proposalData?.amountOut,
                              tokenPrices[proposalData?.tokenOut]
                            )
                          : `$${(
                              proposalData?.amountOut *
                              tokenPrices[proposalData?.tokenOut]
                            ).toFixed(2)}`}
                        )
                      </span>
                    )}
                  </div>
                ) : (
                  // For regular exchanges, use TokenAmountAndIcon (original behavior)
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                    props={{
                      instance,
                      amountWithDecimals: proposalData?.amountOut,
                      address: proposalData?.tokenOut,
                      showUSDValue: true,
                    }}
                  />
                )}
              </h5>
              {proposalData?.destinationNetwork && (
                <div className="text-muted small mt-1">
                  {tokenDisplayLib.getNetworkDisplayName(
                    proposalData.destinationNetwork
                  )}
                </div>
              )}
              {tokenPrices[proposalData?.tokenOut] && (
                <div className="text-muted small">
                  1 {proposalData?.tokenOut} = $
                  {tokenPrices[proposalData?.tokenOut].toLocaleString()}
                </div>
              )}
            </div>
            <div className="d-flex flex-column gap-2 mt-1">
              <label className="border-top">
                Price Slippage Limit {"   "}
                <Widget
                  loading=""
                  src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                  props={{
                    popup:
                      "This is the slippage limit defined for this request. If the market rate changes beyond this threshold during execution, the request will automatically fail.",
                    children: (
                      <i className="bi bi-info-circle text-secondary"></i>
                    ),
                    instance,
                  }}
                />
              </label>
              <div>{proposalData?.slippage}%</div>
            </div>
            <div className="d-flex flex-column gap-2 mt-1">
              <label className="border-top">
                Minimum Amount Receive {"   "}
                <Widget
                  loading=""
                  src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                  props={{
                    popup:
                      "This is the minimum amount you'll receive from this exchange, based on the slippage limit set for the request.",
                    children: (
                      <i className="bi bi-info-circle text-secondary"></i>
                    ),
                    instance,
                  }}
                />
              </label>
              <h5 className="mb-0">
                {proposalData?.quoteDeadline ? (
                  // For 1Click exchanges, show custom display with optional icon
                  <div
                    className="d-flex align-items-center gap-1"
                    style={{ fontSize: "18px" }}
                  >
                    {tokenDisplayLib?.getTokenIcon &&
                      tokenDisplayLib.getTokenIcon(proposalData?.tokenOut) && (
                        <img
                          src={tokenDisplayLib.getTokenIcon(
                            proposalData?.tokenOut
                          )}
                          width="20"
                          height="20"
                          alt={proposalData?.tokenOut}
                          style={{ borderRadius: "50%" }}
                        />
                      )}
                    <span className="bolder mb-0">
                      {tokenDisplayLib?.formatTokenAmount &&
                      tokenPrices[proposalData?.tokenOut]
                        ? tokenDisplayLib.formatTokenAmount(
                            proposalData?.minAmountReceive,
                            tokenPrices[proposalData?.tokenOut]
                          )
                        : proposalData?.minAmountReceive?.toFixed
                        ? proposalData?.minAmountReceive?.toFixed(2)
                        : proposalData?.minAmountReceive}
                    </span>
                    <span>{proposalData?.tokenOut}</span>
                    {tokenPrices[proposalData?.tokenOut] && (
                      <span className="text-muted">
                        (
                        {tokenDisplayLib?.formatUsdValue
                          ? tokenDisplayLib.formatUsdValue(
                              proposalData?.minAmountReceive,
                              tokenPrices[proposalData?.tokenOut]
                            )
                          : `$${(
                              proposalData?.minAmountReceive *
                              tokenPrices[proposalData?.tokenOut]
                            ).toFixed(2)}`}
                        )
                      </span>
                    )}
                  </div>
                ) : (
                  // For regular exchanges, use TokenAmountAndIcon (original behavior)
                  <Widget
                    loading=""
                    src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmountAndIcon`}
                    props={{
                      instance,
                      amountWithDecimals: proposalData?.minAmountReceive,
                      address: proposalData?.tokenOut,
                      showUSDValue: true,
                    }}
                  />
                )}
              </h5>
            </div>
            {proposalData?.quoteDeadline && (
              <>
                <div className="d-flex flex-column gap-2 mt-1">
                  <label className="border-top">
                    1Click Quote Deadline {"   "}
                    <Widget
                      loading=""
                      src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                      props={{
                        popup:
                          "This is the expiry time for the 1Click API quote. After this time, the quoted exchange rate is no longer valid and voting will be disabled to prevent loss of funds.",
                        children: (
                          <i className="bi bi-info-circle text-secondary"></i>
                        ),
                        instance,
                      }}
                    />
                  </label>
                  <div
                    className={
                      new Date() > proposalData.quoteDeadline
                        ? "text-danger fw-bold"
                        : ""
                    }
                  >
                    {proposalData.quoteDeadline.toLocaleString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "UTC",
                      timeZoneName: "short",
                    })}
                    {new Date() > proposalData.quoteDeadline && " (EXPIRED)"}
                  </div>
                </div>
                {proposalData?.timeEstimate && (
                  <div className="d-flex flex-column gap-2 mt-1">
                    <label className="border-top">
                      Estimated Time {"   "}
                      <Widget
                        loading=""
                        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                        props={{
                          popup:
                            "Estimated time for the cross-chain swap to complete once the proposal is approved.",
                          children: (
                            <i className="bi bi-info-circle text-secondary"></i>
                          ),
                          instance,
                        }}
                      />
                    </label>
                    <div>{proposalData.timeEstimate}</div>
                  </div>
                )}
                {proposalData?.depositAddress && (
                  <div className="d-flex flex-column gap-2 mt-1">
                    <label className="border-top">
                      Deposit Address {"   "}
                      <Widget
                        loading=""
                        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                        props={{
                          popup:
                            "The 1Click deposit address where tokens will be sent for the cross-chain swap execution.",
                          children: (
                            <i className="bi bi-info-circle text-secondary"></i>
                          ),
                          instance,
                        }}
                      />
                    </label>
                    <div
                      className="text-break"
                      style={{ fontFamily: "monospace", fontSize: "14px" }}
                    >
                      {proposalData.depositAddress}
                    </div>
                  </div>
                )}
                {proposalData?.signature && (
                  <div className="d-flex flex-column gap-2 mt-1">
                    <label className="border-top">
                      Quote Signature {"   "}
                      <Widget
                        loading=""
                        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                        props={{
                          popup:
                            "The cryptographic signature from 1Click API that validates this quote.",
                          children: (
                            <i className="bi bi-info-circle text-secondary"></i>
                          ),
                          instance,
                        }}
                      />
                    </label>
                    <div
                      className="text-break"
                      style={{ fontFamily: "monospace", fontSize: "12px" }}
                    >
                      {proposalData.signature}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ),
        proposalData: proposalData,
        isDeleted: isDeleted,
        isCompactVersion,
        approversGroup: functionCallApproversGroup,
        instance,
        deleteGroup,
        proposalStatusLabel: {
          approved: "Asset Exchange Request Executed",
          rejected: "Asset Exchange Request Rejected",
          deleted: "Asset Exchange Request Deleted",
          failed: "Asset Exchange Request Failed",
          expired: "Asset Exchange Request Expired",
        },
        checkProposalStatus,
      }}
    />
    {/* Web3IconFetcher for loading token icons and network names */}
    {proposalData && (
      <>
        {/* Combine token and network fetching into one call */}
        {(tokensToFetch.length > 0 ||
          proposalData?.destinationNetwork ||
          proposalData?.blockchain) && (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Web3IconFetcher`}
            props={{
              tokens: [
                ...tokensToFetch,
                // For destination network, use the tokenOut symbol
                proposalData?.destinationNetwork &&
                  proposalData?.tokenOut && {
                    symbol: proposalData.tokenOut,
                    networkId: proposalData.destinationNetwork,
                  },
                // For source blockchain, use the tokenIn symbol (mapped if needed)
                proposalData?.blockchain &&
                  proposalData?.tokenIn && {
                    symbol: getTokenSymbolFromAddress(proposalData.tokenIn),
                    networkId: proposalData.blockchain,
                  },
              ].filter(
                (item) => item !== null && item !== undefined && item !== false
              ),
              onIconsLoaded: tokenDisplayLib.createWeb3IconsHandler(),
              fetchNetworkIcons: true,
            }}
          />
        )}
      </>
    )}
  </>
);
