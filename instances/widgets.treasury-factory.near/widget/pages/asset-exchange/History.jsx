const { getApproversAndThreshold, getFilteredProposalsByStatusAndKind } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
    getApproversAndThreshold: () => {},
  };
const instance = props.instance;
if (!instance || typeof getFilteredProposalsByStatusAndKind !== "function") {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);

const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
const [firstRender, setFirstRender] = useState(true);
const [offset, setOffset] = useState(null);
const [isPrevPageCalled, setIsPrevCalled] = useState(false);

const highlightProposalId =
  props.highlightProposalId ||
  props.highlightProposalId === "0" ||
  props.highlightProposalId === 0
    ? parseInt(props.highlightProposalId)
    : null;

useEffect(() => {
  setLoading(true);

  Near.asyncView(treasuryDaoID, "get_policy", {}).then((policy) => {
    console.log(
      "Policy fetched successfully:",
      policy ? "Policy found" : "No policy found"
    );
    getFilteredProposalsFromIndexer(
      {
        treasuryDaoID,
        resPerPage: rowsPerPage,
        isPrevPageCalled: isPrevPageCalled,
        filterKindArray: ["FunctionCall"],
        filterStatusArray: ["Approved", "Rejected", "Expired", "Failed"],
        offset: typeof offset === "number" ? offset : lastProposalId,
        lastProposalId: lastProposalId,
        currentPage,
        isAssetExchange: true,
      },
      policy
    )
      .then((r) => {
        if (r.usedIndexer) {
          console.log("USING INDEXER!!!");
          // TODO: Add logic to handle the case where the indexer is used
          // I think we still need to do This because the fallback function needs to
          // have that state
          thenDoThis(r);
        } else {
          thenDoThis(r);
        }
      })
      .catch((e) => {
        console.log("Error fetching proposal policy:", e);
      });
  });

  // Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
  //   const lastProposalId = i;
  //   getFilteredProposalsByStatusAndKind({
  //     treasuryDaoID,
  //     resPerPage: rowsPerPage,
  //     isPrevPageCalled: isPrevPageCalled,
  //     filterKindArray: ["FunctionCall"],
  //     filterStatusArray: ["Approved", "Rejected", "Expired", "Failed"],
  //     offset: typeof offset === "number" ? offset : lastProposalId,
  //     lastProposalId: lastProposalId,
  //     currentPage,
  //     isAssetExchange: true,
  //   }).then((r) => {
  //    thenDoThis(r);
  //   });
  // });
}, [currentPage, rowsPerPage]);

function thenDoThis(r) {
  if (currentPage === 0 && !totalLength) {
    setTotalLength(r.totalLength);
  }
  setOffset(r.filteredProposals[r.filteredProposals.length - 1].id);
  if (typeof highlightProposalId === "number" && firstRender) {
    const proposalExists = r.filteredProposals.find(
      (i) => i.id === highlightProposalId
    );
    if (!proposalExists) {
      setPage(currentPage + 1);
    } else {
      setFirstRender(false);
      setLoading(false);
      setProposals(r.filteredProposals);
    }
  } else {
    setLoading(false);
    setProposals(r.filteredProposals);
  }
}

const policy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const functionCallApproversGroup = getApproversAndThreshold(
  treasuryDaoID,
  "transfer",
  context.accountId
);

return (
  <div className="d-flex flex-column flex-1 justify-content-between">
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.Table`}
      props={{
        instance,
        proposals: proposals,
        isPendingRequests: false,
        functionCallApproversGroup,
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
              setPage(currentPage + 1);
            },
            onPrevClick: () => {
              setIsPrevCalled(true);
              setOffset(proposals[0].id);
              setPage(currentPage - 1);
            },
            currentPage: currentPage,
            rowsPerPage: rowsPerPage,
            onRowsChange: (v) => {
              setIsPrevCalled(false);
              setOffset(null);
              setPage(0);
              setRowsPerPage(parseInt(v));
            },
          }}
        />
      </div>
    )}
  </div>
);
