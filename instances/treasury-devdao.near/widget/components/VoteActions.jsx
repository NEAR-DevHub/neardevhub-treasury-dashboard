const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const votes = props.votes ?? {};
const proposalId = props.proposalId;
const accountId = context.accountId;
const tokensBalance = props.tokensBalance ?? [];
const requiredVotes = props.requiredVotes;
const checkProposalStatus = props.checkProposalStatus;
const currentAmount = props.currentAmount ?? "0";
const currentContract = props.currentContract ?? "";
const setVoteProposalId = props.setVoteProposalId ?? (() => {});
const avoidCheckForBalance = props.avoidCheckForBalance;
const hasDeletePermission = props.hasDeletePermission;
const hasVotingPermission = props.hasVotingPermission;

const alreadyVoted = Object.keys(votes).includes(accountId);
const userVote = votes[accountId];

const actions = {
  APPROVE: "VoteApprove",
  REJECT: "VoteReject",
  REMOVE: "VoteRemove",
};

const [isTxnCreated, setTxnCreated] = useState(false);
const [vote, setVote] = useState(null);
const [isInsufficientBalance, setInsufficientBal] = useState(false);
const [showWarning, setShowWarning] = useState(false);

const [showConfirmModal, setConfirmModal] = useState(null);

useEffect(() => {
  if (!avoidCheckForBalance) {
    setInsufficientBal(
      Big(
        tokensBalance.find((i) => i.contract === currentContract)?.amount ?? "0"
      ).lt(Big(currentAmount ?? "0"))
    );
  }
}, [tokensBalance, currentAmount, currentContract, avoidCheckForBalance]);

function actProposal() {
  setTxnCreated(true);
  Near.call({
    contractName: treasuryDaoID,
    methodName: "act_proposal",
    args: {
      id: proposalId,
      action: vote,
    },
    gas: 300000000000000,
  });
}

function getProposalData() {
  return Near.asyncView(treasuryDaoID, "get_proposal", { id: proposalId }).then(
    (result) => result
  );
}

function getProposalStatus(votes) {
  const votesArray = Object.values(votes);
  return {
    isApproved:
      votesArray.filter((i) => i === "Approve").length >= requiredVotes,
    isRejected:
      votesArray.filter((i) => i === "Reject").length >= requiredVotes,
  };
}

useEffect(() => {
  if (isTxnCreated) {
    const checkForVoteOnProposal = () => {
      getProposalData().then((proposal) => {
        if (JSON.stringify(proposal.votes) !== JSON.stringify(votes)) {
          checkProposalStatus();
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
    background-color: #2c3e50;
    border-radius: 5px;
    color: white;

    &:hover {
      background-color: #2c3e50;
      color: white;
    }
  }

  .remove-btn {
    background: none;
    border: none;
    color: red;
  }

  .approve-btn {
    background-color: #04a46e;
    border-radius: 5px;
    color: white;

    &:hover {
      background-color: #04a46e;
      color: white;
    }
  }
`;

useEffect(() => {
  if (showWarning) {
    const timer = setTimeout(() => setShowWarning(false), 5000);
    return () => clearTimeout(timer);
  }
}, [showWarning]);

const InsufficientBalanceWarning = () => {
  return showWarning ? (
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showWarning ? "show" : ""}`}>
        <div class="toast-header px-2">
          <strong class="me-auto">Just Now</strong>
          <i class="bi bi-x-lg h6" onClick={() => setShowWarning(false)}></i>
        </div>
        <div class="toast-body">
          The request cannot be approved because the treasury balance is
          insufficient to cover the payment.
        </div>
      </div>
    </div>
  ) : null;
};
return (
  <Container>
    <InsufficientBalanceWarning />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: "Confirm your vote",
        content: actions.REMOVE
          ? "Do you really want to delete this request? This process cannot be undone."
          : `Are you sure you want to vote to ${
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
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalStatus`}
          props={{
            isVoteStatus: true,
            status: userVote,
          }}
        />
      </div>
    ) : (
      <div className="d-flex gap-2 align-items-center justify-content-end">
        {hasVotingPermission && (
          <div className="d-flex gap-2 align-items-center">
            <Widget
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
              props={{
                classNames: {
                  root: "approve-btn p-2",
                },
                label: "Approve",
                onClick: () => {
                  if (isInsufficientBalance) {
                    setShowWarning(true);
                  } else {
                    setVote(actions.APPROVE);
                    setConfirmModal(true);
                  }
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
        {hasDeletePermission && (
          <button
            className="remove-btn p-2"
            onClick={() => {
              setVote(actions.REMOVE);
              setConfirmModal(true);
            }}
            data-testid="delete-btn"
            disabled={isTxnCreated}
          >
            <img
              style={{ height: 30 }}
              src="https://ipfs.near.social/ipfs/bafkreieobqzwouuadj7eneei7aadwfel6ubhj7qishnqwrlv5ldgcwuyt4"
            />
          </button>
        )}
      </div>
    )}
  </Container>
);
