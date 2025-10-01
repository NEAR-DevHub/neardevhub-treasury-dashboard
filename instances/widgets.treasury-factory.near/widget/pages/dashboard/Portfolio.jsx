const { getNearBalances, TooltipText, deserializeLockupContract } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

if (
  typeof getNearBalances !== "function" ||
  !Skeleton ||
  typeof deserializeLockupContract !== "function"
) {
  return <></>;
}

function formatNearAmount(amount) {
  return Number(
    Big(amount ?? "0")
      .div(Big(10).pow(24))
      .toFixed(2)
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPrice(price) {
  const numAmount = Number(price ?? 0);
  if (numAmount > 0 && numAmount < 0.01) {
    return "< $0.01";
  }
  return "$" + Big(price ?? "0").toFixed(2);
}

const Loading = () => {
  return (
    <div className="d-flex align-items-center gap-2 w-100 mx-2 mb-2">
      <div style={{ width: "40px" }}>
        <Skeleton
          style={{ height: "40px", width: "40px" }}
          className="rounded-circle"
        />
      </div>
      <div className="d-flex flex-column gap-1 w-75">
        <Skeleton
          style={{ height: "24px", width: "100%" }}
          className="rounded-1"
        />
        <Skeleton
          style={{ height: "16px", width: "100%" }}
          className="rounded-2"
        />
      </div>
      <div className="d-flex flex-column gap-1 w-25">
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
};

const archiveNodeUrl = "https://archival-rpc.mainnet.fastnear.com";

function formatToReadableDecimals(number) {
  return Big(number ?? "0").toFixed(2);
}

const {
  ftTokens,
  nearStakedTokens,
  nearPrice,
  nearUnStakedTokens,
  nearStakedTotalTokens,
  heading,
  nearBalances,
  isLockupContract,
  nearWithdrawTokens,
  lockupState,
  instance,
} = props;

function convertBalanceToReadableFormat(amount, decimals) {
  return Big(amount ?? "0")
    .div(Big(10).pow(decimals ?? "1"))
    .toFixed();
}

function getPrice(tokensNumber, tokenPrice) {
  return Big(tokensNumber ?? "0")
    .mul(tokenPrice ?? "1")
    .toFixed(2);
}

const [isNearPortfolioExpanded, setNearPortfolioExpanded] = useState(false);
const [isNearStakedPortfolioExpanded, setNearStakedPortfolioExpanded] =
  useState(false);
const [showHiddenTokens, setShowHiddenTokens] = useState(false);
const [isLockupTokensExpanded, setLockupTokensExpanded] = useState(false);
const [displayableTokens, setDisplayableTokens] = useState([]);
const [hiddenTokens, setHiddenTokens] = useState([]);
const [lockupStartDate, setLockupStartDate] = useState(null);
const [lockupEndDate, setLockupEndDate] = useState(null);
const [lockupCliffDate, setLockupCliffDate] = useState(null);
const [lockupTotalAllocated, setLockupTotalAllocated] = useState(null);
const [lockupVested, setLockupVested] = useState(null);
const [lockupUnvested, setLockupUnvested] = useState(null);

function formatCurrency(amount) {
  const formattedAmount = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return "$" + formattedAmount;
}

const BalanceDisplay = ({
  label,
  balance,
  price,
  tooltipInfo,
  showExpand,
  isExpanded,
  setIsExpanded,
  expandedContent,
  hideTooltip,
  hideBorder,
}) => {
  return (
    <div
      className={
        "d-flex flex-column " + (showExpand && "cursor-pointer dropdown-item")
      }
      onClick={() => showExpand && setIsExpanded(!isExpanded)}
    >
      <div className={!hideBorder && "border-bottom"}>
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3">
          <div className="h6 mb-0">
            {label}
            {"  "}{" "}
            {!hideTooltip && (
              <Widget
                loading=""
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                props={{
                  popup: tooltipInfo,
                  children: (
                    <i className="bi bi-info-circle text-secondary"></i>
                  ),
                  instance,
                }}
              />
            )}
          </div>
          <div className="d-flex gap-2 align-items-center justify-content-end">
            <div className="d-flex flex-column align-items-end">
              <div className="h6 mb-0 d-flex align-items-center gap-1">
                <NearToken height={20} width={20} />
                {Number(balance).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm text-secondary">
                {formatCurrency(
                  formatToReadableDecimals(getPrice(balance, price))
                )}
              </div>
            </div>
            <div style={{ width: 20 }}>
              {showExpand && (
                <i
                  className={
                    (isExpanded ? "bi bi-chevron-up" : "bi bi-chevron-down") +
                    " text-secondary h6 mb-0"
                  }
                ></i>
              )}
            </div>
          </div>
        </div>
      </div>
      {isExpanded && expandedContent}
    </div>
  );
};

const PortfolioCard = ({
  Icon,
  src,
  balance,
  showExpand,
  price,
  isExpanded,
  setIsExpanded,
  symbol,
  expandedContent,
  hideBorder,
}) => {
  return (
    <div className="d-flex flex-column" data-testid={`${symbol}-token`}>
      <div
        className={
          (!hideBorder && "border-bottom ") +
          (showExpand && " cursor-pointer dropdown-item")
        }
        onClick={() => showExpand && setIsExpanded(!isExpanded)}
      >
        <div
          className={`py-2 d-flex gap-2 align-items-center justify-content-between px-3 ${
            !price ? "text-secondary" : ""
          }`}
        >
          <div className="d-flex align-items-center gap-2">
            {Icon ? <Icon /> : <img src={src} height={30} width={30} />}
            <div>
              <div
                style={{ maxWidth: "240px" }}
                className="h6 mb-0 text-truncate"
              >
                {symbol}
              </div>
              <div className="text-sm text-secondary">{formatPrice(price)}</div>
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center justify-content-end">
            <div className="d-flex flex-column align-items-end">
              <div className="h6 mb-0">
                {Number(balance).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm text-secondary">
                {formatCurrency(
                  formatToReadableDecimals(getPrice(balance, price))
                )}
              </div>
            </div>
            <div style={{ width: 20 }}>
              {showExpand && (
                <i
                  className={
                    (isExpanded ? "bi bi-chevron-up" : "bi bi-chevron-down") +
                    " text-secondary h6 mb-0"
                  }
                ></i>
              )}
            </div>
          </div>
        </div>
      </div>
      {isExpanded && expandedContent}
    </div>
  );
};

const NearPortfolio = () => {
  let total = Big(nearBalances?.totalParsed ?? "0")
    .plus(nearStakedTotalTokens ?? "0")
    .toFixed(2);

  const tooltipInfo = isLockupContract
    ? {
        available:
          "Tokens that can be used immediately for payments, staking, or transferred out of the lockup account. This includes tokens that have vested, tokens earned as staking rewards, or any tokens transferred into the account. Tokens become available for payments through three primary mechanisms: vesting, withdrawals, and transfers. As tokens vest, they become available for payments. Additionally, staked tokens can be unstaked and withdrawn, but they will only be available for payments if they have also vested. Finally, any tokens transferred into the lockup account will be immediately available for payments.",
        staked:
          "Tokens that are currently staked with validators to earn staking rewards. You can unstake any amount of your staked tokens. However, only the portion of unstaked tokens that exceeds the current “Unvested” amount will become available for payments. Unstaking initiates a 48-hour waiting period. After that period, you must manually withdraw the unstaked tokens to make them available for payment.",
        pendingRelease:
          "Tokens that have been unstaked and are now within a 48-hour waiting period before they become available for withdrawal.",
        availableForWithdraw:
          "Tokens that have been unstaked and finished the 48-hour waiting period. Upon withdrawal, the portion of unstaked tokens that exceeds the current “Unvested” amount will become available for payments. The portion that is part of the “Unvested” amount will automatically return to Locked.",
        locked:
          "Tokens that are currently restricted by the vesting schedule and cannot be used for payments until they become vested. These tokens can only be staked.",
        reservedForStorage:
          "A small amount of tokens required to maintain this account active and cover the storage costs.",
      }
    : TooltipText;

  return (
    <PortfolioCard
      symbol={"NEAR"}
      hideBorder={!ftTokens?.length && !isNearPortfolioExpanded}
      Icon={NearToken}
      balance={isLockupContract ? nearBalances.totalParsed : total}
      showExpand={true}
      price={nearPrice}
      isExpanded={isNearPortfolioExpanded}
      setIsExpanded={setNearPortfolioExpanded}
      expandedContent={
        <div className="d-flex flex-column">
          <BalanceDisplay
            label={"Available Balance"}
            balance={nearBalances?.availableParsed}
            tooltipInfo={TooltipText?.available}
            price={nearPrice}
          />

          <BalanceDisplay
            label={"Staking"}
            balance={nearStakedTotalTokens}
            hideTooltip={true}
            price={nearPrice}
            showExpand={true}
            isExpanded={isNearStakedPortfolioExpanded}
            setIsExpanded={setNearStakedPortfolioExpanded}
            expandedContent={
              <div
                className="d-flex flex-column"
                style={{ backgroundColor: "var(--bg-system-color)" }}
              >
                <BalanceDisplay
                  label={"Staked"}
                  balance={nearStakedTokens}
                  tooltipInfo={tooltipInfo?.staked}
                  price={nearPrice}
                />
                <BalanceDisplay
                  label={"Pending Release"}
                  balance={nearUnStakedTokens}
                  tooltipInfo={tooltipInfo?.pendingRelease}
                  price={nearPrice}
                />
                <BalanceDisplay
                  label={"Available for withdrawal"}
                  balance={nearWithdrawTokens}
                  tooltipInfo={tooltipInfo?.availableForWithdraw}
                  price={nearPrice}
                />
              </div>
            }
          />
          {isLockupContract && (
            <BalanceDisplay
              label={"Locked"}
              balance={nearBalances.lockedParsed}
              tooltipInfo={tooltipInfo?.locked}
              price={nearPrice}
            />
          )}
          <BalanceDisplay
            label={"Reserved for storage"}
            balance={nearBalances.storageParsed}
            tooltipInfo={tooltipInfo?.reservedForStorage}
            price={nearPrice}
            hideBorder={!ftTokens.length}
          />
        </div>
      }
    />
  );
};

const isLoading =
  ftTokens === null ||
  nearBalances === null ||
  nearPrice === null ||
  !nearBalances.total ||
  (isLockupContract && !lockupStartDate);

const TokensList = ({ tokens }) => {
  if (!Array.isArray(tokens)) return <></>;

  return tokens?.map((item, index) => {
    const { ft_meta, amount } = item;
    const { decimals, symbol, icon, price } = ft_meta;
    const tokensNumber = convertBalanceToReadableFormat(amount, decimals);

    return (
      <PortfolioCard
        hideBorder={index === ftTokens.length - 1}
        symbol={symbol}
        src={icon}
        balance={tokensNumber}
        showExpand={false}
        price={price ?? 0}
      />
    );
  });
};

useEffect(() => {
  if (!Array.isArray(ftTokens)) return;

  const tokenEvaluation = (token) =>
    parseInt(token.amount) / Math.pow(10, token.ft_meta.decimals ?? 1);

  const { tokensWithPrice, tokensWithoutPrice } = ftTokens.reduce(
    (acc, token) => {
      (token.ft_meta.price ? acc.tokensWithPrice : acc.tokensWithoutPrice).push(
        token
      );
      return acc;
    },
    { tokensWithPrice: [], tokensWithoutPrice: [] }
  );

  const sortedWithPrice = [...tokensWithPrice].sort(
    (a, b) =>
      b.ft_meta.price * tokenEvaluation(b) -
      a.ft_meta.price * tokenEvaluation(a)
  );

  const sortedWithoutPrice = [...tokensWithoutPrice].sort(
    (a, b) => tokenEvaluation(b) - tokenEvaluation(a)
  );

  const sortedTokens = [...sortedWithPrice, ...sortedWithoutPrice];

  // Separate validTokens (max 7) and remainingTokens
  const { validTokens, remainingTokens } = sortedTokens.reduce(
    (acc, token) => {
      if (
        acc.validTokens.length < 7 &&
        ((token?.ft_meta?.symbol?.length <= 6 &&
          !/\./.test(token?.ft_meta?.symbol)) ||
          token?.ft_meta.price)
      ) {
        acc.validTokens.push(token);
      } else {
        acc.remainingTokens.push(token);
      }
      return acc;
    },
    { validTokens: [], remainingTokens: [] }
  );

  setDisplayableTokens(validTokens);
  setHiddenTokens(remainingTokens);
}, [ftTokens]);

const LockupRow = ({
  label,
  tooltipInfo,
  value,
  noSpaceInEnd,
  hideBorder,
  showExpand,
  isExpanded,
  setIsExpanded,
}) => {
  return (
    <div
      className={
        "d-flex flex-column " + (showExpand && "cursor-pointer dropdown-item")
      }
      onClick={() => showExpand && setIsExpanded(!isExpanded)}
    >
      <div className={!hideBorder && "border-bottom"}>
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3 flex-wrap">
          <div className="h6 mb-0">
            {label}
            {"  "}{" "}
            <Widget
              loading=""
              src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
              props={{
                popup: tooltipInfo,
                children: <i className="bi bi-info-circle text-secondary"></i>,
                instance,
              }}
            />
          </div>
          <div className="d-flex">
            <div className="fw-semi-bold">{value}</div>
            <div
              style={{
                width: 20,
                display: noSpaceInEnd ? "none" : "",
                paddingLeft: 10,
              }}
            >
              {showExpand && (
                <i
                  className={
                    (isExpanded ? "bi bi-chevron-up" : "bi bi-chevron-down") +
                    " text-secondary h6 mb-0"
                  }
                ></i>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

useEffect(() => {
  if (
    isLockupContract &&
    lockupState &&
    !lockupStartDate &&
    nearBalances.contractLocked
  ) {
    const deserialized = deserializeLockupContract(
      new Uint8Array([...lockupState].map((c) => c.charCodeAt(0)))
    );
    let lockupStartTimestamp = deserialized.lockup_information.lockup_timestamp
      ? deserialized.lockup_information.lockup_timestamp.toString()
      : null;
    let releaseDuration = deserialized.lockup_information.release_duration
      ? deserialized.lockup_information.release_duration.toString()
      : null;
    const totalAllocated =
      deserialized.lockup_information.lockup_amount.toString();
    const locked = nearBalances.contractLocked;
    const transfersTimestamp = deserialized.lockup_information
      .transfers_information?.transfers_timestamp
      ? deserialized.lockup_information.transfers_information?.transfers_timestamp.toString()
      : null;

    if (!lockupStartTimestamp && transfersTimestamp) {
      lockupStartTimestamp = transfersTimestamp;
    }
    let lockupEndTimestamp = Big(lockupStartTimestamp ?? "0")
      .plus(releaseDuration ?? "0")
      .toFixed();
    let cliffTimestamp = null;
    if (deserialized.vesting_information?.schedule) {
      lockupStartTimestamp =
        deserialized.vesting_information?.schedule.start_timestamp.toString();
      cliffTimestamp =
        deserialized.vesting_information?.schedule.cliff_timestamp.toString();
      lockupEndTimestamp =
        deserialized.vesting_information?.schedule.end_timestamp.toString();
    }

    setLockupTotalAllocated(formatNearAmount(totalAllocated));
    setLockupVested(
      formatNearAmount(Big(totalAllocated).minus(locked).toFixed())
    );
    setLockupCliffDate(
      cliffTimestamp ? Number(cliffTimestamp) / 1_000_000 : null
    );
    setLockupUnvested(formatNearAmount(locked));
    setLockupStartDate(Number(lockupStartTimestamp) / 1_000_000);
    setLockupEndDate(Number(lockupEndTimestamp) / 1_000_000);
  }
}, [isLockupContract, lockupState, nearBalances]);

return (
  <div className="card flex-1 overflow-hidden border-bottom">
    {heading}
    <div className="mb-2">
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center w-100 h-100">
          <Loading />
        </div>
      ) : (
        <div>
          {!ftTokens.length && !nearBalances?.total ? (
            <div className="fw-bold p-3">Account doesn't own any FTs.</div>
          ) : (
            <div className="d-flex flex-column">
              {isLockupContract && (
                <div className="d-flex flex-column gap-2 px-3 py-2">
                  <div className="border border-1 rounded-3">
                    <LockupRow
                      label="Start Date"
                      value={
                        <Widget
                          loading=""
                          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
                          props={{
                            timestamp: lockupStartDate,
                            format: "date-only",
                            instance: instance,
                          }}
                        />
                      }
                      tooltipInfo="The date when the vesting period for this lockup account began."
                      showExpand={false}
                      noSpaceInEnd={true}
                    />
                    <LockupRow
                      label="End Date"
                      value={
                        <Widget
                          loading=""
                          src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
                          props={{
                            timestamp: lockupEndDate,
                            format: "date-only",
                            instance: instance,
                          }}
                        />
                      }
                      tooltipInfo="The date when the vesting period for this lockup account will end."
                      hideBorder={lockupCliffDate ? false : true}
                      showExpand={false}
                      noSpaceInEnd={true}
                    />
                    {lockupCliffDate && (
                      <LockupRow
                        label="Cliff Date"
                        value={
                          <Widget
                            loading=""
                            src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DateTimeDisplay"
                            props={{
                              timestamp: lockupCliffDate,
                              format: "date-only",
                              instance: instance,
                            }}
                          />
                        }
                        tooltipInfo="The first date when a portion of the original allocated amount becomes vested according to the vesting schedule. At the cliff date, tokens may unlock all at once or gradually over time. Before the cliff date, you can stake these tokens, but you are unable to use them for any other payments."
                        hideBorder={true}
                        showExpand={false}
                        noSpaceInEnd={true}
                      />
                    )}
                  </div>
                  <div className="border border-1 rounded-3">
                    <LockupRow
                      label="Original allocated amount"
                      value={lockupTotalAllocated + " NEAR"}
                      tooltipInfo="The total amount of tokens initially allocated to this lockup account."
                      hideBorder={!isLockupTokensExpanded}
                      showExpand={true}
                      isExpanded={isLockupTokensExpanded}
                      setIsExpanded={setLockupTokensExpanded}
                    />
                    {isLockupTokensExpanded && (
                      <div
                        style={{ backgroundColor: "var(--bg-system-color)" }}
                      >
                        <LockupRow
                          label="Vested"
                          value={lockupVested + " NEAR"}
                          tooltipInfo="The portion of the original allocated amount that has become available for payments use according to the vesting schedule. This amount may or may not have already been used."
                        />
                        <LockupRow
                          label="Unvested"
                          value={lockupUnvested + " NEAR"}
                          tooltipInfo="The portion of the original allocated amount that is still locked and will become available gradually according to the vesting schedule. You can stake these tokens and are entitled to receive them in the future. Tokens automatically move from “Unvested” to “Vested” over time according to the vesting schedule."
                          hideBorder={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <NearPortfolio />
              <TokensList tokens={displayableTokens} />
              {hiddenTokens.length > 0 && (
                <>
                  {showHiddenTokens && <TokensList tokens={hiddenTokens} />}
                  <div
                    role="button"
                    className="d-flex align-items-center justify-content-between px-3 py-2"
                    onClick={() => setShowHiddenTokens(!showHiddenTokens)}
                  >
                    <div>{showHiddenTokens ? "Hide" : "Show more"} tokens</div>
                    <i
                      className={
                        (showHiddenTokens
                          ? "bi bi-chevron-up"
                          : "bi bi-chevron-down") + " text-secondary h6 mb-0"
                      }
                    ></i>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
