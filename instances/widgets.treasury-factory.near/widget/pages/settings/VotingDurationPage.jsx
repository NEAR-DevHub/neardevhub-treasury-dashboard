const { encodeToMarkdown, hasPermission, getRoleWiseData } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  encodeToMarkdown: () => {},
  hasPermission: () => {},
};
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const { InfoBlock } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InfoBlock`
) || { InfoBlock: () => <></> };

const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

const daoPolicy = treasuryDaoID
  ? Near.view(treasuryDaoID, "get_policy", {})
  : null;

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy_update_parameters",
  "AddProposal"
);

const [lastProposalId, setLastProposalId] = useState(null);

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  getLastProposalId().then((i) => setLastProposalId(i));
}, []);

if (!daoPolicy || lastProposalId === null) {
  return (
    <div className="card d-flex justify-content-center align-items-center w-100 h-100">
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
      />
    </div>
  );
}

const deposit = daoPolicy?.proposal_bond || 0;

const currentDurationDays =
  Number(
    daoPolicy.proposal_period.substr(
      0,
      daoPolicy.proposal_period.length - "000000000".length
    )
  ) /
  (60 * 60 * 24);

const [durationDays, setDurationDays] = useState(currentDurationDays);
const [proposalsThatWillExpire, setProposalsThatWillExpire] = useState([]);
const [proposalsThatWillBeActive, setProposalsThatWillBeActive] = useState([]);
const [otherPendingRequests, setOtherPendingRequests] = useState([]);
const [showToastStatus, setToastStatus] = useState(null);
const [isTxnCreated, setTxnCreated] = useState(false);
const [showAffectedProposalsModal, setShowAffectedProposalsModal] =
  useState(false);

const [showErrorToast, setShowErrorToast] = useState(false);
const [showLoader, setLoading] = useState(false);

const Container = styled.div`
  font-size: 14px;

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid var(--border-color);
  }

  label {
    color: var(--text-secondary);
    font-size: 12px;
  }
