const {
  encodeToMarkdown,
  getFilteredProposalsByStatusAndKind,
  updateDaoPolicy,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common");

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
const isEdit = selectedMembers.length > 0;
const availableRoles = props.availableRoles || [];
const allMembers = props.allMembers || [];
const profilesData = Social.get("*/profile/name", "final") || {};
const accounts = Object.keys(profilesData);
const setToastStatus = props.setToastStatus ?? (() => {});
const updateLastProposalId = props.updateLastProposalId || (() => {});

const [showCancelModal, setShowCancelModal] = useState(false);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showErrorToast, setShowErrorToast] = useState(false);
const [
  showProposalsOverrideConfirmModal,
  setShowProposalsOverrideConfirmModal,
] = useState(false);
const [proposals, setProposals] = useState([]);
const [updatedList, setUpdatedList] = useState([]);
const [showEditConfirmationModal, setShowEditConfirmationModal] =
  useState(false);

useEffect(() => {
  setUpdatedList([]);
}, [selectedMembers]);

if (
  !profilesData ||
  !accounts.length ||
  !availableRoles.length ||
  typeof getFilteredProposalsByStatusAndKind !== "function"
)
  return <></>;

const fetchProposals = async (proposalId) =>
  getFilteredProposalsByStatusAndKind({
    treasuryDaoID,
    resPerPage: 10,
    isPrevPageCalled: false,
    filterKindArray: ["ChangePolicy"],
    filterStatusArray: ["InProgress"],
    offset: proposalId,
    lastProposalId: proposalId,
  }).then((r) => {
    return r.filteredProposals;
  });

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
    getLastProposalId().then((i) => {
      setLastProposalId(i);
      fetchProposals(i).then((prpls) => {
        setProposals(prpls);
      });
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
          setShowProposalsOverrideConfirmModal(false);
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

    const description = {
      title: "Update policy - Members Permissions",
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
      {proposals.length > 0 && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
          props={{
            instance,
            heading: "Confirm Your Change",
            wider: true,
            content: (
              <Widget
                src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.WarningTable`}
                props={{
                  warningText:
                    "This action will override your previous pending proposals. Complete exsisting one before creating a new to avoid conflicting or incomplete updates.",
                  tableProps: [{ proposals }],
                }}
              />
            ),
            confirmLabel: "Yes, proceed",
            isOpen: showProposalsOverrideConfirmModal,
            onCancelClick: () => setShowProposalsOverrideConfirmModal(false),
            onConfirmClick: () => {
              setShowProposalsOverrideConfirmModal(false);
              onSubmitClick(updatedList);
            },
          }}
        />
      )}

      <Widget
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
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showEditor,
        onClose: toggleEditor,
        disableScroll: true,
        title: selectedMembers.length > 0 ? "Edit Members" : "Add Members",
        children: (
          <div>
            <div className="mb-3">
              {isEdit
                ? "Make changes to the member's permissions to submit the request. Each member must have at least one permission."
                : "To add a members, enter the username and select at least one permission."}
            </div>
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.members.MembersEditor`}
              props={{
                isEdit,
                accounts,
                availableRoles,
                allMembers,
                selectedMembers,
                disableCancel:
                  isTxnCreated || showProposalsOverrideConfirmModal,
                isSubmitLoading:
                  isTxnCreated || showProposalsOverrideConfirmModal,
                setShowCancelModal,
                setUpdatedList,
                setShowEditConfirmationModal,
                setShowEditor,
                setShowProposalsOverrideConfirmModal,
                onSubmitClick,
                treasuryDaoID,
                isTreasuryFactory,
                proposals,
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
