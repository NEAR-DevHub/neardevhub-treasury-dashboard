const { VerifiedTick, NotVerfiedTick, User, Copy } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  VerifiedTick: () => <></>,
  NotVerfiedTick: () => <></>,
  User: () => <></>,
  Copy: () => <></>,
  // NearToken: () => <></>,
};

const { instance } = props;

const [fromAmount, setFromAmount] = useState("0");
const [toAmount, setToAmount] = useState("");
const [recipient, setRecipient] = useState("");
const [recipientSearch, setRecipientSearch] = useState("");
const [showKycStatusVerified, setShowKycStatusVerified] = useState(true);
const [showKycStatusNotVerified, setShowKycStatusNotVerified] = useState(true);
const [selectedTokens, setSelectedTokens] = useState([
  { id: "usdc", name: "USDC", logo: "circle" },
  { id: "usdt", name: "USDt", logo: "tether" },
  { id: "near", name: "NEAR", logo: "near" },
]);
const [approvers, setApprovers] = useState([]);
const [approversSearch, setApproversSearch] = useState("");
const [isOpen, setIsOpen] = useState(true);
const [numberOfFiltersApplied, setNumberOfFiltersApplied] = useState(0);

const getNumberOfFiltersApplied = () => {
  let count = 0;
  if (fromAmount !== "") count++;
  if (toAmount !== "") count++;
  if (recipient !== "") count++;
  if (showKycStatusVerified == false) count++;
  if (showKycStatusNotVerified == false) count++;
  if (selectedTokens.length > 0) count++;
  if (approvers.length > 0) count++;
  setNumberOfFiltersApplied(count);
  return count;
}

const removeSelectedToken = (tokenId) => {
  setSelectedTokens(selectedTokens.filter((token) => token.id !== tokenId));
}

const addSelectedToken = (tokenId) => {
  setSelectedTokens([...selectedTokens, { id: tokenId, name: tokenId, logo: "circle" }]);
}

useEffect(() => {
  getNumberOfFiltersApplied();
}, [fromAmount, toAmount, recipient, showKycStatusVerified, showKycStatusNotVerified, selectedTokens, approvers]);

if (!instance) {
  return <></>;
}

const { showReferenceProposal } = VM.require(`${instance}/widget/config.data`);


const TokenLogo = ({ type }) => {
  if (type === "circle") {
    return (
      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white" style={{ width: "20px", height: "20px", fontSize: "12px", fontWeight: "bold" }}>
        T
      </div>
    );
  }

  if (type === "tether") {
    return (
      <div className="rounded-circle bg-info d-flex align-items-center justify-content-center text-white" style={{ width: "20px", height: "20px", fontSize: "12px", fontWeight: "bold" }}>
        T
      </div>
    );
  }

  if (type === "near") {
    // return <NearToken />
    return <div className="rounded-circle bg-info d-flex align-items-center justify-content-center text-white" style={{ width: "20px", height: "20px", fontSize: "12px", fontWeight: "bold" }}>
            T
          </div>
  }

  return null;
};

const verificationStatus = 'verified'

