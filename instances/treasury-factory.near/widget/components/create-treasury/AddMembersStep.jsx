const { formFields, setFormFields } = props;

const Badge = styled.div`
  border: 1px solid #e2e6ec;
  border-radius: 32px;
  padding: 4px 10px;
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
  create: "Create",
  edit: "Edit",
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
  <Item className="d-flex align-items-center justify-content-between w-100">
    <div className="w-50">
      <Widget
        src="mob.near/widget/Profile.ShortInlineBlock"
        props={{
          accountId: member.accountId,
        }}
      />
    </div>

    <div className="d-flex gap-2 align-items-center w-25">
      {member.permissions.map((permission, i) => (
        <Badge key={i}>{permission}</Badge>
      ))}
    </div>

    <ActionButtons className="d-flex gap-3 align-items-center justify-content-end w-25">
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
          setMembers(members.filter((m) => m.accountId !== member.accountId))
        }
      />
    </ActionButtons>
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
        Set up who can access the treasury and what they can do. You can also do
        this later.
      </p>
    </div>
    <div>
      <Item
        style={{ fontSize: "12px" }}
        className="d-flex justify-content-between align-items-center"
      >
        <div className="w-50">Account</div>
        <div className="w-25">Permissions</div>
        <div className="w-25 d-flex justify-content-end">Actions</div>
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
        Next
      </Link>
    </div>
  </>
);
