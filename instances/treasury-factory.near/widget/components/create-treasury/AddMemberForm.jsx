const { fields, onClose, onSubmit } = props;

const FormFields = styled.div`
  .rbt-token {
    background: transparent;
    color: inherit;
    border: 1px solid #e2e6ec;
    border-radius: 32px;
    padding: 2px 4px;
  }
  .rbt-menu > .dropdown-item:hover {
    text-decoration: none;
  }
`;

const PERMISSIONS = {
  create: "Create",
  edit: "Edit",
  vote: "Vote",
};

const [open, setOpen] = useState(false);
const [memberAccount, setMemberAccount] = useState(fields.accountId ?? "");
const [permissions, setPermissions] = useState(fields.permissions ?? []);

return (
  <FormFields className="d-flex flex-column gap-3">
    <div className="d-flex flex-column gap-2">
      <label>Account</label>
      <input
        type="text"
        value={memberAccount}
        onChange={(e) => {
          setMemberAccount(e.target.value);
          setOpen(true);
        }}
      />

      {open && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.ProfileAutocomplete`}
          props={{
            term: memberAccount,
            onSelect: (value) => {
              setMemberAccount(value);
              fields.accountId = value;
            },
            onClose: () => setOpen(false),
          }}
        />
      )}
    </div>
    <div className="d-flex flex-column gap-2">
      <label>Permissions</label>
      <Typeahead
        id
        selected={permissions}
        onChange={(value) => {
          setPermissions(value);
          fields.permissions = value;
        }}
        options={Object.values(PERMISSIONS)}
        positionFixed
        multiple
      />
    </div>
    <div className="d-flex flex-row justify-content-end gap-2">
      <div className={`btn btn-outline-plain`} onClick={onClose}>
        Close
      </div>
      <div
        className={`btn btn-primary ${
          memberAccount.length > 0 && permissions.length > 0 ? "" : "disabled"
        }`}
        onClick={onSubmit}
      >
        Submit
      </div>
    </div>
  </FormFields>
);
