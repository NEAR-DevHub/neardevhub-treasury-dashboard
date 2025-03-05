const { getNearBalances, TooltipText } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { NearToken } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || { NearToken: () => <></> };

const { Skeleton } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.skeleton"
);

if (typeof getNearBalances !== "function" || !Skeleton) {
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
    <div className="d-flex flex-column">
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
  !nearBalances.total;

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

function deserializeLockupContract(byteArray) {
  let offset = 0;

  function readU8() {
    return byteArray[offset++];
  }

  function readU32() {
    const bytes = [
      byteArray[offset++],
      byteArray[offset++],
      byteArray[offset++],
      byteArray[offset++],
    ];
    let result = new BN(0);
    for (let i = 0; i < 4; i++) {
      result = result.add(new BN(bytes[i]).mul(new BN(256).pow(new BN(i))));
    }
    return result;
  }

  function readU64() {
    const bytes = Array(8)
      .fill(0)
      .map(() => byteArray[offset++]);
    let result = new BN(0);
    for (let i = 0; i < 8; i++) {
      result = result.add(new BN(bytes[i]).mul(new BN(256).pow(new BN(i))));
    }
    return result;
  }

  function readU128() {
    const bytes = Array(16)
      .fill(0)
      .map(() => byteArray[offset++]);
    let result = new BN(0);
    for (let i = 0; i < 16; i++) {
      result = result.add(new BN(bytes[i]).mul(new BN(256).pow(new BN(i))));
    }
    return result;
  }

  function readString() {
    const length = readU32().toNumber();
    const strBytes = byteArray.slice(offset, offset + length);
    offset += length;
    return String.fromCharCode(...strBytes);
  }

  function readOption(reader) {
    const hasValue = readU8() === 1;
    return hasValue ? reader() : null;
  }

  function readVecU8() {
    const length = readU32();
    const bytes = byteArray.slice(offset, offset + length);
    offset += length;
    return Array.from(bytes);
  }

  // Deserialize TransfersInformation enum
  function readTransfersInformation() {
    const variant = readU8();
    if (variant === 0) {
      return {
        type: "TransfersEnabled",
        transfers_timestamp: readU64(),
      };
    } else if (variant === 1) {
      return {
        type: "TransfersDisabled",
        transfer_poll_account_id: readString(),
      };
    }
    console.log("var", variant);
    throw `Invalid TransfersInformation variant ${variant}`;
  }

  // Deserialize TransactionStatus enum
  function readTransactionStatus() {
    const variant = readU8();
    return variant === 0 ? "Idle" : "Busy";
  }

  // Deserialize VestingSchedule
  function readVestingSchedule() {
    return {
      start_timestamp: readU64(),
      cliff_timestamp: readU64(),
      end_timestamp: readU64(),
    };
  }

  // Deserialize VestingInformation enum
  function readVestingInformation() {
    const variant = readU8();
    switch (variant) {
      case 0:
        return { type: "None" };
      case 1:
        return {
          type: "VestingHash",
          hash: readVecU8(),
        };
      case 2:
        return {
          type: "VestingSchedule",
          schedule: readVestingSchedule(),
        };
      case 3:
        return {
          type: "Terminating",
          unvested_amount: readU128(),
          status: readU8(), // TerminationStatus as simple u8 for now
        };
      default:
        throw new Error("Invalid VestingInformation variant");
    }
  }

  const result = {
    owner_account_id: readString(),
    lockup_information: {
      lockup_amount: readU128(),
      termination_withdrawn_tokens: readU128(),
      lockup_duration: readU64(),
      release_duration: readOption(readU64),
      lockup_timestamp: readOption(readU64),
      transfers_information: readTransfersInformation(),
    },
    vesting_information: readVestingInformation(),
    staking_pool_whitelist_account_id: readString(),
    staking_information: readOption(() => ({
      staking_pool_account_id: readString(),
      status: readTransactionStatus(),
      deposit_amount: readU128(),
    })),
    foundation_account_id: readOption(readString),
  };

  return result;
}

function convertToDate(nanoseconds) {
  const milliseconds = Number(nanoseconds) / 1_000_000; // Convert to milliseconds
  const date = new Date(milliseconds);

  const options = { year: "numeric", month: "long", day: "numeric" };
  const formattedDate = date.toLocaleDateString("en-US", options);

  return formattedDate;
}

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
    const lockupTimestamp =
      deserialized.lockup_information.lockup_timestamp.toString();
    const releaseDuration =
      deserialized.lockup_information.release_duration.toString();
    const totalAllocated =
      deserialized.lockup_information.lockup_amount.toString();
    const locked = nearBalances.contractLocked;
    setLockupTotalAllocated(formatNearAmount(totalAllocated));
    setLockupVested(
      formatNearAmount(Big(totalAllocated).minus(locked).toFixed())
    );
    setLockupUnvested(formatNearAmount(locked));
    setLockupStartDate(convertToDate(lockupTimestamp));
    setLockupEndDate(
      convertToDate(Big(lockupTimestamp).plus(releaseDuration).toFixed())
    );
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
                      label="Started"
                      value={lockupStartDate}
                      tooltipInfo="The date when the vesting period for this lockup account began."
                      showExpand={false}
                      noSpaceInEnd={true}
                    />
                    <LockupRow
                      label="End"
                      value={lockupEndDate}
                      tooltipInfo="The date when the vesting period for this lockup account will end."
                      hideBorder={true}
                      showExpand={false}
                      noSpaceInEnd={true}
                    />
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
