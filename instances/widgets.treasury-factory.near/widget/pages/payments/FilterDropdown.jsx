const { instance } = props;
const [fromAmount, setFromAmount] = useState("");
const [toAmount, setToAmount] = useState("");
const [recipient, setRecipient] = useState("");
const [recipientSearch, setRecipientSearch] = useState("");
const [allRecipients, setAllRecipients] = useState([]);
const [allRecipientOptions, setAllRecipientOptions] = useState([]);
const [showKycStatusVerified, setShowKycStatusVerified] = useState(true);
const [showKycStatusNotVerified, setShowKycStatusNotVerified] = useState(true);
const [selectedTokens, setSelectedTokens] = useState([]);
const [allTokensOptions, setAllTokensOptions] = useState([]);
const [approvers, setApprovers] = useState([]);
const [approversSearch, setApproversSearch] = useState("");
const [allApproversOptions, setAllApproversOptions] = useState([]);
const [isOpen, setIsOpen] = useState(false);
const [numberOfFiltersApplied, setNumberOfFiltersApplied] = useState(0);

const ENDPOINT =
  "https://testing-indexer-2.fly.dev/dao/proposals/testing-astradao.sputnik-dao.near";
function fetchFilterOptions() {
  const options = ["token_ids", "approvers", "receivers"];
  const promises = options.map((option) => {
    const fetchUrl = `${ENDPOINT}/${option}`;
    return asyncFetch(fetchUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    })
      .then((response) => {
        return response; // Return successful response
      })
      .catch((error) => {
        console.log(`Error fetching ${option} in fetchFilterOptions: `, error);
        // Return a default/empty response instead of throwing
        return { body: [], ok: false, error };
      });
  });
  return Promise.all(promises);
}

useEffect(() => {
  fetchFilterOptions().then((r) => {
    // console.log("Returned from fetchFilterOptions", r);
    if (r[0]?.ok !== false) {
      let allTokens = r[0].body || [];
      setAllTokensOptions(allTokens);
    }
    if (r[1]?.ok !== false) {
      let allApprovers = (r[1].body || []).map((approver, index) => {
        return {
          label: (
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
              props={{
                accountId: approver,
                showKYC: true,

                instance,
              }}
            />
          ),
          value: approver,
        };
      });
      setAllApproversOptions(allApprovers);
    }
    if (r[2]?.ok !== false) {
      let allRecipients = (r[2].body || []).map((recipient, index) => {
        return {
          label: (
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
              props={{
                accountId: recipient,
                showKYC: true,
                instance,
              }}
            />
          ),
          value: recipient,
        };
      });
      setAllRecipientOptions(allRecipients);
    }
  });
}, []);

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
};

const removeSelectedToken = (tokenId) => {
  setSelectedTokens(selectedTokens.filter((token) => token.id !== tokenId));
};

const addSelectedToken = (tokenId) => {
  setSelectedTokens([
    ...selectedTokens,
    { id: tokenId, name: tokenId, logo: "circle" },
  ]);
};

useEffect(() => {
  getNumberOfFiltersApplied();
}, [
  fromAmount,
  toAmount,
  recipient,
  showKycStatusVerified,
  showKycStatusNotVerified,
  selectedTokens,
  approvers,
]);

if (!instance) {
  return <></>;
}

const { showReferenceProposal } = VM.require(`${instance}/widget/config.data`);

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
};

// useEffect(() => {
//   console.log("allRecipientOptions", allRecipientOptions);
// }, [allRecipientOptions]);

// useEffect(() => {
//   console.log("allApproversOptions", allApproversOptions);
// }, [allApproversOptions]);

// useEffect(() => {
//   console.log("allTokensOptions", allTokensOptions);
// }, [allTokensOptions]);

return (
  <Container>
    <div className="custom-select w-100" tabIndex="0">
      {numberOfFiltersApplied == 0 ? (
        <div
          className="dropdown-toggle btn btn-outline-secondary"
          onClick={() => setIsOpen(!isOpen)}
        >
          <i className="bi bi-funnel"></i>
        </div>
      ) : (
        <div
          className="btn btn-outline-secondary d-flex align-items-center gap-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="position-relative">
            <i className="bi bi-funnel"></i>
            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-primary border border-light rounded-circle"></span>
          </div>
          {numberOfFiltersApplied} filters applied
        </div>
      )}

      {isOpen && (
        <div className="dropdown-menu rounded-2 dropdown-menu-end shadow show">
          <div className="d-flex justify-content-between align-items-center px-3 pt-1 pb-2">
            <h5 className="mb-0">Filters</h5>
            <button
              className="btn btn-link text-secondary text-decoration-none"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>

          <div className="border-top">
            <div className="p-3">
              <div className="text-secondary mb-2">Funding Ask</div>
              <div className="d-flex gap-3 mb-4">
                <div className="flex-grow-1">
                  <div className="mb-1">From</div>
                  <div className="input-group">
                    <input
                      type="number"
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
                      type="number"
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
                  <Widget
                    src={
                      "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
                    }
                    props={{
                      options: [],
                      value: recipient,
                      onChange: (e) => setRecipient(e.target.value),
                      placeholder: "Select",
                      selectedValue: recipient,
                      options: allRecipientOptions,
                      defaultLabel: "Select",
                      showSearch: true,
                      searchInputPlaceholder: "Search",
                      searchByLabel: true,
                      searchByValue: true,
                      onSearch: (e) => setRecipientSearch(e.target.value),
                      showManualRequest: false,
                      onClickOfManualRequest: () => {},
                      isLoadingProposals: false,
                    }}
                  />
                  <i
                    className="bi bi-search position-absolute"
                    style={{
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  ></i>
                </div>
              </div>
              <div className="mb-4">
                <div className="d-flex align-items-center text-secondary mb-2">
                  <span>Requested Token ({selectedTokens.length})</span>
                  <div
                    className="text-secondary pointer p-0 ms-2"
                    onClick={() => setSelectedTokens([])}
                  >
                    <i className="bi bi-x"></i>
                  </div>
                </div>

                <div
                  className="position-relative border rounded p-2"
                  style={{ minHeight: "40px" }}
                >
                  <div className="d-flex flex-wrap gap-2">
                    {allTokensOptions.map((token_id) => (
                      <div key={token_id} className="token-badge">
                        <Widget
                          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenIcon`}
                          props={{
                            address: token_id,
                          }}
                        />
                        <div
                          className="p-0 pointer"
                          onClick={() => removeSelectedToken(token_id)}
                        >
                          <i className="bi bi-x"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  <i
                    className="bi bi-chevron-down position-absolute"
                    style={{
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  ></i>
                </div>
              </div>

              <div>
                <div className="text-secondary mb-2">Approvers</div>
                <div className="position-relative">
                  <Widget
                    src={
                      "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownWithSearchAndManualRequest"
                    }
                    props={{
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
                    }}
                  />
                  <i
                    className="bi bi-search position-absolute"
                    style={{
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  ></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </Container>
);
