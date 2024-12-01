const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const { Modal, ModalBackdrop, ModalContent, ModalDialog, ModalHeader } =
  VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal");

const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});

if (!daoPolicy) {
  return <></>;
}

const lastProposalId = Near.view(treasuryDaoID, "get_last_proposal_id");

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
const [showToastStatus, setToastStatus] = useState(null);
const [isSubmittingChangeRequest, setSubmittingChangeRequest] = useState(false);
const [showAffectedProposalsModal, setShowAffectedProposalsModal] =
  useState(false);

const Container = styled.div`
  font-size: 14px;
  .border-right {
    border-right: 1px solid rgba(226, 230, 236, 1);
  }

  .card-title {
    font-size: 18px;
    font-weight: 600;
    padding-block: 5px;
    border-bottom: 1px solid rgba(226, 230, 236, 1);
  }

  .selected-role {
    background-color: rgba(244, 244, 244, 1);
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .tag {
    background-color: rgba(244, 244, 244, 1);
    font-size: 12px;
    padding-block: 5px;
  }

  label {
    color: rgba(153, 153, 153, 1);
    font-size: 12px;
  }

  .fw-bold {
    font-weight: 500 !important;
  }

  .p-0 {
    padding: 0 !important;
  }

  .text-md {
    font-size: 13px;
  }

  .theme-btn {
    background-color: var(--theme-color) !important;
    color: white;
  }

  .warning {
    background-color: rgba(255, 158, 0, 0.1);
    color: rgba(177, 113, 8, 1);
    font-weight: 500;
  }

  .text-sm {
    font-size: 12px !important;
  }

  .text-muted {
    color: rgba(153, 153, 153, 1);
  }

  .text-red {
    color: #d95c4a;
  }

  .toast {
    background: white !important;
  }

  .toast-header {
    background-color: #2c3e50 !important;
    color: white !important;
  }
`;

const ToastContainer = styled.div`
  a {
    color: black !important;
    text-decoration: underline !important;
    &:hover {
      color: black !important;
    }
  }
`;

const cancelChangeRequest = () => {
  setShowAffectedProposalsModal(false);
  setDurationDays(currentDurationDays);
};

const findAffectedProposals = (callback) => {
  setProposalsThatWillExpire([]);
  setProposalsThatWillBeActive([]);
  const limit = 10;
  if (durationDays < currentDurationDays) {
    const fetchProposalsThatWillExpire = (
      lastIndex,
      newProposalsThatWillExpire
    ) => {
      Near.asyncView(treasuryDaoID, "get_proposals", {
        from_index: lastIndex - limit,
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
          }
          fetchMore = currentExpiryTime >= now;
        }
        setProposalsThatWillExpire(newProposalsThatWillExpire);
        if (fetchMore) {
          fetchProposalsThatWillExpire(
            lastIndex - limit,
            newProposalsThatWillExpire
          );
        } else {
          callback(newProposalsThatWillExpire.length > 0);
        }
      });
    };
    fetchProposalsThatWillExpire(lastProposalId, []);
  } else if (durationDays > currentDurationDays) {
    const fetchProposalsThatWillBeActive = (
      lastIndex,
      newProposalsThatWillBeActive
    ) => {
      Near.asyncView(treasuryDaoID, "get_proposals", {
        from_index: lastIndex - limit,
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
          }
          fetchMore = newExpiryTime >= now;
        }
        setProposalsThatWillBeActive(newProposalsThatWillBeActive);
        if (fetchMore) {
          fetchProposalsThatWillBeActive(
            lastIndex - limit,
            newProposalsThatWillBeActive
          );
        } else {
          callback(newProposalsThatWillBeActive.length > 0);
        }
      });
    };
    fetchProposalsThatWillBeActive(lastProposalId, []);
  } else {
    callback(false);
  }
};

const submitChangeRequest = () => {
  findAffectedProposals((shouldShowAffectedProposalsModal) => {
    if (!showAffectedProposalsModal && shouldShowAffectedProposalsModal) {
      setShowAffectedProposalsModal(true);
      return;
    }

    setShowAffectedProposalsModal(false);
    setSubmittingChangeRequest(true);
    Near.call({
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      deposit,
      args: {
        proposal: {
          description: "Change proposal period",
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
  });
};

useEffect(() => {
  Near.asyncView(treasuryDaoID, "get_proposal", {
    id: lastProposalId - 1,
  }).then((proposal) => {
    const proposal_period =
      proposal?.kind?.ChangePolicyUpdateParameters?.parameters?.proposal_period;

    if (
      proposal_period &&
      isSubmittingChangeRequest &&
      Number(proposal_period.substring(0, proposal_period.length - 9)) /
        (24 * 60 * 60) ===
        Number(durationDays)
    ) {
      setToastStatus(true);
      setSubmittingChangeRequest(false);
    }
  });
}, [isSubmittingChangeRequest, lastProposalId]);

const changeDurationDays = (newDurationDays) => {
  setDurationDays(newDurationDays);
};

return (
  <Container>
    <div className="card rounded-3" style={{ maxWidth: "50rem" }}>
      <div className="card-title px-3">Voting Duration</div>
      <div className="card-body">
        <p>
          Set the number of days a vote is active. A decision expires if voting
          is not completed within this period.
        </p>
        <p>
          <label for="exampleInputEmail1" class="px-3">
            Number of days
          </label>
          <input
            type="number"
            class="form-control"
            aria-describedby="votingDurationHelp"
            placeholder="Enter voting duration days"
            value={durationDays}
            onChange={(event) => changeDurationDays(event.target.value)}
          ></input>
          <small id="votingDurationHelp" class="form-text text-muted px-3">
            Enter number of days that a vote should be active
          </small>
        </p>

        {showAffectedProposalsModal ? (
          <Modal>
            <ModalBackdrop />
            <ModalDialog className="card">
              <ModalHeader>
                <h5 className="mb-0">
                  Changing the voting duration will affect the status of some
                  requests
                </h5>
              </ModalHeader>
              <ModalContent>
                <p>
                  You are about to update the voting duration. This will affect
                  the following existing requests.
                </p>
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
              </ModalContent>
              <div className="modalfooter d-flex gap-2 align-items-center justify-content-end mt-2">
                <Widget
                  src={
                    "${REPL_DEVHUB}/widget/devhub.components.molecule.Button"
                  }
                  props={{
                    classNames: { root: "btn-outline-secondary" },
                    label: "Cancel",
                    onClick: cancelChangeRequest,
                  }}
                />
                <Widget
                  src={
                    "${REPL_DEVHUB}/widget/devhub.components.molecule.Button"
                  }
                  props={{
                    classNames: { root: "theme-btn" },
                    label: "Yes, proceed",
                    onClick: submitChangeRequest,
                  }}
                />
              </div>
            </ModalDialog>
          </Modal>
        ) : (
          ""
        )}

        <button class="btn btn-light" onClick={cancelChangeRequest}>
          Cancel
        </button>
        <button class="btn btn-success" onClick={submitChangeRequest}>
          Submit Request
        </button>
      </div>
    </div>
    <ToastContainer className="toast-container position-fixed bottom-0 end-0 p-3">
      <div className={`toast ${showToastStatus ? "show" : ""}`}>
        <div className="toast-header px-2">
          <strong className="me-auto">Just Now</strong>
          <i className="bi bi-x-lg h6" onClick={() => setToastStatus(null)}></i>
        </div>
        <div className="toast-body">
          <p>Voting duration change request submitted</p>
        </div>
      </div>
    </ToastContainer>
  </Container>
);
