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
const { contractId, instance, treasuryDaoID, metadata, refreshData } = props;

const Container = styled.div`
  .info-box {
    background: var(--grey-04);
    color: var(--grey-02);
    padding: 12px;
    border-radius: 12px;
  }

  .permission-warning {
    background: var(--bg-page-color);
    color: var(--grey-02);
    padding: 12px;
    border-radius: 12px;
  }

  ol {
    padding-left: 20px;
  }
`;
const [loading, setLoading] = useState(true);
const [contractMetadata, setContractMetadata] = useState(null);
const [ftMetadata, setFtMetadata] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [expanded, setExpanded] = useState(false);
const [showToastStatus, setShowToastStatus] = useState(null);
const [accountMetadata, setAccountMetadata] = useState(null);
const [isFTRegistered, setIsFTRegistered] = useState(false);

useEffect(() => {
  if (metadata && !accountMetadata) {
    setAccountMetadata(metadata);
  }
}, [metadata]);

const hasPermissionToClaim = context.accountId;

useEffect(() => {
  if (hasPermissionToClaim && contractMetadata) {
    Near.asyncView(contractMetadata?.token_account_id, "storage_balance_of", {
      account_id: treasuryDaoID,
    }).then((res) => {
      setIsFTRegistered(res.total);
    });
  }
}, [contractMetadata]);

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

  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDate = date.toLocaleDateString("en-US", options);

  return formattedDate;
}

function convertToDateForTooltip(timestamp) {
  const date = new Date(timestamp * 1000);

  const options = {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
    timeZoneName: "short",
  };
  const formattedDate = date.toLocaleDateString("en-US", options);

  return formattedDate;
}

// Calculate next claim date based on start timestamp and session interval
const calculateNextClaimDate = () => {
  const { start_timestamp, session_interval, session_num } = accountMetadata;
  if (!start_timestamp || !session_interval) return "Not set";

  const startTime = parseInt(start_timestamp);
  const interval = parseInt(session_interval);
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  const maxSessions = parseInt(session_num) || 0;

  // Calculate the first claim time
  let nextClaimTime = startTime + interval;

  // If the next claim time is in the past, keep adding intervals until it's in the future
  // BUT don't exceed the maximum number of sessions (session_num)
  let sessionCount = 1; // We start with session 1
  while (nextClaimTime <= currentTime && sessionCount < maxSessions) {
    nextClaimTime += interval;
    sessionCount++;
  }

  return nextClaimTime;
};

// Calculate how many sessions have been released
const calculateReleasedSessions = () => {
  const { start_timestamp, session_interval, session_num } = accountMetadata;
  if (!start_timestamp || !session_interval) return 0;

  const startTime = parseInt(start_timestamp);
  const interval = parseInt(session_interval);
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

  // If current time is before start time, no sessions have been released
  if (currentTime < startTime) return 0;

  // Calculate how many complete intervals have passed
  const elapsedTime = currentTime - startTime;
  const releasedSessions = Math.floor(elapsedTime / interval);

  // Cap the result at the total number of sessions (session_num)
  const maxSessions = parseInt(session_num) || 0;
  return Math.min(releasedSessions, maxSessions);
};

useEffect(() => {
  Near.asyncView(contractId, "contract_metadata", {}).then((metadata) => {
    setContractMetadata(metadata);
  });
}, [contractId]);

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
    <div className="h5 mb-0">
      Lockup
      <Widget
        loading=""
        src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
        props={{
          popup:
            "A fungible lockup releases tokens other than NEAR over time according to a vesting schedule. Anyone can trigger Claim, but funds are always secure — claimed tokens go directly into your treasury (Sputnik account).",
          children: (
            <i class="bi bi-question-circle h6 mb-0 text-secondary cursor-pointer"></i>
          ),
          instance,
        }}
      />
    </div>
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
        <div className="d-flex gap-2 align-items-center">
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

useEffect(() => {
  if (
    typeof props.setFtLockupBalance === "function" &&
    accountMetadata &&
    ftMetadata
  ) {
    props.setFtLockupBalance(
      Big(
        convertBalanceToReadableFormat(
          Big(accountMetadata?.deposited_amount ?? 0).minus(
            accountMetadata?.claimed_amount ?? 0
          ),
          ftMetadata?.decimals
        )
      )
        .mul(ftMetadata?.price ?? 0)
        .toFixed()
    );
  }
}, [accountMetadata, ftMetadata]);

