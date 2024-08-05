const votes = props.votes;
const threshold = props.threshold;
const percentage = { Approve: 0, Reject: 0 };
const total = Object.values(votes).map((i) => percentage[i]++);

const Container = styled.div`
  background-color: #e2e6ec;
  width: 100px;
  height: 15px;
  display: flex;
  overflow: hidden;
`;

const ApproveBar = styled.div`
  background-color: #04a46e;
  height: 100%;
  width: ${(props) => props.width}%;
`;

const RejectBar = styled.div`
  background-color: #dc6666;
  height: 100%;
  width: ${(props) => props.width}%;
`;

function getPercentage(value) {
  return (value / total.length) * 100;
}
return (
  <Container className="rounded-pill">
    <ApproveBar width={getPercentage(percentage.Approve)} />
    <RejectBar width={getPercentage(percentage.Reject)} />
  </Container>
);
