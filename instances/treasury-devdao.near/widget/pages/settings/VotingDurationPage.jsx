const { encodeToMarkdown, hasPermission, getRoleWiseData } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  encodeToMarkdown: () => {},
  hasPermission: () => {},
};
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

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

const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
const lastProposalId = Near.view(treasuryDaoID, "get_last_proposal_id");

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "policy",
  "AddProposal"
);

if (!daoPolicy || lastProposalId === null) {
  return (
    <div className="card d-flex justify-content-center align-items-center w-100 h-100">
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
      />
    </div>
  );
}

const deposit = daoPolicy?.proposal_bond || 100000000000000000000000;

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
const [isSubmittingChangeRequest, setSubmittingChangeRequest] = useState(false);
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
  setShowAffectedProposalsModal(false);
  setSubmittingChangeRequest(true);
  const description = {
    title: "Update policy - Voting Duration",
    summary: `${context.accountId} requested to change voting duration from ${currentDurationDays} to ${durationDays}.`,
  };
  Near.call({
    contractName: treasuryDaoID,
    methodName: "add_proposal",
    deposit,
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
  if (isSubmittingChangeRequest) {
    let errorTimeout = null;
    Near.asyncView(treasuryDaoID, "get_proposal", {
      id: lastProposalId - 1,
    }).then((proposal) => {
      const proposal_period =
        proposal?.kind?.ChangePolicyUpdateParameters?.parameters
          ?.proposal_period;

      if (
        proposal_period &&
        isSubmittingChangeRequest &&
        Number(proposal_period.substring(0, proposal_period.length - 9)) /
          (24 * 60 * 60) ===
          Number(durationDays)
      ) {
        setToastStatus(true);
        setSubmittingChangeRequest(false);
        clearTimeout(errorTimeout);
      }
    });

    // if in 20 seconds there is no change, show error condition
    errorTimeout = setTimeout(() => {
      setShowErrorToast(true);
      setSubmittingChangeRequest(false);
    }, 20000);
  }
}, [isSubmittingChangeRequest, lastProposalId]);

const changeDurationDays = (newDurationDays) => {
  setDurationDays(newDurationDays);
};

const showImpactedRequests =
  proposalsThatWillExpire.length > 0 || proposalsThatWillBeActive.length > 0;

return (
  <Container>
    <TransactionLoader
      showInProgress={isSubmittingChangeRequest}
      showError={showErrorToast}
      toggleToast={() => setShowErrorToast(false)}
    />
    <div className="card rounded-3 py-3" style={{ maxWidth: "50rem" }}>
      <div className="card-title px-3 mb-0">Voting Duration</div>
      <div className="p-3 d-flex flex-column gap-2">
        <div className="fw-bold text-lg">
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

        {showAffectedProposalsModal ? (
          <Modal>
            <ModalHeader>
              <i class="bi bi-exclamation-triangle text-warning"></i>
              Impact of changing voting duration
            </ModalHeader>
            <ModalContent>
              <p>
                You are about to update the voting duration. This will impact
                existing requests.
              </p>
              <ul>
                {otherPendingRequests.length > 0 ? (
                  <li>
                    <b>{otherPendingRequests.length} pending requests</b> will
                    now follow the new voting duration policy.
                  </li>
                ) : (
                  ""
                )}
                {proposalsThatWillExpire.length > 0 ? (
                  <li>
                    <b>{proposalsThatWillExpire.length} active requests</b>{" "}
                    under the old voting duration will move to the "Archived"
                    tab and close for voting. These requests were created
                    outside the new voting period and are no longer considered
                    active.
                  </li>
                ) : (
                  ""
                )}
                {proposalsThatWillBeActive.length > 0 ? (
                  <li>
                    <b>{proposalsThatWillBeActive.length} expired requests</b>{" "}
                    under the old voting duration will move back to the "Pending
                    Requests" tab and reopen for voting. These requests were
                    created within the new voting period and are no longer
                    considered expired.
                  </li>
                ) : (
                  ""
                )}
              </ul>
              {showImpactedRequests ? (
                <>
                  <h4>Summary of changes</h4>
                  <table className="table table-sm">
                    <thead>
                      <tr className="text-grey">
                        <th>Id</th>
                        <th>Description</th>
                        <th>Submission date</th>
                        <th>Current expiry</th>
                        <th>New expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposalsThatWillExpire.map((proposal) => (
                        <tr class="proposal-that-will-expire">
                          <td>{proposal.id}</td>
                          <td>{proposal.description}</td>
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
                      {proposalsThatWillBeActive.map((proposal) => (
                        <tr class="proposal-that-will-be-active">
                          <td>{proposal.id}</td>
                          <td>{proposal.description}</td>
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
            </ModalContent>
            <ModalFooter>
              <Widget
                src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
                props={{
                  classNames: { root: "btn-outline shadow-none border-0" },
                  label: "Cancel",
                  onClick: cancelChangeRequest,
                }}
              />
              <Widget
                src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
                props={{
                  classNames: { root: "theme-btn" },
                  label: "Yes, proceed",
                  onClick: submitChangeRequest,
                }}
              />
            </ModalFooter>
          </Modal>
        ) : (
          ""
        )}
        <div className="d-flex mt-2 gap-3 justify-content-end">
          <Widget
            src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
            props={{
              classNames: { root: "btn-outline shadow-none border-0" },
              label: "Cancel",
              onClick: cancelChangeRequest,
              disabled: durationDays === currentDurationDays,
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
                    loading: showLoader || isSubmittingChangeRequest,
                    disabled:
                      durationDays === currentDurationDays ||
                      showLoader ||
                      !hasCreatePermission ||
                      isSubmittingChangeRequest,
                  }}
                />
              ),
              checkForDeposit: true,
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
