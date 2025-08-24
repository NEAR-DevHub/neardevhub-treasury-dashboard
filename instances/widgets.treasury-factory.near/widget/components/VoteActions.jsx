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
const hasOneDeleteIcon = props.hasOneDeleteIcon;
const isIntentsRequest = props.isIntentsRequest;
const proposal = props.proposal;
const isQuoteExpired = props.isQuoteExpired;
const quoteDeadline = props.quoteDeadline;

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
  : isIntentsRequest
  ? useCache(
      () =>
        Near.asyncView("intents.near", "mt_balance_of", {
          account_id: treasuryDaoID,
          token_id: `nep141:${currentContract}`,
        }).then((balance) => {
          return balance?.toString() || "0";
        }),
      "intents-" + currentContract + "-" + treasuryDaoID,
      { subscribe: false }
    )
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
      proposal: proposal?.kind,
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

    function updateProposalData() {
      checkProposalStatus();
      clearTimeout(checkTxnTimeout);
      setTxnCreated(false);
    }

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
            if (isProposalDetailsPage) {
              updateProposalData();
            } else {
              setTimeout(() => {
                updateProposalData();
              }, 1000);
            }
          } else {
            checkTxnTimeout = setTimeout(checkForVoteOnProposal, 1000);
          }
        })
        .catch(() => {
          // if proposal data doesn't exist, it means the proposal is deleted
          setTimeout(() => {
            updateProposalData();
          }, 1000);
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
            onClick={(e) => {
              e.stopPropagation();
              setShowWarning(false);
            }}
          ></i>
        </div>
      </ModalHeader>
      <ModalContent>
        Your current balance is not enough to complete this transaction.
        <div className="d-flex pb-1 mt-2 gap-1 align-items-center">
          • Transaction amount:
          <Widget
            loading=""
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
            loading=""
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
          loading=""
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
          props={{
            classNames: {
              root: "btn btn-outline-secondary shadow-none no-transparent",
            },
            label: "Cancel",
            onClick: (e) => {
              e.stopPropagation();
              setShowWarning(false);
            },
          }}
        />

        <Widget
          loading=""
          src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
          props={{
            classNames: { root: "theme-btn" },
            label: "Proceed Anyway",
            onClick: (e) => {
              e.stopPropagation();
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
      loading=""
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
        onCancelClick: (e) => {
          e.stopPropagation();
          setConfirmModal(false);
        },
        onConfirmClick: (e) => {
          e.stopPropagation();
          actProposal(vote);
          setConfirmModal(false);
        },
      }}
    />
    {alreadyVoted ? (
      <div className={containerClass}>
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProposalStatus`}
          props={{
            isVoteStatus: true,
            status: userVote,
            hasOneDeleteIcon,
            hasFullWidth: isProposalDetailsPage,
          }}
        />
      </div>
    ) : (
      <div className={containerClass}>
        {isQuoteExpired ? (
          // Check if we're in table view (hasOneDeleteIcon is only passed from table)
          props.hasOneDeleteIcon !== undefined ? (
            // Compact version for table view
            <div className="d-flex align-items-center gap-2">
              <Widget
                loading=""
                src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                props={{
                  popup: (
                    <div>
                      The 1Click API quote for this request expired on{" "}
                      {`${quoteDeadline.toLocaleString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: "UTC",
                      })} UTC`}
                      . Voting is disabled to prevent potential loss of funds
                      from executing the swap at an outdated rate.
                    </div>
                  ),
                  children: (
                    <i
                      className="bi bi-info-circle text-muted"
                      style={{ cursor: "pointer" }}
                    ></i>
                  ),
                  instance,
                }}
              />
              <button
                className="btn btn-sm btn-success"
                disabled
                style={{ opacity: 0.5 }}
              >
                Approve
              </button>
              <button
                className="btn btn-sm btn-danger"
                disabled
                style={{ opacity: 0.5 }}
              >
                Reject
              </button>
            </div>
          ) : (
            // Full version for details page
            <div className="d-flex align-items-center gap-2 w-100">
              <div className="d-flex align-items-center gap-2 text-muted flex-grow-1">
                <i className="bi bi-info-circle"></i>
                <span>
                  Voting is no longer available. The 1Click API quote for this
                  request expired on{" "}
                  {`${quoteDeadline.toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "UTC",
                  })} UTC`}
                  .
                  <Widget
                    loading=""
                    src="${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OverlayTrigger"
                    props={{
                      popup: (
                        <div>
                          The exchange rate quoted by 1Click API has expired.
                          Voting is disabled to prevent potential loss of funds
                          from executing the swap at an outdated rate.
                        </div>
                      ),
                      children: (
                        <span
                          className="text-decoration-underline ms-1"
                          style={{ cursor: "pointer" }}
                        >
                          Learn more
                        </span>
                      ),
                      instance,
                    }}
                  />
                </span>
              </div>
              <button
                className="btn btn-success"
                disabled
                style={{ opacity: 0.5 }}
              >
                Approve
              </button>
              <button
                className="btn btn-danger"
                disabled
                style={{ opacity: 0.5 }}
              >
                Reject
              </button>
            </div>
          )
        ) : !isReadyToBeWithdrawn ? (
          <div className="text-center fw-semi-bold">
            Voting is not available before unstaking release{" "}
            <Widget
              loading=""
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
            <div className="d-flex gap-2 align-items-center w-100 justify-content-end">
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                props={{
                  ActionButton: () => (
                    <Widget
                      loading=""
                      src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                      props={{
                        classNames: {
                          root: "btn btn-success w-100",
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
                  callbackAction: (e) => {
                    e.stopPropagation();
                    setVote(actions.APPROVE);
                    if (isInsufficientBalance) {
                      setShowWarning(true);
                    } else {
                      setConfirmModal(true);
                    }
                  },
                  className: isProposalDetailsPage ? "w-100" : "",
                }}
              />
              <Widget
                loading=""
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
                props={{
                  ActionButton: () => (
                    <Widget
                      loading=""
                      src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
                      props={{
                        classNames: {
                          root: "btn btn-danger w-100",
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
                  callbackAction: (e) => {
                    e.stopPropagation();
                    setVote(actions.REJECT);
                    setConfirmModal(true);
                  },
                  className: isProposalDetailsPage ? "w-100" : "",
                }}
              />
            </div>
          )
        )}
        {/* currently showing delete btn only for proposal creator */}
        {hasDeletePermission && proposalCreator === accountId ? (
          <div style={{ width: "fit-content" }}>
            <Widget
              loading=""
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
              props={{
                ActionButton: () => (
                  <button
                    className="remove-btn w-100"
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
                callbackAction: (e) => {
                  e.stopPropagation();
                  setVote(actions.REMOVE);
                  setConfirmModal(true);
                },
                className: isProposalDetailsPage ? "w-100" : "",
              }}
            />
          </div>
        ) : hasOneDeleteIcon ? (
          <div style={{ minWidth: 36 }}> </div>
        ) : (
          <></>
        )}
      </div>
    )}
  </Container>
);