const FtAmountDetails = () => {
  return (
    <div
      className={"d-flex flex-column cursor-pointer dropdown-item"}
      onClick={() => setExpanded(!expanded)}
    >
      <div className={expanded && "border-bottom"}>
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3 flex-wrap">
          <div className="h6 mb-0 d-flex align-items-center gap-2">
            Original Allocated Amount
            <CustomTooltip info="The total number of tokens assigned to you in this vesting schedule." />
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
                  Big(accountMetadata?.deposited_amount ?? 0),
                  ftMetadata?.decimals
                )}
              </div>
              <div className="text-sm text-secondary">
                {formatPrice(
                  Big(accountMetadata?.deposited_amount ?? 0)
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
              Big(accountMetadata?.deposited_amount ?? 0)
                .minus(accountMetadata?.unclaimed_amount ?? 0)
                .minus(accountMetadata?.claimed_amount ?? 0),
              ftMetadata?.decimals
            )}
            tooltip="Tokens that are still locked and not yet available to claim under your vesting schedule."
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
            tooltip='Tokens from earlier payout periods ("rounds") that you haven’t claimed yet. These can be claimed together with the next unlock.'
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
            tooltip="Tokens you’ve already claimed and transferred to your DAO treasury."
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
  const claimDate = calculateNextClaimDate();
  return (
    <div className="d-flex flex-column">
      <div>
        <Row
          label="Start Date"
          value={
            <Widget
              loading=""
              src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
              props={{
                popup: convertToDateForTooltip(accountMetadata.start_timestamp),
                children: convertToDate(accountMetadata.start_timestamp),
                instance: instance,
              }}
            />
          }
          tooltip="The date this vesting schedule began."
          showBorder={true}
        />
      </div>
      <div>
        <Row
          label="Rounds"
          value={`${calculateReleasedSessions()} / ${
            accountMetadata.session_num ?? 0
          }`}
          tooltip="The number of payout rounds completed out of the total scheduled."
          showBorder={true}
        />
      </div>
      <div>
        <Row
          label="Release Interval"
          value={formatSessionInterval(accountMetadata.session_interval)}
          tooltip="The time period between each payout."
          showBorder={true}
        />
      </div>
      <div>
        <Row
          label="Next Claim Date"
          value={
            <Widget
              loading=""
              src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
              props={{
                popup: convertToDateForTooltip(claimDate),
                children: convertToDate(claimDate),
                instance: instance,
              }}
            />
          }
          tooltip="The next date when tokens will be available to claim."
          showBorder={false}
        />
      </div>
    </div>
  );
};

function onClaim() {
  setTxnCreated(true);
  const calls = [];

  if (!isFTRegistered) {
    calls.push({
      contractName: contractMetadata?.token_account_id,
      methodName: "storage_deposit",
      args: {
        account_id: treasuryDaoID,
        registration_only: true,
      },
      gas: 300000000000000,
      deposit: Big(0.125).mul(Big(10).pow(24)).toFixed(),
    });
  }

  calls.push({
    contractName: contractId,
    methodName: "claim",
    args: {
      account_id: treasuryDaoID,
    },
  });

  Near.call(calls);
}

function fetchAcountMetadata() {
  return Near.asyncView(contractId, "get_account", {
    account_id: treasuryDaoID,
  });
}

useEffect(() => {
  if (isTxnCreated && hasPermissionToClaim) {
    let checkTxnTimeout = null;

    const checkForNewClaim = () => {
      fetchAcountMetadata().then((res) => {
        if (accountMetadata.claimed_amount !== res.claimed_amount) {
          setAccountMetadata(res);
          clearTimeout(checkTxnTimeout);
          setShowToastStatus("ClaimSuccess");
          setTxnCreated(false);
          refreshData();
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewClaim(), 1000);
        }
      });
    };

    checkForNewClaim();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated]);

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
            <div>Tokens are successfully claimed.</div>
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
        className="border border-1 rounded-3 overflow-hidden reverse-border-color"
        style={{
          backgroundColor: "var(--bg-system-color)",
        }}
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
              <div className="d-flex flex-column align-items-end">
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

          <div className="p-3">
            <button
              disabled={isTxnCreated || !hasPermissionToClaim}
              className="btn btn-outline-secondary text-center w-100 btn-sm"
              onClick={onClaim}
            >
              Claim
            </button>
            {!hasPermissionToClaim && (
              <div className="permission-warning d-flex gap-2 mt-3 text-sm align-items-center">
                <i class="bi bi-info-circle h6 mb-0"></i>
                Login with your NEAR account to claim tokens
              </div>
            )}
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
        style={{ backgroundColor: "var(--bg-system-color)", fontSize: "14px" }}
      >
        <div className="px-3 py-2">
          No tokens are ready to be claimed. Please wait for the next round.
        </div>
      </div>
    )
  );
};

const FundsAlreadyClaimed = () => {
  return (
    Big(accountMetadata.claimed_amount ?? 0).gte(
      Big(accountMetadata.deposited_amount ?? 0)
    ) && (
      <div
        className="border border-1 rounded-3 overflow-hidden"
        style={{ backgroundColor: "var(--bg-system-color)", fontSize: "14px" }}
      >
        <div className="px-3 py-2">All tokens have already been claimed</div>
      </div>
    )
  );
};

return (
  <Container>
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
        <FundsAlreadyClaimed />
        <div className="border border-1 rounded-3 overflow-hidden">
          <FtAmountDetails />
        </div>
        <div className="border border-1 rounded-3 overflow-hidden">
          <LockupDetails />
        </div>
      </div>
    </div>
  </Container>
);
