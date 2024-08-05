const votes = props.votes ?? {};
const accountId = "aurorafinance2.near";
context.accountId;

const alreadyVoted = Object.keys(votes).includes(accountId);
const userVote = votes[accountId];

const Container = styled.div`
  .reject-btn {
    background-color: #dc6666;
    color: white;

    &:hover {
      background-color: #dc6666;
      color: white;
    }
  }

  .approve-btn {
    background-color: #04a46e;
    color: white;

    &:hover {
      background-color: #04a46e;
      color: white;
    }
  }
`;
return (
  <Container>
    {alreadyVoted ? (
      <Widget
        src={`${REPL_TREASURY}/widget/components.ProposalStatus`}
        props={{
          isVoteStatus: true,
          status: userVote,
        }}
      />
    ) : (
      <div className="d-flex gap-2 align-items-center">
        <button className="approve-btn btn">Approve</button>
        <button className="reject-btn btn">Reject</button>
      </div>
    )}
  </Container>
);
