const tokens = props.tokens ?? [];
const defaultTokenId = props.defaultTokenId;
const onChange = props.onChange ?? (() => {});
const sendToken = props.sendToken;

const [filteredTokens, setFilteredTokens] = useState([]);
const [searchTerm, setSearchTerm] = useState(null);
const [selectedTokenId, setSelectedTokenId] = useState(null);
const [isOpen, setIsOpen] = useState(false);

const toggleDropdown = () => {
  setIsOpen(!isOpen);
};

useEffect(() => {
  if (defaultTokenId !== selectedTokenId) {
    setSelectedTokenId(defaultTokenId);
  }
}, [defaultTokenId]);

useEffect(() => {
  if (tokens && !filteredTokens.length) {
    setFilteredTokens(tokens);
  }
}, [tokens]);

function searchTokens(event) {
  const lowercasedQuery = event.target.value.toLowerCase();
  setSearchTerm(lowercasedQuery);
  setFilteredTokens(
    tokens.filter(
      (token) =>
        token.id.toLowerCase().includes(lowercasedQuery) ||
        token.symbol.toLowerCase().includes(lowercasedQuery) ||
        token.name.toLowerCase().includes(lowercasedQuery)
    )
  );
}

const TokenWithSymbol = ({ token, showPrice }) => {
  const imageSize = showPrice ? 30 : 25;
  return (
    <div className="d-flex gap-1 align-items-center h-100 cursor-pointer">
      <img src={token.icon} height={imageSize} width={imageSize} />
      <div>
        <h6 className="mb-0">{token.symbol}</h6>
        {showPrice && <div className="text-muted text-sm"> ${token.price}</div>}
      </div>
    </div>
  );
};

const Container = styled.div`
  border-top-right-radius: 0.375rem;
  border-bottom-right-radius: 0.375rem;
  .dropdown-toggle:after {
    position: absolute;
    top: 46%;
    right: 5%;
  }

  .dropdown-menu {
    width: 350px;
    right: 0;
  }

  .dropdown-item.active,
  .dropdown-item:active {
    background-color: #f0f0f0 !important;
    color: black;
  }

  .custom-select {
    position: relative;
  }

  .scroll-box {
    max-height: 300px;
    overflow-y: scroll;
  }

  .selected {
    background-color: #f0f0f0;
  }

  input {
    background-color: #f8f9fa;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .text-wrap {
    overflow: hidden;
    white-space: normal;
  }

  .disabled img {
    opacity: 0.8;
  }
`;

const Viewer = ({ tokenId }) => {
  const tokenMeta = filteredTokens.find((i) => i.id === tokenId);
  if (tokenMeta) {
    return <TokenWithSymbol token={tokenMeta} />;
  } else return <></>;
};

const handleTokenClick = (token) => {
  setSelectedTokenId(token.id);
  setIsOpen(false);
  onChange(token.id);
};

let searchFocused = false;
return (
  <Container className="border border-1" style={{ minWidth: 125 }}>
    <div
      className="custom-select h-100"
      tabIndex="0"
      onBlur={() => {
        setTimeout(() => {
          setIsOpen(searchFocused || false);
        }, 0);
      }}
    >
      <div
        className="dropdown-toggle cursor-pointer h-100 "
        style={{ paddingLeft: "8px" }}
        onClick={toggleDropdown}
      >
        <Viewer tokenId={selectedTokenId ?? defaultTokenId} />
      </div>
      {isOpen && (
        <div className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2 shadow show">
          <div className="d-flex flex-column gap-2 scroll-box">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Search"
              value={searchTerm}
              onChange={searchTokens}
              onFocus={() => {
                searchFocused = true;
              }}
              onBlur={() => {
                setTimeout(() => {
                  searchFocused = false;
                }, 0);
              }}
            />

            <div className="d-flex w-100 justify-content-between gap-1 px-1">
              <div className="text-muted h6 mb-0">Token</div>
              <div className="text-muted h6 mb-0">Balance</div>
            </div>

            <div className="d-flex flex-column gap-2">
              {filteredTokens.map((token) => {
                let isDisabled = false;
                if (sendToken === "near" && token.id !== "wrap.near") {
                  isDisabled = true;
                }
                return (
                  <div
                    className={
                      "d-flex dropdown-item justify-content-between gap-1 p-1 " +
                      (isDisabled && " disabled")
                    }
                    onClick={() => {
                      !isDisabled && handleTokenClick(token);
                    }}
                  >
                    <div className="flex-1">
                      <TokenWithSymbol token={token} showPrice={true} />
                    </div>
                    <div className="text-muted">
                      <div>{Big(token.parsedBalance).toFixed(4)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  </Container>
);
