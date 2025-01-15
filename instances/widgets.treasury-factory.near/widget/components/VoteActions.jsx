const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

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
const proposalCreator = props.proposalCreator;
const isWithdrawRequest = props.isWithdrawRequest;
const validatorAccount = props.validatorAccount;
const treasuryWallet = props.treasuryWallet;

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
const [isReadyToBeWithdrawn, setIsReadyToBeWithdrawn] = useState(true);
const [showConfirmModal, setConfirmModal] = useState(null);
const [showErrorToast, setShowErrorToast] = useState(false);

useEffect(() => {
  if (!avoidCheckForBalance) {
    setInsufficientBal(
      Big(
        tokensBalance.find((i) => i.contract === currentContract)?.amount ?? "0"
      ).lt(Big(currentAmount ?? "0"))
    );
  }
}, [tokensBalance, currentAmount, currentContract, avoidCheckForBalance]);

// if it's a withdraw request, check if amount is ready to be withdrawn
useEffect(() => {
  if (isWithdrawRequest && validatorAccount)
    Near.asyncView(validatorAccount, "is_account_unstaked_balance_available", {
      account_id: treasuryWallet,
    }).then((res) => setIsReadyToBeWithdrawn(res));
}, [isWithdrawRequest, validatorAccount]);

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
useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;
    let errorTimeout = null;

    const checkForVoteOnProposal = () => {
      getProposalData().then((proposal) => {
        if (JSON.stringify(proposal.votes) !== JSON.stringify(votes)) {
          checkProposalStatus();
          clearTimeout(errorTimeout);
          setTxnCreated(false);
        } else {
          checkTxnTimeout = setTimeout(checkForVoteOnProposal, 1000);
        }
      });
    };

    checkForVoteOnProposal();

    // if in 20 seconds there is no change, show error condition
    errorTimeout = setTimeout(() => {
      setShowErrorToast(true);
      setTxnCreated(false);
      clearTimeout(checkTxnTimeout);
    }, 20000);

    return () => {
      clearTimeout(checkTxnTimeout);
      clearTimeout(errorTimeout);
    };
  }
}, [isTxnCreated]);

const Container = styled.div`
  .remove-btn {
    background: none;
    border: none;
    color: red;
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
          <i
            class="bi bi-x-lg h6 mb-0 cursor-pointer"
            onClick={() => setShowWarning(false)}
          ></i>
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
    <TransactionLoader
      showInProgress={isTxnCreated}
      showError={showErrorToast}
      toggleToast={() => setShowErrorToast(false)}
    />

    <InsufficientBalanceWarning />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: "Confirm your vote",
        content:
          vote === actions.REMOVE
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
        {!isReadyToBeWithdrawn ? (
          <div className="text-center fw-semi-bold">
            Voting is not available before unstaking release{" "}
            <Widget
              src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
              props={{
                popup: (
                  <div>
                    These tokens were unstaked, but are not yet ready for
                    withdrawal. Tokens are ready for withdrawal 52-65 hours
                    after unstaking.
                  </div>
                ),
                children: <i className="bi bi-info-circle text-secondary"></i>,
                instance,
              }}
            />
          </div>
        ) : (
          hasVotingPermission && (
            <div className="d-flex gap-2 align-items-center">
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                props={{
                  ActionButton: () => (
                    <Widget
                      src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                      props={{
                        classNames: {
                          root: "btn btn-success",
                        },
                        label: "Approve",
                        loading: isTxnCreated && vote === actions.APPROVE,
                        disabled: isTxnCreated,
                      }}
                    />
                  ),
                  checkForDeposit: false,
                  treasuryDaoID,
                  disabled: isTxnCreated,
                  callbackAction: () => {
                    if (isInsufficientBalance) {
                      setShowWarning(true);
                    } else {
                      setVote(actions.APPROVE);
                      setConfirmModal(true);
                    }
                  },
                }}
              />
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                props={{
                  ActionButton: () => (
                    <Widget
                      src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                      props={{
                        classNames: {
                          root: "btn btn-secondary",
                        },
                        label: "Reject",
                        loading: isTxnCreated && vote === actions.REJECT,
                        disabled: isTxnCreated,
                      }}
                    />
                  ),
                  disabled: isTxnCreated,
                  checkForDeposit: false,
                  treasuryDaoID,
                  callbackAction: () => {
                    setVote(actions.REJECT);
                    setConfirmModal(true);
                  },
                }}
              />
            </div>
          )
        )}
        {/* currently showing delete btn only for proposal creator */}
        {hasDeletePermission && proposalCreator === accountId && (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
            props={{
              ActionButton: () => (
                <button
                  className="remove-btn"
                  data-testid="delete-btn"
                  disabled={isTxnCreated}
                >
                  <img
                    style={{ height: 24 }}
                    src="https://ipfs.near.social/ipfs/bafkreieobqzwouuadj7eneei7aadwfel6ubhj7qishnqwrlv5ldgcwuyt4"
                  />
                </button>
              ),
              checkForDeposit: false,
              treasuryDaoID,
              disabled: isTxnCreated,
              callbackAction: () => {
                setVote(actions.REMOVE);
                setConfirmModal(true);
              },
            }}
          />
        )}
      </div>
    )}
  </Container>
);
