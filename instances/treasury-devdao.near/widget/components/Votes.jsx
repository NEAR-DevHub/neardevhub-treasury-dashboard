const votes = props.votes;
const requiredVotes = props.requiredVotes;
const voteDistribution = { Approve: 0, Reject: 0 };

const total = Object.values(votes).map((i) => voteDistribution[i]++);
const getPercentage = (value) =>
  value === 0 ? 0 : (value / requiredVotes) * 100;

const Container = styled.div`
  .bar {
    background-color: #e2e6ec;
    width: 100px;
    height: 20px;
    overflow: hidden;
  }
  .flex-item {
    flex: 1;
  }

  .label {
    font-weight: 500;
  }

  .green {
    color: #04a46e;
    text-align: left;
  }

  .red {
    color: #dc6666;
    text-align: right;
  }
`;

const approvePercentage = getPercentage(voteDistribution.Approve);
const rejectPercentage = getPercentage(voteDistribution.Reject);

return (
  <Container className="d-flex flex-column gap-1" style={{ width: "100px" }}>
    <div className="d-flex align-items-center px-2">
      <div className="w-100 h-100 flex-item label green">
        {voteDistribution.Approve}
      </div>
      <div className="w-100 h-100 flex-item label red">
        {voteDistribution.Reject}
      </div>
    </div>
    <div className="bar d-flex align-items-center rounded-pill">
      <div className="w-100 h-100 flex-item">
        <div
          className="h-100"
          style={{ width: `${approvePercentage}%`, backgroundColor: "#04a46e" }}
        ></div>
      </div>

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
  </Container>
);
