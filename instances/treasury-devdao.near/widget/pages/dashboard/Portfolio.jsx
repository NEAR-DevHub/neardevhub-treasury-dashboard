const { getNearBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

if (typeof getNearBalances !== "function") {
  return <></>;
}

const archiveNodeUrl = "https://archival-rpc.mainnet.near.org";
const nearTokenIcon = "${REPL_NEAR_TOKEN_ICON}";

function formatToReadableDecimals(number) {
  return Big(number ?? "0").toFixed(4);
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

const loading = (
  <Widget src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"} />
);

const [isNearPortfolioExpanded, setNearPortfolioExpanded] = useState(false);
const [isNearStakedPortfolioExpanded, setNearStakedPortfolioExpanded] =
  useState(false);

const BalanceDisplay = ({
  label,
  balance,
  price,
  icon,
  tooltipInfo,
  showExpand,
  isExpanded,
  setIsExpanded,
  expandedContent,
}) => {
  return (
    <div className="d-flex flex-column">
      <div className="border-bottom">
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3">
          <div className="h6 mb-0">
            {label}
            {"  "}{" "}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="tooltip">{tooltipInfo}</Tooltip>}
            >
              <i className="bi bi-info-circle text-grey"></i>
            </OverlayTrigger>
          </div>
          <div className="d-flex gap-3 align-items-center justify-content-end">
            <div className="d-flex flex-column align-items-end">
              <div className="h6 mb-0 d-flex align-items-center gap-1">
                <img src={icon} height={15} width={15} />
                {formatToReadableDecimals(balance)}
              </div>
              <div className="text-sm text-grey">
                ${formatToReadableDecimals(getPrice(balance, price))}
              </div>
            </div>
            <div style={{ width: 20 }}>
              {showExpand && (
                <div
                  className="cursor-pointer"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <i
                    className={
                      (isExpanded ? "bi bi-chevron-up" : "bi bi-chevron-down") +
                      " text-grey h6 mb-0"
                    }
                  ></i>
                </div>
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
  icon,
  balance,
  showExpand,
  price,
  isExpanded,
  setIsExpanded,
  symbol,
  expandedContent,
}) => {
  return (
    <div className="d-flex flex-column">
      <div className="border-bottom">
        <div className="py-2 d-flex gap-2 align-items-center justify-content-between px-3">
          <div className="d-flex align-items-center gap-2">
            <img src={icon} height={30} width={30} />
            <div>
              <div className="h6 mb-0">{symbol}</div>
              <div className="text-sm text-grey">
                ${Big(price ?? "0").toFixed(4)}
              </div>
            </div>
          </div>
          <div className="d-flex gap-3 align-items-center justify-content-end">
            <div className="d-flex flex-column align-items-end">
              <div className="h6 mb-0">{formatToReadableDecimals(balance)}</div>
              <div className="text-sm text-grey">
                ${formatToReadableDecimals(getPrice(balance, price))}
              </div>
            </div>
            <div style={{ width: 20 }}>
              {showExpand && (
                <div
                  className="cursor-pointer"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <i
                    className={
                      (isExpanded ? "bi bi-chevron-up" : "bi bi-chevron-down") +
                      " text-grey h6 mb-0"
                    }
                  ></i>
                </div>
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
  return (
    <PortfolioCard
      symbol={"NEAR"}
      icon={nearTokenIcon}
      balance={nearBalances.totalParsed}
      showExpand={true}
      price={nearPrice}
      isExpanded={isNearPortfolioExpanded}
      setIsExpanded={setNearPortfolioExpanded}
      expandedContent={
        <div className="d-flex flex-column">
          <BalanceDisplay
            icon={nearTokenIcon}
            label={"Available Balance"}
            balance={nearBalances.availableParsed}
            tooltipInfo={"dsfds"}
            price={nearPrice}
          />

          <BalanceDisplay
            icon={nearTokenIcon}
            label={"Staked"}
            balance={nearStakedTokens}
            tooltipInfo={"dsfds"}
            price={nearPrice}
            showExpand={true}
            isExpanded={isNearStakedPortfolioExpanded}
            setIsExpanded={setNearStakedPortfolioExpanded}
            expandedContent={
              <div
                className="d-flex flex-column"
                style={{ backgroundColor: "rgba(244, 244, 244, 1)" }}
              >
                <BalanceDisplay
                  icon={nearTokenIcon}
                  label={"Staked"}
                  balance={nearStakedTokens}
                  tooltipInfo={"dsfds"}
                  price={nearPrice}
                />
                <BalanceDisplay
                  icon={nearTokenIcon}
                  label={"Pending Release"}
                  balance={nearUnStakedTokens}
                  tooltipInfo={"dsfds"}
                  price={nearPrice}
                />
                <BalanceDisplay
                  icon={nearTokenIcon}
                  label={"Available for withdrawal"}
                  balance={nearUnStakedTokens}
                  tooltipInfo={"dsfds"}
                  price={nearPrice}
                />
              </div>
            }
          />
          {isLockupContract ? (
            <BalanceDisplay
              icon={nearTokenIcon}
              label={"Locked"}
              balance={nearBalances.lockedParsed}
              tooltipInfo={"dsfds"}
              price={nearPrice}
            />
          ) : (
            <BalanceDisplay
              icon={nearTokenIcon}
              label={"Reserved for storage"}
              balance={nearBalances.lockedParsed}
              tooltipInfo={"dsfds"}
              price={nearPrice}
            />
          )}
        </div>
      }
    />
  );
};

return (
  <div className="card flex-1">
    {heading}
    <div>
      {ftTokens === null ||
      nearStakedTokens === null ||
      nearBalances === null ||
      nearPrice === null ? (
        <div className="d-flex justify-content-center align-items-center w-100 h-100">
          {loading}
        </div>
      ) : (
        <div className="mt-2">
          {!ftTokens.length && !nearBalances?.total ? (
            <div className="fw-bold p-3">Account doesn't own any FTs.</div>
          ) : (
            <div className="d-flex flex-column">
              <NearPortfolio />
              {Array.isArray(ftTokens) &&
                ftTokens.map((item, index) => {
                  const { ft_meta, amount } = item;
                  const { decimals, symbol, icon, price } = ft_meta;
                  const tokensNumber = convertBalanceToReadableFormat(
                    amount,
                    decimals
                  );
                  const tokenPrice = price ?? 0;
                  return (
                    <PortfolioCard
                      symbol={symbol}
                      icon={icon}
                      balance={tokensNumber}
                      showExpand={false}
                      price={tokenPrice}
                    />
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
