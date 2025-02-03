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
`;

const ActionButtons = styled.div`
  i {
    font-size: 18px;
  }
`;

const PERMISSIONS = {
  create: "Create Requests",
  edit: "Manage Members",
  vote: "Vote",
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
    <div className="w-25">
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Profile`}
        props={{ accountId: member.accountId }}
      />
    </div>

    <div className="d-flex flex-row" style={{ width: "380px" }}>
      <div
        className="d-flex gap-1 align-items-center"
        style={{ width: "315px" }}
      >
        {member.permissions.map((permission, i) => (
          <Badge key={i}>{permission}</Badge>
        ))}
      </div>

      <div className="d-flex flex-row" style={{ width: "70px" }}>
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

function onSubmit() {
  let newMembers = [
    ...members,
    {
      accountId: fields.accountId,
      permissions: fields.permissions,
    },
  ];
  newMembers = newMembers.filter(
    (el, i) =>
      newMembers.map((m) => m.accountId).lastIndexOf(el.accountId) === i
  );
  setMembers(newMembers);
  setFields({});
  onClose();
}

return (
  <>
    <div>
      <Widget
        src={`${REPL_DEVDAO_ACCOUNT}/widget/components.OffCanvas`}
        props={{
          title: "New Member",
          children: (
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.create-treasury.AddMemberForm`}
              props={{ fields, setFields, onClose, onSubmit }}
            />
          ),
          confirmLabel: "Confirm",
          showCanvas: showAddMemberModal,
          onClose,
        }}
      />
      <h3>Add Members</h3>
      <p>
        Add members to your treasury and define their roles. You can also do
        this later.
      </p>
    </div>
    <div>
      <Item
        style={{ fontSize: "12px" }}
        className="d-flex justify-content-between align-items-center gap-3"
      >
        <div className="w-25">Account</div>
        <div className="d-flex flex-row gap-3" style={{ width: "380px" }}>
          <div
            className="d-flex gap-1 align-items-center"
            style={{ width: "290px" }}
          >
            Permissions
          </div>
          <div className="d-flex flex-row" style={{ width: "60px" }}>
            Actions
          </div>
        </div>
      </Item>
      <div className="d-flex flex-column">
        {members.map((member, i) => (
          <ListItem key={i} member={member} />
        ))}
      </div>
    </div>

    <button
      className="btn btn-outline-plain w-100"
      onClick={() => {
        setFields({});
        setShowAddMemberModal(true);
      }}
    >
      Add member
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
