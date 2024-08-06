const votes = props.votes ?? {};
const proposalId = props.proposalId;
const treasuryDaoID = "";
const accountId = context.accountId;

const alreadyVoted = Object.keys(votes).includes(accountId);
const userVote = votes[accountId];

function actProposal(action) {
  Near.call({
    contractName: treasuryDaoID,
    methodName: "act_proposal",
    args: {
      id: proposalId,
      action: action,
    },
    gas: 200000000000000,
  });
}

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
        <button
          className="approve-btn btn"
          onClick={() => actProposal("VoteApprove")}
        >
          Approve
        </button>
        <button
          className="reject-btn btn"
          onClick={() => actProposal("VoteReject")}
        >
          Reject
        </button>
      </div>
    )}
  </Container>
);
