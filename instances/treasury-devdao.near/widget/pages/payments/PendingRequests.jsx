const { getTransferApproversGroup, getFilteredProposalsByStatusAndkind } =
  VM.require("${REPL_TREASURY}/widget/lib.common") || {
    getTransferApproversGroup: () => {},
  };
const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const treasuryDaoID = "aurorafinance.sputnik-dao.near";
// "${REPL_TREASURY}";

const [rowsPerPage, setRowsPerPage] = useState(10);
const [currentPage, setPage] = useState(0);

const [proposals, setProposals] = useState(null);
const [totalLength, setTotalLength] = useState(null);
const [loading, setLoading] = useState(false);
useEffect(() => {
  setLoading(true);
  Near.asyncView(treasuryDaoID, "get_last_proposal_id").then((i) => {
    if (typeof getFilteredProposalsByStatusAndkind == "function") {
      getFilteredProposalsByStatusAndkind({
        resPerPage: rowsPerPage,
        reverse: true,
        filterKindArray: ["Transfer"],
        filterStatusArray: ["InProgress"],
        offset: currentPage * rowsPerPage,
        lastProposalId: i,
      }).then((r) => {
        setLoading(false);
        setProposals(r.filteredProposals);
        setTotalLength(r.totalLength);
      });
    }
  });
}, [currentPage, rowsPerPage]);

const policy = Near.view(treasuryDaoID, "get_policy", {});

const transferApproversGroup = getTransferApproversGroup();

if (
  loading ||
  proposals === null ||
  totalLength === null ||
  transferApproversGroup === null ||
  policy === null
) {
  return (
    <div className="d-flex justify-content-center align-items-center w-100 h-100">
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
      />
    </div>
  );
}

const Container = styled.div`
  font-size: 13px;
  .text-grey {
    color: #b9b9b9 !important;
  }
  .text-size-2 {
    font-size: 15px;
  }
  .text-dark-grey {
    color: #687076;
  }
  .text-grey-100 {
    background-color: #f5f5f5;
  }
  td {
    padding: 0.5rem;
    color: inherit;
    vertical-align: middle;
    text-align: center;
  }
 
  .max-w-100 {
    max-width: 100%;
  }

  table {
    overflow-x: auto;
  }

  .bold {
    font-weight: 500;
  }

  .custom-truncate {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
    max-height: 4.5em;
    text-align: left;
  }

  .custom-tooltip {
    position: relative;
    cursor: pointer;
  }

  .custom-tooltip .tooltiptext {
    visibility: hidden;
    width: 300px;
    background-color: white;
    color: black
    text-align: center;
    border-radius: 5px;
    padding: 5px;
    position: absolute;
    right:40%;
    z-index: 10000;
    top:100%;
    opacity: 0;
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s;
  }

  .custom-tooltip:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
  }
`;

const accountId = "aurorafinance2.near";
//  context.accountId;

const hasVotingPermission = (transferApproversGroup ?? []).includes(accountId);

const lreim =
  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";

const ProposalsComponent = () => {
  return (
    <tbody>
      {proposals?.map((item, index) => {
        const description = JSON.parse(item.description);
        const title = lreim;
        // description.title;
        const summary = lreim;
        description.summary;
        const proposalId = description.proposalId;
        const notes = description.notes;
        const args = item.kind.Transfer;

        return (
          <tr>
            <td className="bold">{item.id}</td>
            <td>
              <Widget
                src={`${REPL_TREASURY}/widget/components.Date`}
                props={{
                  timestamp: item.submission_time,
                }}
              />
            </td>
            <td>
              {typeof proposalId === "number" ? (
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  to={href({
                    widgetSrc: `${REPL_DEVHUB}/widget/app`,
                    params: {
                      page: "proposal",
                      id: proposalId,
                    },
                  })}
                >
                  <div className="d-flex gap-1 align-items-center text-underline bolder">
                    #{proposalId} <i class="bi bi-box-arrow-up-right"> </i>
                  </div>
                </Link>
              ) : (
                "-"
              )}
            </td>

            <td className="custom-tooltip">
              <div className="custom-truncate bold" style={{ maxWidth: 180 }}>
                {title}
                <div className="tooltiptext p-3">
                  <h6>{title}</h6>
                  <div>{summary}</div>
                </div>
              </div>
            </td>
            <td className="custom-tooltip">
              <div className="custom-truncate" style={{ maxWidth: 180 }}>
                {summary}
                <div className="tooltiptext p-3">
                  <h6>{title}</h6>
                  <div>{summary}</div>
                </div>
              </div>
            </td>
            <td className="text-truncate bold" style={{ maxWidth: 180 }}>
              <Widget
                src={`${REPL_TREASURY}/widget/components.ReceiverAccount`}
                props={{
                  receiverAccount: args.receiver_id,
                }}
              />
            </td>
            <td>
              <Widget
                src={`${REPL_TREASURY}/widget/components.TokenIcon`}
                props={{
                  address: args.token_id,
                }}
              />
            </td>
            <td>
              <Widget
                src={`${REPL_TREASURY}/widget/components.TokenAmount`}
                props={{
                  amountWithoutDecimals: args.amount,
                  address: args.token_id,
                }}
              />
            </td>
            <td className="bold">{item.proposer}</td>
            <td className="text-sm">{notes ?? "-"}</td>
            <td>show votes</td>
            <td style={{ maxWidth: 180 }}>
              <Widget
                src={`${REPL_TREASURY}/widget/components.Approvers`}
                props={{
                  votes: item.votes,
                  transferApproversGroup: transferApproversGroup,
                }}
              />
            </td>
            {hasVotingPermission && (
              <td>
                <Widget
                  src={`${REPL_TREASURY}/widget/components.VoteActions`}
                  props={{
                    votes: item.votes,
                  }}
                />
              </td>
            )}
          </tr>
        );
      })}
    </tbody>
  );
};

return (
  <Container className="d-flex flex-column gap-4">
    <div>
      <table className="table">
        <thead>
          <tr className="text-grey">
            <td>#</td>
            <td>Created Date</td>
            <td>Reference</td>
            <td>Title</td>
            <td>Summary</td>
            <td>Recipient</td>
            <td>Requested Token</td>
            <td>Funding Ask</td>
            <td>Created by</td>
            <td>Notes</td>
            <td>Votes</td>
            <td>Approvers</td>

            {hasVotingPermission && <td>Actions</td>}
          </tr>
        </thead>
        <ProposalsComponent />
      </table>
    </div>
    <div>
      <Widget
        src={`${REPL_TREASURY}/widget/components.Pagination`}
        props={{
          totalPages: Math.ceil(totalLength / rowsPerPage),
          onNextClick: () => setPage(currentPage + 1),
          onPrevClick: () => setPage(currentPage - 1),
          currentPage: currentPage,
          rowsPerPage: rowsPerPage,
          onRowsChange: (v) => setRowsPerPage(parseInt(v)),
        }}
      />
    </div>
  </Container>
);
