const { Modal, ModalContent, ModalHeader, ModalFooter } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.modal"
);

const { encodeToMarkdown } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const instance = props.instance;
if (!instance) return <></>;

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const isOpen = props.isOpen;
const onCancelClick = props.onCancelClick;
const selectedMembers = props.selectedMembers || [];
const onConfirm = props.onConfirmClick ?? (() => {});

const [daoPolicy, setDaoPolicy] = useState(null);
const [allAdminsRemoved, setAllAdminsRemoved] = useState(false);

function updateDaoPolicy(policy) {
  const updatedPolicy = { ...policy };
  const removals = new Map();
  const emptyRoles = [];

  if (Array.isArray(updatedPolicy.roles)) {
    updatedPolicy.roles = updatedPolicy.roles.map((role) => {
      const group = role.kind.Group;
      if (!group || !Array.isArray(group)) return role;

      const newGroup = group.filter(
        (member) => !selectedMembers.some(({ member: m }) => m === member)
      );

      if (newGroup.length === 0) {
        emptyRoles.push(role.name);
      }

      selectedMembers.forEach(({ member, roles }) => {
        if (group.includes(member)) {
          if (!removals.has(member)) removals.set(member, new Set());
          removals.get(member).add(role.name);
        }
      });

      return {
        ...role,
        kind: { Group: newGroup },
      };
    });
  }

  const summaryLines = selectedMembers.map(({ member, roles }) => {
    return `- remove "${member}" from [${roles
      .map((r) => `"${r}"`)
      .join(", ")}]`;
  });

  return {
    updatedPolicy,
    summary: `${
      context.accountId
    } requested the following removals:\n${summaryLines.join("\n")}`,
    emptyRoles,
  };
}

useEffect(() => {
  if (treasuryDaoID) {
    Near.asyncView(treasuryDaoID, "get_policy", {}).then((i) => {
      setDaoPolicy(i);
      const { emptyRoles } = updateDaoPolicy(i);
      if (emptyRoles.length > 0) {
        setAllAdminsRemoved(emptyRoles);
        return;
      }
    });
  }
}, [treasuryDaoID]);

function onConfirmClick() {
  const deposit = daoPolicy?.proposal_bond || 0;
  const { updatedPolicy, summary } = updateDaoPolicy(daoPolicy);
  const description = {
    title: "Update policy - Members Permissions",
    summary,
  };

  onConfirm([
    {
      contractName: treasuryDaoID,
      methodName: "add_proposal",
      args: {
        proposal: {
          description: encodeToMarkdown(description),
          kind: { ChangePolicy: { policy: updatedPolicy } },
        },
      },
      gas: 200000000000000,
      deposit: deposit,
    },
  ]);
}

if (!daoPolicy) {
  return <></>;
}
return (
  <div>
    {allAdminsRemoved ? (
      <Modal hidden={!isOpen}>
        <ModalHeader>
          <h5 className="d-flex gap-2 align-items-center mb-0">
            <i class="bi bi-exclamation-octagon h5 mb-0 text-red"></i> Invalid
            Role Change
          </h5>
        </ModalHeader>

        <ModalContent>
          The following roles would be left with <strong>no members</strong> if
          you proceed:
          <ul className="my-1">
            {allAdminsRemoved.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
          Please adjust the selection to retain at least one member per role.
        </ModalContent>
        <ModalFooter>
          <div className="d-flex justify-content-end">
            <Widget
              src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
              props={{
                classNames: { root: "theme-btn" },
                label: "Close",
                onClick: onCancelClick,
              }}
            />
          </div>
        </ModalFooter>
      </Modal>
    ) : (
      <Modal hidden={!isOpen}>
        <ModalHeader>
          <h5 className="mb-0">Are you sure?</h5>
        </ModalHeader>

        <ModalContent>
          {selectedMembers.length === 1 ? (
            selectedMembers[0].member === "nearn-io.near" ? (
              <div className="mb-2">
                Removing nearn-io.near will disable the ability to create
                payment requests in NEARN.
              </div>
            ) : (
              <div>
                {selectedMembers[0].member} will lose their permissions to this
                treasury once the request is created and approved.
              </div>
            )
          ) : (
            <>
              <div>
                The following members will lose their permissions to this
                treasury once the request is created and approved:
              </div>
              <ul className="my-1">
                {selectedMembers.map(({ member }) => (
                  <li key={member}>{member}</li>
                ))}
              </ul>

              {selectedMembers.some(
                ({ member }) => member === "nearn-io.near"
              ) && (
                <div className="mt-2">
                  Additionally, the selected members include nearn-io.near.
                  Removing this member will disable the ability to create
                  payment requests in NEARN.
                </div>
              )}
            </>
          )}
        </ModalContent>
        <ModalFooter>
          <div className="d-flex gap-3 align-items-center justify-content-end">
            <Widget
              src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
              props={{
                classNames: {
                  root: "btn btn-outline-secondary shadow-none no-transparent",
                },
                label: "Cancel",
                onClick: onCancelClick,
              }}
            />
            <Widget
              src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Button"}
              props={{
                classNames: { root: "btn btn-danger" },
                label: "Remove",
                onClick: onConfirmClick,
              }}
            />
          </div>
        </ModalFooter>
      </Modal>
    )}
  </div>
);
