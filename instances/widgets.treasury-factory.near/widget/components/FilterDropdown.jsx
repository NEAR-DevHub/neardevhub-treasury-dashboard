const { VerifiedTick, NotVerfiedTick } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  VerifiedTick: () => <></>,
  NotVerfiedTick: () => <></>,
};

const { instance } = props;
const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const [fromAmount, setFromAmount] = useState("");
const [toAmount, setToAmount] = useState("");
const [recipients, setRecipients] = useState([]);
const [recipientSearch, setRecipientSearch] = useState("");
const [allRecipients, setAllRecipients] = useState([]);
const [allRecipientOptions, setAllRecipientOptions] = useState([]);
const [recipientsKycStatus, setRecipientsKycStatus] = useState([]);
const [showKycStatusVerified, setShowKycStatusVerified] = useState(true);
const [showKycStatusNotVerified, setShowKycStatusNotVerified] = useState(true);
const [selectedTokens, setSelectedTokens] = useState([]);
const [allTokensOptions, setAllTokensOptions] = useState([]);
const [approvers, setApprovers] = useState([]);
const [approversSearch, setApproversSearch] = useState("");
const [allApproversOptions, setAllApproversOptions] = useState([]);
const [isOpen, setIsOpen] = useState(false);
const [numberOfFiltersApplied, setNumberOfFiltersApplied] = useState(0);

function fetchFilterOptions() {
  const options = ["token_ids", "approvers", "receivers"];
  const promises = options.map((option) => {
    const fetchUrl = `${REPL_SPUTNIK_INDEXER_URL}/dao/proposals/${treasuryDaoID}/${option}`;
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

// Get the filter options from the indexer
useEffect(() => {
  fetchFilterOptions()
    .then((r) => {
      // What tokens are available in proposals?
      if (r[0]?.ok !== false) {
        let allTokens = r[0].body || [];
        setAllTokensOptions(allTokens);
        setSelectedTokens(allTokens);
      }
      // What approvers are available in proposals?
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
      // What recipients are available in proposals?
      if (r[2]?.ok !== false) {
        let allRecipients = (r[2].body || []).map((recipient, index) => {
          return {
            label: (
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
                props={{
                  accountId: recipient,
                  instance,
                }}
              />
            ),
            value: recipient,
          };
        });
        console.log("allRecipients", allRecipients);
        setAllRecipientOptions(allRecipients);
      }
      return allRecipients;
    })
    .then((r) => {
      return Promise.all(
        r.map(({ value: recipient }) => {
          return asyncFetch(
            `https://neardevhub-kyc-proxy-gvbr.shuttle.app/kyc/${recipient}`
          ).then((res) => {
            // res.body.kyc_status // APPROVED, PENDING, NOT_SUBMITTED, REJECTED, EXPIRED
            return {
              recipient: recipient,
              kycStatus: res.body.kyc_status,
            };
          });
        })
      )
        .then((rWithKycStatus) => {
          console.log("rWithKycStatus", rWithKycStatus);
          setRecipientsKycStatus(rWithKycStatus);
        })
        .catch((error) => {
          console.log("error1", error);
        });
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
  setSelectedTokens(selectedTokens.filter((token) => token !== tokenId));
};

// TODO: add token
const addSelectedToken = (tokenId) => {
  setSelectedTokens([...selectedTokens, tokenId]);
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

// Load saved filters from storage
const savedFilters = JSON.parse(
  Storage.get(
    "PAYMENT_FILTERS"
    // FIXME:`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FilterDropdown`
  ) ?? "null"
);

// Initialize state with saved values if available
useEffect(() => {
  if (savedFilters) {
    if (savedFilters.fromAmount !== undefined)
      setFromAmount(savedFilters.fromAmount);
    if (savedFilters.toAmount !== undefined) setToAmount(savedFilters.toAmount);
    if (savedFilters.recipient !== undefined)
      setRecipients(savedFilters.recipient);
    if (savedFilters.showKycStatusVerified !== undefined)
      setShowKycStatusVerified(savedFilters.showKycStatusVerified);
    if (savedFilters.showKycStatusNotVerified !== undefined)
      setShowKycStatusNotVerified(savedFilters.showKycStatusNotVerified);
    if (savedFilters.selectedTokens !== undefined)
      if (savedFilters.approvers !== undefined)
        // setSelectedTokens(savedFilters.selectedTokens);
        setApprovers(savedFilters.approvers);
  }
}, []);

// Save filters whenever they change
useEffect(() => {
  const filtersToSave = {
    fromAmount,
    toAmount,
    recipient,
    showKycStatusVerified,
    showKycStatusNotVerified,
    selectedTokens,
    approvers,
  };

  setTimeout(() => {
    Storage.set(
      "PAYMENT_FILTERS",
      JSON.stringify(filtersToSave)
      // FIXME:`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FilterDropdown`
    );
  }, 500); // Adding a delay of 500ms before setting Storage
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
  setRecipients([]);
  setSelectedTokens([]);
  setShowKycStatusVerified(true);
  setShowKycStatusNotVerified(true);
  setApprovers([]);
  setApproversSearch("");
  setRecipientSearch("");

  // Clear stored filters
  Storage.set(
    "PAYMENT_FILTERS",
    null
    // FIXME: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.FilterDropdown`
  );
};

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
                      "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownSelectMultiple"
                    }
                    props={{
                      options: [],
                      value: recipients,
                      onChange: (option) =>
                        setRecipients([...recipients, option.value]),
                      placeholder: "Select",
                      selectedValue: recipients,
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
                      isMulti: true,
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
                <div className="text-secondary mb-2">
                  KYC/B Verification Status
                </div>
                <div className="d-flex gap-2">
                  <div
                    onClick={() =>
                      setShowKycStatusVerified(!showKycStatusVerified)
                    }
                    className={`d-flex pointer align-items-center gap-2 px-3 py-1 rounded-pill bg-opacity-10 text-success border border-success border-opacity-25 ${
                      showKycStatusVerified ? "bg-success" : ""
                    }`}
                  >
                    <VerifiedTick width={25} height={25} />
                    <span>Verified</span>
                  </div>
                  <div
                    onClick={() =>
                      setShowKycStatusNotVerified(!showKycStatusNotVerified)
                    }
                    className={`d-flex pointer align-items-center gap-2 px-3 py-1 rounded-pill bg-opacity-10 text-danger border border-danger border-opacity-25 ${
                      showKycStatusNotVerified ? "bg-danger" : ""
                    }`}
                  >
                    <NotVerfiedTick width={25} height={25} />
                    <span>Not Verified</span>
                  </div>
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
                    {selectedTokens.map((token_id) => (
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
                      "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.DropDownSelectMultiple"
                    }
                    props={{
                      value: approvers,
                      onChange: (option) => setApprovers(option.value),
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
                      isMulti: true,
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
