const votes = props.votes ?? {};
const proposalId = props.proposalId;
const treasuryDaoID = "${REPL_TREASURY}";
const accountId = context.accountId;

const alreadyVoted = Object.keys(votes).includes(accountId);
const userVote = votes[accountId];

const [isTxnCreated, setTxnCreated] = useState(false);

function actProposal(action) {
  setTxnCreated(true);
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

function refreshData() {
  Storage.set("REFRESH__VOTE_ACTION_TABLE_DATA", Math.random());
}

function getProposalData() {
  return Near.asyncView(treasuryDaoID, "get_proposal", { id: proposalId }).then(
    (result) => result
  );
}

useEffect(() => {
  if (isTxnCreated) {
    const checkForVoteOnProposal = () => {
      getProposalData().then((proposal) => {
        if (JSON.stringify(proposal.votes) !== JSON.stringify(votes)) {
          refreshData();
          setTxnCreated(false);
        } else {
          setTimeout(() => checkForVoteOnProposal(), 1000);
        }
      });
    };
    checkForVoteOnProposal();
  }
}, [isTxnCreated]);

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
        src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.ProposalStatus`}
        props={{
          isVoteStatus: true,
          status: userVote,
        }}
      />
    ) : (
      <div className="d-flex gap-2 align-items-center">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "approve-btn p-2",
            },
            label: "Approve",
            onClick: () => actProposal("VoteApprove"),
            loading: isTxnCreated,
            disabled: isTxnCreated,
          }}
        />
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "reject-btn p-2",
            },
            label: "Reject",
            onClick: () => actProposal("VoteReject"),
            loading: isTxnCreated,
            disabled: isTxnCreated,
          }}
        />
      </div>
    )}
  </Container>
);
