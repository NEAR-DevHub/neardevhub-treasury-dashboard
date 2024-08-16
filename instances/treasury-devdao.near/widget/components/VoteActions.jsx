const votes = props.votes ?? {};
const proposalId = props.proposalId;
const treasuryDaoID = "${REPL_TREASURY}";
const accountId = context.accountId;

const alreadyVoted = Object.keys(votes).includes(accountId);
const userVote = votes[accountId];

const actions = {
  APPROVE: "VoteApprove",
  REJECT: "VoteReject",
};

const [isTxnCreated, setTxnCreated] = useState(false);
const [vote, setVote] = useState(null);

const [showConfirmModal, setConfirmModal] = useState(null);

function actProposal() {
  setTxnCreated(true);
  Near.call({
    contractName: treasuryDaoID,
    methodName: "act_proposal",
    args: {
      id: proposalId,
      action: vote,
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
    <Widget
      src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        heading: "Confirm your vote",
        content: `Are you sure you want to vote to ${
          vote === actions.APPROVE ? "approve" : "reject"
        } this request? You cannot change this vote later.`,
        confirmLabel: "Confirm",
        isOpen: showConfirmModal,
        onCancelClick: () => setConfirmModal(false),
        onConfirmClick: () => {
          actProposal(vote);
          setConfirmModal(false);
        },
      }}
    />
    {alreadyVoted ? (
      <div className="d-flex gap-2 align-items-center justify-content-end">
        <Widget
          src={`${REPL_DEPLOYMENT_ACCOUNT}/widget/components.ProposalStatus`}
          props={{
            isVoteStatus: true,
            status: userVote,
          }}
        />
      </div>
    ) : (
      <div className="d-flex gap-2 align-items-center justify-content-end">
        <Widget
          src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
          props={{
            classNames: {
              root: "approve-btn p-2",
            },
            label: "Approve",
            onClick: () => {
              setVote(actions.APPROVE);
              setConfirmModal(true);
            },
            loading: isTxnCreated && vote === actions.APPROVE,
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
            onClick: () => {
              setVote(actions.REJECT);
              setConfirmModal(true);
            },
            loading: isTxnCreated && vote === actions.REJECT,
            disabled: isTxnCreated,
          }}
        />
      </div>
    )}
  </Container>
);
