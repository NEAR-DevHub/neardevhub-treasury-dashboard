const votes = props.votes ?? {};
const proposalId = props.proposalId;
const treasuryDaoID = "${REPL_TREASURY}";
const accountId = context.accountId;
const tokensBalance = props.tokensBalance ?? [];
const currentAmount = props.currentAmount ?? "0";
const currentContract = props.currentContract ?? "";

const alreadyVoted = Object.keys(votes).includes(accountId);
const userVote = votes[accountId];

const actions = {
  APPROVE: "VoteApprove",
  REJECT: "VoteReject",
};

const [isTxnCreated, setTxnCreated] = useState(false);
const [vote, setVote] = useState(null);
const [isInsufficientBalance, setInsufficientBal] = useState(false);
const [showWarning, setShowWarning] = useState(false);

const [showConfirmModal, setConfirmModal] = useState(null);

useEffect(() => {
  setInsufficientBal(
    Big(
      tokensBalance.find((i) => i.contract === currentContract)?.amount ?? "0"
    ).lt(Big(currentAmount))
  );
}, [tokensBalance, currentAmount, currentContract]);

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
    background-color: #2c3e50;
    color: white;

    &:hover {
      background-color: #2c3e50;
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

  .toast {
    background: white !important;
  }

  .toast-header {
    background-color: #2c3e50 !important;
    color: white !important;
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
  </Container>
);
