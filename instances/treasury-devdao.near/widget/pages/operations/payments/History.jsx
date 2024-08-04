const { getApproversGroup } = VM.require("${REPL_TREASURY}/widget/lib.common") || {
  getApproversGroup: () => {},
};
const treasuryDaoID = "ndctrust.sputnik-dao.near";
// "${REPL_TREASURY}";
const resPerPage = 10;
const [currentPage, setPage] = useState(0);

const [expandSummaryIndex, setExpandSummary] = useState({});
const proposals = Near.view(treasuryDaoID, "get_proposals", {
  from_index: currentPage === 0 ? currentPage : (currentPage - 1) * resPerPage,
  limit: resPerPage,
});

const lastProposalID = Near.view(treasuryDaoID, "get_last_proposal_id", {});
const approversGroup = getApproversGroup()
if (proposals === null || lastProposalID === null || approversGroup === null) {
  return <></>;
}

const Container = styled.div`
  font-size: 13px;
  .text-grey {
    color: #b9b9b9 !important;
  }
  .card-custom {
    border-radius: 5px;
    background-color: white;
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
  }
  .overflow {
    overflow: auto;
  }
  .max-w-100 {
    max-width: 100%;
  }

  .bi-check {
    color: rgba(4, 164, 110, 1) !important;
  }

  .bi-x {
    color: red !important;
  }

  .table>:not(caption)>*>*{
    background-color:inherit !important;
  }

  .bg-even{
    background-color:rgba(250, 251, 253, 1) !important;
  }

  .bg-odd{
    background-color:rgba(249, 248, 248, 1) !important;
  }
`;

// filter approved proposals
const historyProposals = proposals.filter((item) => {
  if (item.kind) {
    return (
      typeof item.kind === "object" &&
      Object.keys(item.kind)?.[0] === "Transfer" &&
      item.status === "Approved"
    );
  }
  return false;
});

const Approvals = ({ votes }) => {
  return (
    <div className="d-flex flex-column">
      {approversGroup.map((member) => (
        <div key={member} className="d-flex align-items-center">
          <Widget
            src="${REPL_MOB}/widget/ProfileImage"
            props={{
              accountId: member,
              style: {
                width: "1.25em",
                height: "1.25em",
              },
              imageStyle: {
                transform: "translateY(-12.5%)",
              },
            }}
          />
          {member}
          {votes[member] === "Approve" ? (
            <i class="bi bi-check h4 mb-0"></i>
          ) : votes[member] === "Reject" ? (
            <i class="bi bi-x h4 mb-0"></i>
          ) : (
            "-"
          )}
        </div>
      ))}
    </div>
  );
};

const ProposalsComponent = () => {
  return (
    <tbody>
      {historyProposals?.map((item, index) => {
        const description = JSON.parse(item.description);
        const proposal = Near.view(
          "${REPL_PROPOSAL_CONTRACT}",
          "get_proposal",
          {
            proposal_id: description.proposal_id,
          }
        );
        const args = item.kind.Transfer;
        const isReceiverkycbVerified = true;
        return (
          <tr className={(expandSummaryIndex[index] ? "text-grey-100" : "") + (index % 2 === 0 ? ' bg-even' : ' bg-odd')}>
            <td>{item.id}</td>
            <td>
              <div className="d-flex flex-row gap-2">
                <div
                  className="d-flex flex-column gap-2 flex-wrap"
                  style={{ maxWidth: 320 }}
                >
                  <div
                    className={
                      "h6 bold max-w-100" +
                      (!expandSummaryIndex[index] && " text-truncate")
                    }
                  >
                    {proposal?.snapshot?.name}
                  </div>
                  {expandSummaryIndex[index] && (
                    <div className={"text-dark-grey max-w-100"}>
                      {proposal?.snapshot?.summary}
                    </div>
                  )}
                </div>
                <div className="cursor">
                  <img
                    src={
                      expandSummaryIndex[index]
                        ? "https://ipfs.near.social/ipfs/bafkreic35n4yddasdpl532oqcxjwore66jrjx2qc433hqdh5wi2ijy4ida"
                        : "https://ipfs.near.social/ipfs/bafkreiaujwid7iigy6sbkrt6zkwmafz5umocvzglndugvofcz2fpw5ur3y"
                    }
                    onClick={() =>
                      setExpandSummary((prevState) => ({
                        ...prevState,
                        [index]: !prevState[index],
                      }))
                    }
                    height={20}
                  />
                </div>
              </div>
            </td>
            <td className="text-truncate bold" style={{ maxWidth: 150 }}>
              {treasuryDaoID}
            </td>
            <td className="text-truncate bold" style={{ maxWidth: 150 }}>
              {args.receiver_id}
            </td>
            <td>
              {isReceiverkycbVerified ? (
                <img
                  src="https://ipfs.near.social/ipfs/bafkreidqveupkcc7e3rko2e67lztsqrfnjzw3ceoajyglqeomvv7xznusm"
                  height={30}
                />
              ) : (
                "https://ipfs.near.social/ipfs/bafkreidqveupkcc7e3rko2e67lztsqrfnjzw3ceoajyglqeomvv7xznusm"
              )}
            </td>
            <td className="bold">
              <Widget
                src={`${REPL_TREASURY}/widget/components.TokenAmount`}
                props={{
                  amountWithoutDecimals: args.amount,
                  address: args.token_id,
                }}
              />
            </td>
            <td className="text-truncate" style={{ maxWidth: 150 }}>
              {item.proposer}
            </td>
            <td style={{ minWidth: "140px" }}>
              <Approvals votes={item.votes} />
            </td>
            <td className="text-truncate" style={{ maxWidth: 150 }}>
              {item.txnHash}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
};
return (
  <Container className="d-flex flex-column gap-4">
    <div className="d-flex flex-row gap-2 align-items-center justify-content-between">
      <div className="h5 bold mb-0">{props.title ?? "Payment History"}</div>
    </div>
    <div className="card-custom overflow p-3">
      <table className="table">
        <thead>
          <tr className="text-grey">
            <td>ID</td>
            <td>PROPOSAL</td>
            <td>FROM</td>
            <td>TO</td>
            <td>KYC/B</td>
            <td>AMOUNT</td>
            <td>CREATOR</td>
            <td>APPROVERS</td>
            <td>TRANSACTION</td>
            <td>PAID</td>
          </tr>
        </thead>
        <ProposalsComponent />
      </table>
    </div>
    <div className="d-flex align-items-center justify-content-center">
      <Widget
        src={`${REPL_TREASURY}/widget/components.Pagination`}
        props={{
          totalPages: Math.round(lastProposalID / resPerPage),
          onPageClick: (v) => setPage(v),
        }}
      />
    </div>
  </Container>
);
