const instance = props.instance;
if (!instance) {
  return <></>;
}

const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const votes = props.votes ?? {};
const proposalId = props.proposalId;
const accountId = context.accountId;
const nearBalance = props.nearBalance ?? "0";
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
const isHumanReadableCurrentAmount = props.isHumanReadableCurrentAmount;
const isProposalDetailsPage = props.isProposalDetailsPage;

const alreadyVoted = Object.keys(votes).includes(accountId);
const userVote = votes[accountId];

const isNEAR =
  currentContract === "" || currentContract.toLowerCase() === "near";

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

const userBalance = isNEAR
  ? nearBalance
  : useCache(
      () =>
        asyncFetch(`${REPL_RPC_URL}`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "dontcare",
            method: "query",
            params: {
              request_type: "call_function",
              account_id: currentContract,
              finality: "final",
              method_name: "ft_balance_of",
              args_base64: btoa(JSON.stringify({ account_id: treasuryDaoID })),
            },
          }),
        }).then((res) => {
          return res?.body?.result?.result
            .map((c) => String.fromCharCode(c))
            .join("")
            .replace(/\"/g, "");
        }),
      currentContract + "-" + treasuryDaoID,
      { subscribe: false }
    );

useEffect(() => {
  if (avoidCheckForBalance || !userBalance) return;

  let amount = Big(currentAmount ?? 0);

  if (isHumanReadableCurrentAmount) {
    if (isNEAR) {
      amount = amount.mul(Big(10).pow(24));
      setInsufficientBal(Big(userBalance ?? "0").lt(amount.toFixed()));
    } else {
      Near.asyncView(currentContract, "ft_metadata", {}).then((ftMetadata) => {
        amount = amount.mul(Big(10).pow(ftMetadata.decimals));
        setInsufficientBal(Big(userBalance ?? "0").lt(amount.toFixed()));
      });
    }
  } else {
    setInsufficientBal(Big(userBalance ?? "0").lt(amount.toFixed()));
  }
}, [
  userBalance,
  currentAmount,
  currentContract,
  avoidCheckForBalance,
  isHumanReadableCurrentAmount,
]);

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

    const checkForVoteOnProposal = () => {
      getProposalData()
        .then((proposal) => {
          const sortedProposalVotes = JSON.stringify(
            Object.keys(proposal?.votes ?? {}).sort()
          );
          const sortedVotes = JSON.stringify(Object.keys(votes ?? {}).sort());
          if (
            JSON.stringify(sortedProposalVotes) !== JSON.stringify(sortedVotes)
          ) {
            checkProposalStatus();
            clearTimeout(checkTxnTimeout);
            setTxnCreated(false);
          } else {
            checkTxnTimeout = setTimeout(checkForVoteOnProposal, 1000);
          }
        })
        .catch(() => {
          // if proposal data doesn't exist, it means the proposal is deleted
          checkProposalStatus();
          clearTimeout(checkTxnTimeout);
          setTxnCreated(false);
        });
    };

    checkForVoteOnProposal();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated]);

const Container = styled.div`
  .remove-btn {
    background: none;
    border: none;
    color: red;
  }

  .btn-approve {
    background-color: var(--other-green) !important;
    color: white;
  }

  .btn-reject {
    background-color: var(--other-red) !important;
    color: white;
  }
`;

const InsufficientBalanceWarning = () => {
  return showWarning ? (
    <Modal>
      <ModalHeader>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex gap-3">
            <i class="bi bi-exclamation-triangle warning-icon h4 mb-0"></i>
            Insufficient Balance
          </div>
          <i
            className="bi bi-x-lg h4 mb-0 cursor-pointer"
            onClick={() => setShowWarning(false)}
          ></i>
        </div>
      </ModalHeader>
      <ModalContent>
        Your current balance is not enough to complete this transaction.
        <div className="d-flex pb-1 mt-2 gap-1 align-items-center">
          • Transaction amount:
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
            props={{
              instance,
              ...(isHumanReadableCurrentAmount
                ? { amountWithDecimals: currentAmount }
                : { amountWithoutDecimals: currentAmount }),
              address: currentContract,
            }}
          />
        </div>
        <div className="d-flex gap-1 align-items-center">
          • Your current balance:
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TokenAmount`}
            props={{
              instance,
              amountWithoutDecimals: userBalance,
              address: currentContract,
            }}
          />
        </div>
      </ModalContent>
      <ModalFooter>
        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
          props={{
            classNames: {
              root: "btn btn-outline-secondary shadow-none no-transparent",
            },
            label: "Cancel",
            onClick: () => setShowWarning(false),
          }}
        />

        <Widget
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
          props={{
            classNames: { root: "theme-btn" },
            label: "Proceed Anyway",
            onClick: () => {
              setShowWarning(false);
              setConfirmModal(true);
            },
          }}
        />
      </ModalFooter>
    </Modal>
  ) : null;
};

const containerClass = isProposalDetailsPage
  ? "d-flex gap-2 align-items-center "
  : "d-flex gap-2 align-items-center justify-content-end";
return (
  <Container>
    <TransactionLoader
      cancelTxn={() => setTxnCreated(false)}
      showInProgress={isTxnCreated}
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
      <div className={containerClass}>
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalStatus`}
          props={{
            isVoteStatus: true,
            status: userVote,
          }}
        />
      </div>
    ) : (
      <div className={containerClass}>
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
            <div className="d-flex gap-2 align-items-center w-100">
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                props={{
                  ActionButton: () => (
                    <Widget
                      src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                      props={{
                        classNames: {
                          root: "btn btn-approve w-100",
                          label: "text-center w-100",
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
                    setVote(actions.APPROVE);
                    if (isInsufficientBalance) {
                      setShowWarning(true);
                    } else {
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
                          root: "btn btn-reject w-100",
                          label: "text-center w-100",
                        },
                        label: "Reject",
                        loading: isTxnCreated && vote === actions.REJECT,
                        disabled: isTxnCreated,
                        texts,
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
          <div style={{ width: "fit-content" }}>
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
              props={{
                ActionButton: () => (
                  <button
                    className="remove-btn w-100"
                    data-testid="delete-btn w-100"
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
          </div>
        )}
      </div>
    )}
  </Container>
);
