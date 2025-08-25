const { encodeToMarkdown, updateDaoPolicy } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const isTreasuryFactory = props.isTreasuryFactory;
const instance = props.instance;
if (!instance && !isTreasuryFactory) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const showEditor = props.showEditor;
const setShowEditor = props.setShowEditor || (() => {});

function toggleEditor() {
  setShowEditor(!showEditor);
}

const selectedMembers = props.selectedMembers ?? [];
const isEdit = props.isEdit;
const availableRoles = props.availableRoles || [];
const allMembers = props.allMembers || [];
const setToastStatus = props.setToastStatus ?? (() => {});
const updateLastProposalId = props.updateLastProposalId || (() => {});

const [showCancelModal, setShowCancelModal] = useState(false);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showErrorToast, setShowErrorToast] = useState(false);
const [updatedList, setUpdatedList] = useState([]);
const [showEditConfirmationModal, setShowEditConfirmationModal] =
  useState(false);

useEffect(() => {
  setUpdatedList([]);
}, [selectedMembers]);

if (!availableRoles.length) return <></>;

const daoPolicy =
  treasuryDaoID && !isTreasuryFactory
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;

const deposit = daoPolicy?.proposal_bond || 0;

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  if (!isTreasuryFactory) {
    getLastProposalId().then((id) => {
      setLastProposalId(id);
    });
  }
}, [isTreasuryFactory]);

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          updateLastProposalId(id);
          setToastStatus(true);
          setShowEditor(false);
          setShowEditConfirmationModal(false);
          clearTimeout(checkTxnTimeout);
          setTxnCreated(false);
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

function onSubmitClick(list) {
  list = list || updatedList;
  if (isTreasuryFactory) {
    props.onSubmit(
      list.map((member) => ({
        accountId: member.member,
        permissions: member.roles,
      }))
    );
  } else {
    setTxnCreated(true);
    const changes = updateDaoPolicy(list, daoPolicy);
    const updatedPolicy = changes.updatedPolicy;
    const summary = changes.summary;

    let title;
    if (isEdit) {
      title = "Update Policy - Edit Members Permissions";
    } else {
      title = "Update Policy - Add New Members";
    }

    const description = {
      title,
      summary,
    };

    Near.call([
      {
        contractName: treasuryDaoID,
        methodName: "add_proposal",
        args: {
          proposal: {
            description: encodeToMarkdown(description),
            kind: {
              ChangePolicy: {
                policy: updatedPolicy,
              },
            },
          },
        },
        gas: 200000000000000,
        deposit,
      },
    ]);
  }
}

const EditMembersChangesModal = () => {
  return showEditConfirmationModal ? (
    <div>
      <Modal props={{ minWidth: "700px" }}>
        <ModalHeader>
          <h4 className="d-flex gap-2 align-items-center justify-content-between mb-0">
            Confirm your change
            <i
              className="bi bi-x-lg h4 mb-0 cursor-pointer"
              onClick={() => setShowCancelModal(true)}
            ></i>
          </h4>
        </ModalHeader>
        <ModalContent>
          <table className="table table-compact my-0">
            <thead>
              <tr>
                <th className="fw-bold">Username</th>
                <th className="fw-bold text-center ">Current Roles</th>
                <th className="fw-bold text-center ">New Roles</th>
              </tr>
            </thead>
            <tbody>
              {selectedMembers.map(({ member, roles }, index) => {
                const updatedRoles = updatedList?.[index]?.roles ?? [];
                const originalSet = new Set(roles);
                const updatedSet = new Set(updatedRoles);

                const rolesChanged =
                  roles.length !== updatedRoles.length ||
                  [...originalSet].some((role) => !updatedSet.has(role));

                if (!rolesChanged) return null;

                return (
                  <tr key={index}>
                    <td
                      className="text-left fw-semibold text-truncate"
                      style={{ maxWidth: "200px" }}
                    >
                      {member}
                    </td>
                    <td className="text-center">{roles.join(", ")}</td>
                    <td className="text-center">{updatedRoles.join(", ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ModalContent>
        <ModalFooter>
          <div className="d-flex mt-2 gap-3 justify-content-end">
            <Widget
              loading=""
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
              props={{
                classNames: {
                  root: "btn btn-outline-secondary shadow-none no-transparent",
                },
                label: "Cancel",
                onClick: () => {
                  setShowCancelModal(true);
                },
                disabled: isTxnCreated,
              }}
            />
            <Widget
              loading=""
              src={`${REPL_DEVHUB}/widget/devhub.components.molecule.Button`}
              props={{
                classNames: { root: "theme-btn" },
                disabled: isTxnCreated,
                label: "Confirm",
                onClick: () => onSubmitClick(updatedList),
                loading: isTxnCreated,
              }}
            />
          </div>
        </ModalFooter>
      </Modal>
      <TransactionLoader
        showInProgress={isTxnCreated}
        cancelTxn={() => setTxnCreated(false)}
      />

      <Widget
        loading=""
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
        props={{
          instance,
          heading: "Are you sure you want to cancel?",
          content:
            "This action will clear all the information you have entered in the form and cannot be undone.",
          confirmLabel: "Yes",
          isOpen: showCancelModal,
          onCancelClick: () => setShowCancelModal(false),
          onConfirmClick: () => {
            setShowEditConfirmationModal(false);
            setShowCancelModal(false);
            setShowEditor(false);
          },
        }}
      />
    </div>
  ) : (
    <></>
  );
};

return (
  <div>
    {!isTreasuryFactory && <EditMembersChangesModal />}
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showEditor,
        onClose: toggleEditor,
        disableScroll: true,
        title: isEdit ? "Edit Members" : "Add Members",
        children: (
          <div>
            <Widget
              loading=""
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.members.MembersEditor`}
              props={{
                isEdit,
                availableRoles,
                allMembers,
                selectedMembers,
                disableCancel: isTxnCreated,
                isSubmitLoading: isTxnCreated,
                setShowCancelModal,
                setUpdatedList,
                setShowEditConfirmationModal,
                setShowEditor,
                treasuryDaoID,
                isTreasuryFactory,
                updatedList,
                daoPolicy,
                onFactorySubmit: props.onSubmit,
                updateLastProposalId,
                lastProposalId,
                setToastStatus,
              }}
            />
          </div>
        ),
      }}
    />
  </div>
);