`;

const cancelChangeRequest = () => {
  setLoading(false);
  setShowAffectedProposalsModal(false);
  setDurationDays(currentDurationDays);
};

const findAffectedProposals = (callback) => {
  setProposalsThatWillExpire([]);
  setProposalsThatWillBeActive([]);
  setOtherPendingRequests([]);
  const limit = 10;
  if (durationDays < currentDurationDays) {
    const fetchProposalsThatWillExpire = (
      lastIndex,
      newProposalsThatWillExpire,
      newOtherPendingRequests
    ) => {
      Near.asyncView(treasuryDaoID, "get_proposals", {
        from_index: lastIndex < limit ? 0 : lastIndex - limit,
        limit,
      }).then((/** @type Array */ proposals) => {
        const now = new Date().getTime();

        let fetchMore = false;
        for (const proposal of proposals.reverse()) {
          const submissionTimeMillis = Number(
            proposal.submission_time.substr(
              0,
              proposal.submission_time.length - 6
            )
          );
          const currentExpiryTime =
            submissionTimeMillis + 24 * 60 * 60 * 1000 * currentDurationDays;
          const newExpiryTime =
            submissionTimeMillis + 24 * 60 * 60 * 1000 * durationDays;
          if (
            currentExpiryTime >= now &&
            newExpiryTime < now &&
            proposal.status === "InProgress"
          ) {
            newProposalsThatWillExpire.push({
              currentExpiryTime,
              newExpiryTime,
              submissionTimeMillis,
              ...proposal,
            });
          } else if (proposal.status === "InProgress" && newExpiryTime > now) {
            newOtherPendingRequests.push({
              currentExpiryTime,
              newExpiryTime,
              submissionTimeMillis,
              ...proposal,
            });
          }
          fetchMore = proposals.length === limit && currentExpiryTime >= now;
        }
        setProposalsThatWillExpire(newProposalsThatWillExpire);
        setOtherPendingRequests(newOtherPendingRequests);
        if (fetchMore) {
          fetchProposalsThatWillExpire(
            lastIndex - limit,
            newProposalsThatWillExpire,
            newOtherPendingRequests
          );
        } else {
          callback(
            newProposalsThatWillExpire.length > 0 ||
              newOtherPendingRequests.length > 0
          );
        }
      });
    };
    fetchProposalsThatWillExpire(lastProposalId, [], []);
  } else if (durationDays > currentDurationDays) {
    const fetchProposalsThatWillBeActive = (
      lastIndex,
      newProposalsThatWillBeActive,
      newOtherPendingRequests
    ) => {
      Near.asyncView(treasuryDaoID, "get_proposals", {
        from_index: lastIndex < limit ? 0 : lastIndex - limit,
        limit,
      }).then((/** @type Array */ proposals) => {
        const now = new Date().getTime();

        let fetchMore = false;
        for (const proposal of proposals.reverse()) {
          const submissionTimeMillis = Number(
            proposal.submission_time.substr(
              0,
              proposal.submission_time.length - 6
            )
          );
          const currentExpiryTime =
            submissionTimeMillis + 24 * 60 * 60 * 1000 * currentDurationDays;
          const newExpiryTime =
            submissionTimeMillis + 24 * 60 * 60 * 1000 * durationDays;
          if (
            currentExpiryTime <= now &&
            newExpiryTime > now &&
            proposal.status === "InProgress"
          ) {
            newProposalsThatWillBeActive.push({
              currentExpiryTime,
              newExpiryTime,
              submissionTimeMillis,
              ...proposal,
            });
          } else if (proposal.status === "InProgress" && newExpiryTime > now) {
            newOtherPendingRequests.push({
              currentExpiryTime,
              newExpiryTime,
              submissionTimeMillis,
              ...proposal,
            });
          }
          fetchMore = proposals.length === limit && newExpiryTime >= now;
        }
        setProposalsThatWillBeActive(newProposalsThatWillBeActive);
        setOtherPendingRequests(newOtherPendingRequests);
        if (fetchMore) {
          fetchProposalsThatWillBeActive(
            lastIndex - limit,
            newProposalsThatWillBeActive,
            newOtherPendingRequests
          );
        } else {
          callback(
            newProposalsThatWillBeActive.length > 0 ||
              newOtherPendingRequests.length > 0
          );
        }
      });
    };
    fetchProposalsThatWillBeActive(lastProposalId, [], []);
  }
};

function submitVotePolicyChangeTxn() {
  setLoading(false);
  setShowAffectedProposalsModal(false);
  setTxnCreated(true);
  const description = {
    title: "Update policy - Voting Duration",
    summary: `${context.accountId} requested to change voting duration from ${currentDurationDays} to ${durationDays}.`,
  };
  Near.call({
    contractName: treasuryDaoID,
    methodName: "add_proposal",
    deposit,
    gas: 200000000000000,
    args: {
      proposal: {
        description: encodeToMarkdown(description),
        kind: {
          ChangePolicyUpdateParameters: {
            parameters: {
              proposal_period:
                (60 * 60 * 24 * durationDays).toString() + "000000000",
            },
          },
        },
      },
    },
  });
}

const submitChangeRequest = () => {
  setLoading(true);
  if (showAffectedProposalsModal) {
    submitVotePolicyChangeTxn();
  } else {
    findAffectedProposals((shouldShowAffectedProposalsModal) => {
      if (!showAffectedProposalsModal && shouldShowAffectedProposalsModal) {
        setShowAffectedProposalsModal(true);
        return;
      }
      submitVotePolicyChangeTxn();
    });
  }
};

useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          setToastStatus(true);
          setTxnCreated(false);
          clearTimeout(checkTxnTimeout);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated, lastProposalId]);

const changeDurationDays = (newDurationDays) => {
  setDurationDays(newDurationDays);
};

function isInitialValues() {
  return durationDays === currentDurationDays;
}

const showImpactedRequests =
  proposalsThatWillExpire.length > 0 || proposalsThatWillBeActive.length > 0;

return (
  <Container>
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <div className="card rounded-4 py-3" style={{ maxWidth: "50rem" }}>
      <div className="card-title px-3 pb-3">Voting Duration</div>
      <div className="px-3 py-1 d-flex flex-column gap-2">
        <div className="fw-semi-bold text-lg">
          Set the number of days a vote is active. A decision expires if voting
          is not completed within this period.
        </div>
        <div>
          <label for="exampleInputEmail1" className="pb-1">
            Number of days
          </label>
          <input
            type="number"
            class="form-control"
            aria-describedby="votingDurationHelp"
            placeholder="Enter voting duration days"
            value={durationDays}
            onChange={(event) => changeDurationDays(event.target.value)}
            disabled={!hasCreatePermission}
          ></input>
        </div>

        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
          props={{
            instance,
            heading: "Confirm Your Change",
            wider: true,
            content: (
              <>
                <p>
                  You are about to update the voting duration. This will affect
                  the following existing requests.
                </p>
                <InfoBlock
                  type="warning"
                  description={
                    <>
                      <ul className="px-3 mb-0">
                        {otherPendingRequests.length > 0 ? (
                          <li>
                            <b>
                              {otherPendingRequests.length} pending requests
                            </b>{" "}
                            will now follow the new voting duration policy.
                          </li>
                        ) : (
                          ""
                        )}
                        {proposalsThatWillExpire.length > 0 ? (
                          <li>
                            <b>
                              {proposalsThatWillExpire.length} active requests
                            </b>{" "}
                            under the old voting duration will move to the
                            "Archived" tab and close for voting. These requests
                            were created outside the new voting period and are
                            no longer considered active.
                          </li>
                        ) : (
                          ""
                        )}
                        {proposalsThatWillBeActive.length > 0 ? (
                          <li>
                            <b>
                              {proposalsThatWillBeActive.length} expired
                              requests
                            </b>{" "}
                            under the old voting duration will move back to the
                            "Pending Requests" tab and reopen for voting. These
                            requests were created within the new voting period
                            and are no longer considered expired.
                          </li>
                        ) : (
                          ""
                        )}
                      </ul>
                    </>
                  }
                />

                {showImpactedRequests ? (
                  <>
                    <h6 className="mt-4">Summary of changes</h6>
                    <div className="overflow-auto">
                      <table
                        class="table table-compact"
                        style={{ width: "100%", tableLayout: "fixed" }}
                      >
                        <thead>
                          <tr>
                            <th>Id</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Expiry date</th>
                            <th></th>
                            <th>New Status</th>
                            <th>New expiry</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposalsThatWillExpire.map((proposal) => (
                            <tr class="proposal-that-will-expire">
                              <td>{proposal.id}</td>

                              <td>
                                <div className="text-clamp">
                                  {proposal.description}
                                </div>
                              </td>

                              <td>
                                <Widget
                                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
                                  props={{ status: proposal.status }}
                                />
                              </td>
                              <td>
                                {new Date(proposal.currentExpiryTime)
                                  .toJSON()
                                  .substring(0, "yyyy-mm-dd".length)}
                              </td>
                              <td>
                                <i className="bi bi-arrow-right text-lg"></i>
                              </td>
                              <td>
                                <Widget
                                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
                                  props={{ status: "Active" }}
                                />
                              </td>
                              <td>
                                {new Date(proposal.newExpiryTime)
                                  .toJSON()
                                  .substring(0, "yyyy-mm-dd".length)}
                              </td>
                            </tr>
                          ))}
                          {proposalsThatWillBeActive.map((proposal) => (
                            <tr class="proposal-that-will-be-active">
                              <td>{proposal.id}</td>
                              <td>
                                <Widget
                                  src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.HistoryStatus`}
                                  props={{
                                    instance,
                                    isVoteStatus: false,
                                    status: proposal.status,
                                  }}
                                />
                              </td>
                              <td>
                                <div className="text-clamp">
                                  {proposal.description}
                                </div>
                              </td>
                              <td>
                                {new Date(proposal.submissionTimeMillis)
                                  .toJSON()
                                  .substring(0, "yyyy-mm-dd".length)}
                              </td>
                              <td>
                                {new Date(proposal.currentExpiryTime)
                                  .toJSON()
                                  .substring(0, "yyyy-mm-dd".length)}
                              </td>
                              <td>
                                {new Date(proposal.newExpiryTime)
                                  .toJSON()
                                  .substring(0, "yyyy-mm-dd".length)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  ""
                )}
                {proposalsThatWillBeActive.length > 0 ? (
                  <p>
                    If you do not want expired proposals to be open for voting
                    again, you may need to delete them.
                  </p>
                ) : (
                  ""
                )}
              </>
            ),
            confirmLabel: "Yes, proceed",
            isOpen: showAffectedProposalsModal,
            onCancelClick: cancelChangeRequest,
            onConfirmClick: submitChangeRequest,
          }}
        />
        <div className="d-flex mt-2 gap-3 justify-content-end">
          <Widget
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
            props={{
              classNames: {
                root: "btn btn-outline-secondary shadow-none no-transparent",
              },
              label: "Cancel",
              onClick: cancelChangeRequest,
              disabled: isInitialValues() || isTxnCreated,
            }}
          />
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
            props={{
              ActionButton: () => (
                <Widget
                  src={
                    "${REPL_DEVHUB}/widget/devhub.components.molecule.Button"
                  }
                  props={{
                    classNames: { root: "theme-btn" },
                    label: "Submit Request",
                    loading: showLoader || isTxnCreated,
                    disabled:
                      isInitialValues() ||
                      showLoader ||
                      !hasCreatePermission ||
                      isTxnCreated,
                  }}
                />
              ),
              checkForDeposit: true,
              disabled:
                isInitialValues() ||
                showLoader ||
                !hasCreatePermission ||
                isTxnCreated,
              treasuryDaoID,
              callbackAction: submitChangeRequest,
            }}
          />
        </div>
      </div>
    </div>
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showToastStatus ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i
            className="bi bi-x-lg h6 mb-0 cursor-pointer"
            onClick={() => setToastStatus(null)}
          ></i>
        </div>
        <div className="toast-body">
          <div className="d-flex align-items-center gap-3">
            <i class="bi bi-check2 h3 mb-0 success-icon"></i>
            <div>
              <div>Voting duration change request submitted.</div>
              <a
                className="text-underline"
                href={href({
                  widgetSrc: `${instance}/widget/app`,
                  params: {
                    page: "settings",
                  },
                })}
              >
                View it
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Container>
);