const Container = styled.div`
  .dropdown-toggle:after {
    display: none;
  }

  .dropdown-menu {
    position: absolute;
    top: 110%;
    right: 0;
    min-width: 420px;
    z-index: 9999;
  }

  .custom-select {
    position: relative;
  }

  .token-badge {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 999px;
    padding: 4px 4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const clearFilters = () => {
  setFromAmount("");
  setToAmount("");
  setRecipient("");
  setSelectedTokens([]);
  setShowKycStatusVerified(true);
  setShowKycStatusNotVerified(true);
  setApprovers([]);
  setApproversSearch("");
  setRecipientSearch("");
}

const allRecipientOptions = [
  {
    label: (
      <span className="text-sm">
        <b>#1</b> frol (@frol.near)
      </span>
    ),
    value: "1",
    },
  {
    label: (
      <span className="text-sm">
        <b>#2</b> nearblocks (@nearblocks_io.near)
      </span>
    ),
    value: "2",
  },
  {
    label: (
      <span className="text-sm">
        <b>#3</b> harry (@harry.near)
      </span>
    ),
    value: "3",
  },
]

const allApproversOptions = [
  {
    label: (
      <span className="text-sm">
        <b>#1</b> frol (@frol.near)
      </span>
    ),
    value: "1",
  },
  {
    label: (
      <span className="text-sm">
        <b>#2</b> nearblocks (@nearblocks_io.near)
      </span>
    ),
    value: "2",
  },
];


return (
  <Container>
    <div className="custom-select w-100" tabIndex="0" >
     { numberOfFiltersApplied == 0 ? <div className="dropdown-toggle btn btn-outline-secondary" onClick={() => setIsOpen(!isOpen)}>
        <i className="bi bi-funnel"></i>
      </div> :
      <div className="btn btn-outline-secondary d-flex align-items-center gap-2">
        <div className="position-relative">
            <i className="bi bi-funnel"></i>
            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-primary border border-light rounded-circle">
            </span>
        </div>
        {numberOfFiltersApplied} filters applied
      </div>}

      {isOpen && (
        <div className="dropdown-menu rounded-2 dropdown-menu-end shadow show">
          <div className="d-flex justify-content-between align-items-center px-3 pt-1 pb-2">
            <h5 className="mb-0">Filters</h5>
            <button className="btn btn-link text-secondary text-decoration-none" onClick={clearFilters}>Clear</button>
          </div>

          <div className="border-top">
          <div className="p-3">
            <div className="text-secondary mb-2">Funding Ask</div>
            <div className="d-flex gap-3 mb-4">
              <div className="flex-grow-1">
                <div className="mb-1">From</div>
                <div className="input-group">
                  <input
                    type="text"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="form-control"
                    placeholder="0"
                  />
                  <span className="input-group-text">USD</span>
                </div>
              </div>

              <div className="flex-grow-1">
                <div className="mb-1">To</div>
                <div className="input-group">
                  <input
                    type="text"
                    value={toAmount}
                    onChange={(e) => setToAmount(e.target.value)}
                    className="form-control"
                    placeholder="1000"
                  />
                  <span className="input-group-text">USD</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-secondary mb-2">Recipient</div>
            
              <div className="position-relative">
                <Widget src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"} props={{
                  options: [],
                  value: recipient,
                  onChange: (e) => setRecipient(e.target.value),
                  placeholder: "Select",
                  selectedValue: recipient,
                  options:allRecipientOptions,
                  defaultLabel: "Select",
                  showSearch: true,
                  searchInputPlaceholder: "Search",
                  searchByLabel: true,
                  searchByValue: true,
                  onSearch: (e) => setRecipientSearch(e.target.value),
                  showManualRequest: false,
                  onClickOfManualRequest: () => {},
                  isLoadingProposals: false,
                }} />
                <i className="bi bi-search position-absolute" style={{ right: "12px", top: "50%", transform: "translateY(-50%)" }}></i>
              </div>
            </div>
            <div className="mb-4">
              <div className="d-flex align-items-center text-secondary mb-2">
                <span>Requested Token ({selectedTokens.length})</span>
                <div className="text-secondary pointer p-0 ms-2" onClick={() => setSelectedTokens([])}>
                  <i className="bi bi-x"></i>
                </div>
              </div>

              <div className="position-relative border rounded p-2" style={{ minHeight: "40px" }}>
                <div className="d-flex flex-wrap gap-2">
                  {selectedTokens.map((token) => (
                    <div key={token.id} className="token-badge">
                      <TokenLogo type={token.logo} />
                      <span>{token.name}</span>
                      <div className="p-0 pointer" onClick={() => removeSelectedToken(token.id)}>
                        <i className="bi bi-x"></i>
                      </div>
                    </div>
                  ))}
                </div>
                <i className="bi bi-chevron-down position-absolute" style={{ right: "12px", top: "50%", transform: "translateY(-50%)" }}></i>
              </div>
            </div>

            <div>
              <div className="text-secondary mb-2">Approvers</div>
              <div className="position-relative">
              <Widget src={"${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"} props={{
                  value: approvers,
                  onChange: (e) => setApprovers(e.target.value),
                  placeholder: "Select",
                  selectedValue: approvers,
                  options: allApproversOptions,
                  defaultLabel: "Select",
                  showSearch: true,
                  searchInputPlaceholder: "Search",
                  searchByLabel: true,
                  searchByValue: true,
                  onSearch: (e) => setApproversSearch(e.target.value),
                  showManualRequest: false,
                  onClickOfManualRequest: () => {},
                  isLoadingProposals: false,
                }} />
                <i className="bi bi-search position-absolute" style={{ right: "12px", top: "50%", transform: "translateY(-50%)" }}></i>
              </div>
            </div>
            </div>

          </div>
        </div>
      )}
    </div>
  </Container>
);
