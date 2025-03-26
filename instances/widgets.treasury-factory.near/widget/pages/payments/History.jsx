const {
  getApproversAndThreshold,
  getFilteredProposalsByStatusAndKind,
  getFilteredProposalsFromIndexer,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getApproversAndThreshold: () => {},
  getFilteredProposalsFromIndexer: () => {},
};
const instance = props.instance;
if (!instance || typeof getFilteredProposalsByStatusAndKind !== "function") {
  return <></>;
}

const { treasuryDaoID, sputnikIndexerURL } = VM.require(
  `${instance}/widget/config.data`
);

const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);
// const proposals = props.proposals;
const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
const [firstRender, setFirstRender] = useState(true);
const [offset, setOffset] = useState(null);
const [fallBackOffset, setFallBackOffset] = useState(null);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);

const highlightProposalId =
  props.highlightProposalId ||
  props.highlightProposalId === "0" ||
  props.highlightProposalId === 0
    ? parseInt(props.highlightProposalId)
    : null;

useEffect(() => {
  setLoading(true);
  // New way:
  Near.asyncView(treasuryDaoID, "get_policy", {}).then((policy) => {
    console.log(
      "Policy fetched successfully:",
      policy ? "Policy found" : "No policy found"
    );

    // First get the last proposal ID to use for pagination
    Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
      (lastProposalId) => {
        getFilteredProposalsFromIndexer(
          {
            treasuryDaoID,
            resPerPage: rowsPerPage,
            isPrevPageCalled: isPrevPageCalled,
            filterKindArray: ["Transfer", "FunctionCall"],
            filterStatusArray: [
              "InProgress",
              "Approved",
              "Rejected",
              "Expired",
              "Failed",
            ],
            offset: 0, // TODO pagination
            lastProposalId: lastProposalId,
            currentPage,
            fallBackOffset:
              typeof fallBackOffset === "number"
                ? fallBackOffset
                : lastProposalId,
          },
          policy
        )
          .then((r) => {
            console.log("Filtered proposals result:", r);
            if (r.filteredProposals && r.filteredProposals.length > 0) {
              thenDoThis(r);
            } else {
              console.log(
                "No proposals found or filtering returned empty array"
              );
              setLoading(false);
              setProposals([]);
            }
          })
          .catch((e) => {
            console.log("Error fetching or filtering proposals:", e);
            setLoading(false);
          });
      }
    );
  });

  // Old way:
  // Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
  //   const lastProposalId = i;
  //   getFilteredProposalsByStatusAndKind({
  //     treasuryDaoID,
  //     resPerPage: rowsPerPage,
  //     isPrevPageCalled: isPrevPageCalled,
  //     filterKindArray: ["Transfer", "FunctionCall"],
  //     filterStatusArray: ["Approved", "Rejected", "Expired", "Failed"],
  //     offset: typeof offset === "number" ? offset : lastProposalId,
  //     lastProposalId: lastProposalId,
  //     currentPage,
  //   }).then((r) => {
  //     thenDoThis(r);
  //   });
  // });
}, [currentPage, rowsPerPage]);

function thenDoThis(r) {
  // If we're on the first page (currentPage === 0) and don't have a total count yet,
  // set the total length of all available proposals from the API response
  if (currentPage === 0 && !totalLength) {
    setTotalLength(r.totalLength);
  }
  // Store the ID of the last proposal in this batch for pagination purposes
  // This will be used as the offset for the next API call if we go forward
  setOffset(r.filteredProposals[r.filteredProposals.length - 1].id);
  // Also store this ID as a fallback offset in case the indexer API fails
  // and we need to use the traditional RPC method instead
  setFallBackOffset(r.filteredProposals[r.filteredProposals.length - 1].id);

  // Special handling for when we're trying to highlight a specific proposal
  if (typeof highlightProposalId === "number" && firstRender) {
    // Check if the proposal we want to highlight exists in the current results
    const proposalExists = r.filteredProposals.find(
      (i) => i.id === highlightProposalId
    );
    // If the highlighted proposal is not in the current page results
    if (!proposalExists) {
      // Move to the next page to look for it there
      setPage(currentPage + 1);
      // Note: We don't update 'loading' or 'proposals' here because
      // changing the page will trigger a new data fetch
    } else {
      // We found the proposal to highlight, so we can stop searching
      setFirstRender(false);
      // Turn off loading state
      setLoading(false);
      // Update the proposals state with the fetched data
      setProposals(r.filteredProposals);
    }
  } else {
    // Standard case: not looking for a specific proposal to highlight
    // or not the first render anymore
    setLoading(false);
    console.log("r.filteredProposals", r.filteredProposals);
    setProposals(r.filteredProposals);
  }
}

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const transferApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  context?.accountId
);

return (
  <div className="d-flex flex-column flex-1 justify-content-between">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.payments.Table`}
      props={{
        instance,
        proposals: proposals,
        isPendingRequests: false,
        transferApproversGroup,
        highlightProposalId,
        loading: loading,
        policy,
      }}
    />
    {(proposals ?? [])?.length > 0 && (
      <div>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Pagination`}
          props={{
            totalLength: totalLength,
            totalPages: Math.ceil(totalLength / rowsPerPage),
            onNextClick: () => {
              setIsPrevCalled(false);
              setOffset(proposals[proposals.length - 1].id);
              setFallBackOffset(proposals[proposals.length - 1].id);
              setPage(currentPage + 1);
            },
            onPrevClick: () => {
              setIsPrevCalled(true);
              setOffset(proposals[0].id);
              setFallBackOffset(proposals[0].id);
              setPage(currentPage - 1);
            },
            currentPage: currentPage,
            rowsPerPage: rowsPerPage,
            onRowsChange: (v) => {
              setIsPrevCalled(false);
              setOffset(null);
              setFallBackOffset(null);
              setPage(0);
              setRowsPerPage(parseInt(v));
            },
          }}
        />
      </div>
    )}
  </div>
);
