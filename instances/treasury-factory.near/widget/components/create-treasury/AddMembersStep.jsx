const { getRolesDescription } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/lib.common"
) || {
  getRolesDescription: () => {},
};

const { formFields, setFormFields } = props;

const Badge = styled.div`
  border: 1px solid #e2e6ec;
  border-radius: 32px;
  font-size: 12px;
  padding: 4px 8px;
`;

const Item = styled.div`
  border-bottom: 1px solid #e2e6ec;
  padding: 10px 0;

  &:last-child {
    border: 0;
  }

  .flex-1 {
    flex: 1;
  }

  .w-15 {
    width: 15%;
  }
`;

const ActionButtons = styled.div`
  i {
    font-size: 18px;
  }
`;

const PERMISSIONS = {
  create: "Requestor",
  edit: "Admin",
  vote: "Approver",
};

const [members, setMembers] = useState(
  formFields.members ?? [
    {
      accountId: context.accountId,
      permissions: [PERMISSIONS.create, PERMISSIONS.edit, PERMISSIONS.vote],
    },
  ]
);

const [showAddMemberModal, setShowAddMemberModal] = useState(false);
const [fields, setFields] = useState({});

useEffect(() => {
  setFormFields({
    ...formFields,
    members,
  });
}, [members]);

const ListItem = ({ member, key }) => (
  <Item className="d-flex align-items-center gap-3 justify-content-between w-100">
    <div style={{ width: "150px" }}>
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
        props={{ accountId: member.accountId }}
      />
    </div>

    <div className="w-100 d-flex flex-1 flex-row gap-3 justify-content-between">
      <div className="d-flex gap-1 align-items-center flex-wrap flex-1">
        {member.permissions.map((permission, i) => {
          const description = getRolesDescription(permission);
          return (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="tooltip">{description}</Tooltip>}
            >
              <Badge key={i}>{permission}</Badge>
            </OverlayTrigger>
          );
        })}
      </div>

      <div className="d-flex">
        {member.accountId !== context.accountId && (
          <ActionButtons className="d-flex gap-3 align-items-center justify-content-end">
            <i
              role="button"
              className="bi bi-pencil"
              onClick={() => {
                setFields({
                  accountId: member.accountId,
                  permissions: member.permissions,
                });
                setShowAddMemberModal(true);
              }}
            />
            <i
              role="button"
              className="bi bi-trash text-danger"
              onClick={() =>
                setMembers(
                  members.filter((m) => m.accountId !== member.accountId)
                )
              }
            />
          </ActionButtons>
        )}
      </div>
    </div>
  </Item>
);

function onClose() {
  setShowAddMemberModal(false);
}

function onSubmit(newData) {
  const merged = [...members, ...newData];
  const newMembers = Array.from(
    new Map(merged.map((item) => [item.accountId, item])).values()
  );

  setMembers(newMembers);
  setFields({});
  onClose();
}

return (
  <>
    <div>
      {showAddMemberModal && (
        <Widget
          src={`${REPL_DEVDAO_ACCOUNT}/widget/pages.settings.members.MembersForm`}
          props={{
            showEditor: showAddMemberModal,
            setShowEditor: setShowAddMemberModal,
            instance: "${REPL_BASE_DEPLOYMENT_ACCOUNT}",
            devdaoAccount: "${REPL_DEVDAO_ACCOUNT}",
            refreshMembersTableData: () => {},
            onCloseCanvas: onClose,
            availableRoles: Object.values(PERMISSIONS).map((i) => {
              return { title: i, value: i };
            }),
            selectedMembers: fields.accountId
              ? [
                  {
                    member: fields.accountId,
                    roles: fields.permissions,
                  },
                ]
              : [],
            allMembers: members?.map((i) => {
              return { member: i.accountId, roles: i.permissions };
            }),
            setToastStatus: () => {},
            isTreasuryFactory: true,
            onSubmit: onSubmit,
          }}
        />
      )}
      <h3>Add Members</h3>
      <p>
        Add members to your treasury and define their roles. You can also do
        this later.
      </p>
    </div>
    <div>
      <Item
        style={{ fontSize: "12px" }}
        className="d-flex align-items-center gap-3"
      >
        <div style={{ width: "150px" }}>Account</div>
        <div className="w-100 d-flex flex-1 flex-row gap-3 justify-content-between">
          <div className="d-flex gap-1 align-items-center">
            Permission Group(s)
            <OverlayTrigger
              placement="top"
              delay={{ show: 200, hide: 500 }}
              overlay={
                <Tooltip id="tooltip">
                  <span>
                    Refer to
                    <a
                      style={{ color: "#01BF7A" }}
                      className="text-underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={"https://docs.neartreasury.com/permissions"}
                    >
                      Permission Group(s)
                    </a>
                    to learn more about each group can and cannot do.
                  </span>
                </Tooltip>
              }
            >
              <i className="bi bi-info-circle text-secondary"></i>
            </OverlayTrigger>
          </div>
          <div className="d-flex">Actions</div>
        </div>
      </Item>
      <div className="d-flex flex-column">
        {members.map((member, i) => (
          <ListItem key={i} member={member} />
        ))}
      </div>
    </div>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Info`}
      props={{
        type: "info",
        text: "The voting thresholds policy will be set to one vote by default for all permission groups. You can modify those later in the Settings.",
      }}
    />
    <button
      className="btn btn-outline-plain w-100"
      onClick={() => {
        setFields({});
        setShowAddMemberModal(true);
      }}
    >
      <i class="bi bi-plus h5 mb-0"></i>
      Add Member
    </button>
    <div className="d-flex gap-2">
      <Link
        className="btn w-100"
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=1`}
      >
        Back
      </Link>
      <Link
        className={`btn btn-primary w-100 ${
          members.length > 0 ? "" : "disabled"
        }`}
        href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=3`}
      >
        Continue
      </Link>
    </div>
  </>
);
