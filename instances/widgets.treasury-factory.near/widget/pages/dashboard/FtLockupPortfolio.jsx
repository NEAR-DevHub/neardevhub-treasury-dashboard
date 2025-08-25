const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };
const { hasPermission, encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { contractId, instance, treasuryDaoID } = props;

const [loading, setLoading] = useState(true);
const [contractMetadata, setContractMetadata] = useState(null);
const [accountMetadata, setAccountMetadata] = useState(null);
const [ftMetadata, setFtMetadata] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [expanded, setExpanded] = useState(false);
const [showToastStatus, setShowToastStatus] = useState("ClaimSuccess");
const [daoPolicy, setDaoPolicy] = useState(null);

const hasPermissionToClaim = hasPermission(
  treasuryDaoID,
  context.accountId,
  "call",
  "AddProposal"
);

function formatPrice(price) {
  const numAmount = Number(price ?? 0);
  if (numAmount > 0 && numAmount < 0.01) {
    return "< $0.01";
  }
  return "$" + Big(price ?? "0").toFixed(2);
}

const formatSessionInterval = (seconds) => {
  const secondsNum = parseInt(seconds);
  if (!secondsNum || secondsNum <= 0) return "Not set";

  const minutes = Math.floor(secondsNum / 60);
  const hours = Math.floor(secondsNum / 3600);
  const days = Math.floor(secondsNum / 86400);
  const years = Math.floor(secondsNum / 31536000);

  // Check for common intervals
  if (secondsNum === 60) return "Every minute";
  if (secondsNum === 3600) return "Every hour";
  if (secondsNum === 86400) return "Every day";
  if (secondsNum === 2592000) return "Every month";
  if (secondsNum === 7776000) return "Every quarter";
  if (secondsNum === 31536000) return "Every year";

  // Format custom intervals
  if (years > 0) {
    const remainingDays = Math.floor((secondsNum % 31536000) / 86400);
    const remainingHours = Math.floor((secondsNum % 86400) / 3600);
    const remainingMinutes = Math.floor((secondsNum % 3600) / 60);
    const remainingSeconds = secondsNum % 60;

    let result = `${years} year${years > 1 ? "s" : ""}`;
    if (remainingDays > 0)
      result += ` ${remainingDays} day${remainingDays > 1 ? "s" : ""}`;
    if (remainingHours > 0)
      result += ` ${remainingHours} hour${remainingHours > 1 ? "s" : ""}`;
    if (remainingMinutes > 0)
      result += ` ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
    if (remainingSeconds > 0)
      result += ` ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
    return result;
  }

  if (days > 0) {
    const remainingHours = Math.floor((secondsNum % 86400) / 3600);
    const remainingMinutes = Math.floor((secondsNum % 3600) / 60);
    const remainingSeconds = secondsNum % 60;

    let result = `${days} day${days > 1 ? "s" : ""}`;
    if (remainingHours > 0)
      result += ` ${remainingHours} hour${remainingHours > 1 ? "s" : ""}`;
    if (remainingMinutes > 0)
      result += ` ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
    if (remainingSeconds > 0)
      result += ` ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
    return result;
  }

  if (hours > 0) {
    const remainingMinutes = Math.floor((secondsNum % 3600) / 60);
    const remainingSeconds = secondsNum % 60;

    let result = `${hours} hour${hours > 1 ? "s" : ""}`;
    if (remainingMinutes > 0)
      result += ` ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
    if (remainingSeconds > 0)
      result += ` ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
    return result;
  }

  if (minutes > 0) {
    const remainingSeconds = secondsNum % 60;
    let result = `${minutes} minute${minutes > 1 ? "s" : ""}`;
    if (remainingSeconds > 0)
      result += ` ${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
    return result;
  }

  return `${secondsNum} second${secondsNum > 1 ? "s" : ""}`;
};

function convertToDate(timestamp) {
  const date = new Date(timestamp * 1000);

  const options = { year: "numeric", month: "long", day: "numeric" };
  const formattedDate = date.toLocaleDateString("en-US", options);

  return formattedDate;
}

// Calculate next claim date based on start timestamp and session interval
const calculateNextClaimDate = (startTimestamp, sessionInterval) => {
  if (!startTimestamp || !sessionInterval) return "Not set";

  const startTime = parseInt(startTimestamp);
  const interval = parseInt(sessionInterval);
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

  // Calculate the first claim time
  let nextClaimTime = startTime + interval;

  // If the next claim time is in the past, keep adding intervals until it's in the future
  while (nextClaimTime <= currentTime) {
    nextClaimTime += interval;
  }

  return convertToDate(nextClaimTime);
};

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  Near.asyncView(contractId, "contract_metadata", {}).then((metadata) => {
    setContractMetadata(metadata);
  });
}, [contractId]);

useEffect(() => {
  getLastProposalId().then((id) => setLastProposalId(id));
  Near.asyncView(treasuryDaoID, "get_policy").then((policy) => {
    setDaoPolicy(policy);
  });
}, [treasuryDaoID]);

useEffect(() => {
  Near.asyncView(contractId, "get_account", { account_id: treasuryDaoID }).then(
    (metadata) => {
      setAccountMetadata(metadata);
    }
  );
}, [contractId, treasuryDaoID]);

function fetchFtMetadata() {
  asyncFetch(
    `${REPL_BACKEND_API}/ft-token-metadata?account_id=${contractMetadata?.token_account_id}`
  ).then((res) => {
    setFtMetadata(res.body);
    setLoading(false);
  });
}

useEffect(() => {
  if (contractMetadata) {
    fetchFtMetadata();
  }
}, [contractMetadata]);

const Loading = () => (
  <div className="d-flex align-items-center gap-2 w-100 mx-2 mb-2">
    <div style={{ width: "40px" }}>
      <Skeleton
        style={{ height: "40px", width: "40px" }}
        className="rounded-circle"
      />
    </div>
    <div className="d-flex flex-column gap-1" style={{ width: "60%" }}>
      <Skeleton
        style={{ height: "24px", width: "100%" }}
        className="rounded-1"
      />
      <Skeleton
        style={{ height: "16px", width: "100%" }}
        className="rounded-2"
      />
    </div>
    <div className="d-flex flex-column gap-1" style={{ width: "20%" }}>
      <Skeleton
        style={{ height: "24px", width: "100%" }}
        className="rounded-1"
      />
      <Skeleton
        style={{ height: "16px", width: "100%" }}
        className="rounded-2"
      />
    </div>
  </div>
);

const heading = (
  <div className="d-flex flex-column gap-1 px-3 pt-3 pb-2">
    <div className="h5 mb-0">FT Lockup</div>
    <div>
      <span className="text-sm text-secondary">Wallet: </span>
      <span className="text-theme text-sm fw-medium">{contractId}</span>
    </div>
  </div>
);

if (loading)
  return (
    <div className="card flex-1 overflow-hidden border-bottom">
      {heading}
      <Loading />
    </div>
  );

const CustomTooltip = ({ info }) => {
  return info ? (
    <Widget
      loading=""
      src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
      props={{
        popup: info,
        children: <i className="bi bi-info-circle text-secondary"></i>,
        instance,
      }}
    />
  ) : null;
};

const Row = ({ label, value, tooltip, showBorder, showSymbol, innerItem }) => {
  return (
    <div className={showBorder && "border-bottom"}>
      <div
        className={
          "py-2 d-flex gap-2 align-items-center justify-content-between px-3 "
        }
      >
        <div className="d-flex gap-1 align-items-center">
          {label} <CustomTooltip info={tooltip} />{" "}
        </div>
        <div className="d-flex gap-1 align-items-center">
          {value}
          {showSymbol && <span> {ftMetadata?.symbol}</span>}
          {innerItem && <div style={{ width: 20 }}></div>}
        </div>
      </div>
    </div>
  );
};

function convertBalanceToReadableFormat(amount, decimals) {
  return Big(amount ?? "0")
    .div(Big(10).pow(Number(decimals) || 1))
    .toFixed();
}

function formatCurrency(amount) {
  const formattedAmount = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return "$" + formattedAmount;
}

const FtAmountDetails = () => {
  return (
    <div
      className={"d-flex flex-column cursor-pointer dropdown-item"}
      onClick={() => setExpanded(!expanded)}
    >
      <div className={expanded && "border-bottom"}>
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3 flex-wrap">
          <div className="h6 mb-0 d-flex align-items-center gap-1">
            Original Allocated Amount
            {"  "}{" "}
            <CustomTooltip info="This is the total amount of tokens allocated." />
          </div>
          <div className="d-flex gap-2 align-items-center justify-content-end">
            <div className="d-flex flex-column align-items-end">
              <div className="d-flex gap-1 align-items-center">
                <img
                  src={ftMetadata?.icon}
                  height={15}
                  width={15}
                  className="rounded-circle"
                />
                {convertBalanceToReadableFormat(
                  Big(accountMetadata?.session_num ?? 0).mul(
                    accountMetadata?.release_per_session ?? 0
                  ),
                  ftMetadata?.decimals
                )}
              </div>
              <div className="text-sm text-secondary">
                {formatPrice(
                  Big(accountMetadata?.session_num ?? 0)
                    .mul(accountMetadata?.release_per_session ?? 0)
                    .div(Big(10).pow(Number(ftMetadata?.decimals) || 0))
                    .mul(ftMetadata?.price ?? 0)
                )}
              </div>
            </div>
            <div style={{ width: 20 }}>
              <i
                className={
                  (expanded ? "bi bi-chevron-up" : "bi bi-chevron-down") +
                  " text-secondary h6 mb-0"
                }
              ></i>
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div
          className="d-flex flex-column overflow-hidden"
          style={{ backgroundColor: "var(--bg-system-color)" }}
        >
          <Row
            label="Unreleased"
            value={convertBalanceToReadableFormat(
              Big(accountMetadata?.session_num ?? 0)
                .mul(accountMetadata?.release_per_session ?? 0)
                .minus(accountMetadata?.unclaimed_amount ?? 0)
                .minus(accountMetadata?.claimed_amount ?? 0),
              ftMetadata?.decimals
            )}
            tooltip="This is the total amount of tokens allocated."
            showBorder={true}
            showSymbol={true}
            innerItem={true}
          />
          <Row
            label="Unclaimed"
            value={convertBalanceToReadableFormat(
              accountMetadata?.unclaimed_amount,
              ftMetadata?.decimals
            )}
            tooltip="This is the total amount of tokens remaining unclaimed from the previous round that can be claimed together."
            showBorder={true}
            showSymbol={true}
            innerItem={true}
          />
          <Row
            label="Claimed"
            value={convertBalanceToReadableFormat(
              accountMetadata?.claimed_amount,
              ftMetadata?.decimals
            )}
            tooltip="This is the total amount of tokens you have already claimed."
            showBorder={false}
            showSymbol={true}
            innerItem={true}
          />
        </div>
      )}
    </div>
  );
};

const LockupDetails = () => {
  return (
    <div className="d-flex flex-column">
      <div>
        <Row
          label="Start Date"
          value={convertToDate(accountMetadata.start_timestamp)}
          tooltip="The date the lockup contract was started."
          showBorder={true}
        />
      </div>
      <div>
        <Row
          label="Rounds"
          value={`${accountMetadata.last_claim_session ?? 0} / ${
            accountMetadata.session_num ?? 0
          }`}
          tooltip="This is the number of rounds that have completed."
          showBorder={true}
        />
      </div>
      <div>
        <Row
          label="Release Interval"
          value={formatSessionInterval(accountMetadata.session_interval)}
          tooltip="Time between payouts."
          showBorder={true}
        />
      </div>
      <div>
        <Row
          label="Next Claim Date"
          value={calculateNextClaimDate(
            accountMetadata.start_timestamp,
            accountMetadata.session_interval
          )}
          tooltip="The date when your next tokens will be available to claim."
          showBorder={false}
        />
      </div>
    </div>
  );
};

function onClaim() {
  setTxnCreated(true);
  const deposit = daoPolicy?.proposal_bond || 0;
  const description = {
    title: "Claim FT Unlocked tokens",
    summary: "",
    notes: "",
    tokenId: contractMetadata?.token_account_id,
    amount: accountMetadata.unclaimed_amount,
  };
  Near.call([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
          kind: {
            FunctionCall: {
              receiver_id: contractId,
              actions: [
                {
                  method_name: "claim",
                  args: "",
                  deposit: "0",
                  gas: "200000000000000",
                },
              ],
            },
          },
        },
      },
      gas: 300000000000000,
      deposit,
    },
  ]);
}

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          setTimeout(() => {
            clearTimeout(checkTxnTimeout);
            setShowToastStatus("ClaimSuccess");
            setTxnCreated(false);
          }, 1000);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };

    checkForNewProposal();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated, lastProposalId]);

const ClaimSuccessToast = () => {
  return showToastStatus ? (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showToastStatus ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i
            className="bi bi-x-lg h6 mb-0 cursor-pointer"
            onClick={() => setShowToastStatus(null)}
          ></i>
        </div>
        <div className="toast-body">
          <div className="d-flex align-items-center gap-3">
            <i class="bi bi-check2 h3 mb-0 success-icon"></i>
            <div>
              Claim request has been successfully created.
              <br />
              <a
                className="text-underline"
                href={href({
                  widgetSrc: `${instance}/widget/app`,
                  params: {
                    page: "payments",
                    id: lastProposalId,
                  },
                })}
              >
                View in Payments
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

const ClaimFunds = () => {
  return (
    Big(accountMetadata.unclaimed_amount ?? 0).gt(0) && (
      <div
        className="border border-1 rounded-3 overflow-hidden"
        style={{ backgroundColor: "var(--bg-system-color)" }}
      >
        <div className="d-flex flex-column">
          <div className="border-bottom px-3 py-2">
            🎉 You have funds available to claim{" "}
          </div>
          <Row
            label={
              <div className="d-flex gap-1 align-items-center">
                <img src={ftMetadata?.icon} height={30} width={30} />
                <div className="d-flex flex-column">
                  {ftMetadata?.symbol}
                  <div className="text-sm text-secondary">
                    {formatCurrency(ftMetadata?.price)}
                  </div>
                </div>
              </div>
            }
            value={
              <div className="d-flex flex-column">
                <div>
                  {convertBalanceToReadableFormat(
                    accountMetadata.unclaimed_amount,
                    ftMetadata?.decimals
                  )}
                </div>
                <div className="text-sm text-secondary">
                  {formatPrice(
                    Big(accountMetadata.unclaimed_amount ?? 0)
                      .div(Big(10).pow(Number(ftMetadata?.decimals) || 0))
                      .mul(ftMetadata?.price ?? 0)
                  )}
                </div>
              </div>
            }
            tooltip=""
            showBorder={true}
          />

          <div className="py-2 px-3">
            <button
              disabled={isTxnCreated || !hasPermissionToClaim}
              className="btn btn-outline-secondary text-center w-100 btn-sm"
              onClick={onClaim}
            >
              Claim
            </button>
          </div>
        </div>
      </div>
    )
  );
};

const FundsNotAvailableForClaim = () => {
  return (
    Big(accountMetadata.unclaimed_amount ?? 0).lte(0) &&
    accountMetadata.last_claim_session < accountMetadata.session_num && (
      <div
        className="border border-1 rounded-3 overflow-hidden"
        style={{ backgroundColor: "var(--bg-system-color)" }}
      >
        <div className="px-3 py-2">
          No tokens are ready to be claimed. Please wait for the next round.
        </div>
      </div>
    )
  );
};

return (
  <>
    <ClaimSuccessToast />
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <div className="card flex-1 overflow-hidden border-bottom">
      {heading}
      <div className="d-flex flex-column gap-3 px-3 mb-3">
        <ClaimFunds />
        <FundsNotAvailableForClaim />
        <div className="border border-1 rounded-3 overflow-hidden">
          <FtAmountDetails />
        </div>
        <div className="border border-1 rounded-3 overflow-hidden">
          <LockupDetails />
        </div>
      </div>
    </div>
  </>
);
