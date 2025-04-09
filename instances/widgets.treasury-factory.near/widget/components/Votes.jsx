const isInProgress = props.isInProgress;
const votes = props.votes;
const requiredVotes = props.requiredVotes;
const voteDistribution = { Approve: 0, Reject: 0 };
const isProposalDetailsPage = props.isProposalDetailsPage;

const total = Object.values(votes).map((i) => voteDistribution[i]++);
const getPercentage = (value) =>
  value === 0 ? 0 : (value / requiredVotes) * 100;

const Container = styled.div`
  .bar {
    background-color: var(--grey-04);
    width: ${isProposalDetailsPage ? "100%" : "100px"};
    height: 10px;
    overflow: hidden;
  }
  .flex-item {
    flex: 1;
  }

  .label {
    font-weight: 500;
    font-size: 14px;
  }

  .green {
    color: var(--other-green);
    text-align: left;
  }

  .red {
    color: #dc6666;
    text-align: right;
  }

  .text-xs {
    font-size: 12px;
  }

  .vote-separator {
    left: 50%;
    width: 1px;
    height: 19px;
    background-color: var(--text-secondary-color);
    position: absolute;
  }
`;

const approvePercentage = getPercentage(voteDistribution.Approve);
const rejectPercentage = getPercentage(voteDistribution.Reject);

return (
  <Container
    className={
      "d-flex flex-column gap-1 " +
      (!isInProgress && " p-3 border border-1 rounded-4")
    }
    style={{ width: isProposalDetailsPage ? "auto" : "100px" }}
  >
    <div className="d-flex align-items-center px-2 gap-2">
      <div className="w-100 h-100 flex-item label green">
        {voteDistribution.Approve} {isProposalDetailsPage && "Approved"}
      </div>
      {isProposalDetailsPage && (
        <div className="text-secondary text-xs">
          Required Votes: {requiredVotes}
        </div>
      )}
      <div className="w-100 h-100 flex-item label red">
        {isProposalDetailsPage && "Rejected"} {voteDistribution.Reject}
      </div>
    </div>
    {isInProgress && (
      <div className="bar d-flex align-items-center rounded-pill">
        <div className="w-100 h-100 flex-item">
          <div
            className="h-100"
            style={{
              width: `${approvePercentage}%`,
              backgroundColor: "var(--other-green)",
            }}
          ></div>
        </div>
        {isProposalDetailsPage && <div className="vote-separator"></div>}
        <div className="w-100 h-100 flex-item">
          <div
            className="h-100"
            style={{
              width: `${rejectPercentage}%`,
              backgroundColor: "#dc6666",
              float: "inline-end",
            }}
          ></div>
        </div>
      </div>
    )}
  </Container>
);
