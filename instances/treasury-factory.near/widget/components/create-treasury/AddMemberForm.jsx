const { fields, setFields, onClose, onSubmit } = props;

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

return (
  <FormFields className="d-flex flex-column gap-3">
    <div className="d-flex flex-column gap-2">
      <label>Account</label>
      <Widget
        src="${REPL_DEVHUB}/widget/devhub.entity.proposal.AccountInput"
        props={{
          value: fields.accountId ?? "",
          onUpdate: (value) => {
            fields.accountId = value ?? fields.accountId;
            setFields(fields);
          },
          maxWidth: "100%",
        }}
      />
    </div>
    <div className="d-flex flex-column gap-2">
      <label>Permissions</label>
      <Typeahead
        selected={fields.permissions ?? []}
        onChange={(value) => {
          fields.permissions = value ?? fields.permissions;
          setFields(fields);
        }}
        options={Object.values(PERMISSIONS)}
        positionFixed
        multiple
      />
    </div>
    <div className="d-flex flex-row justify-content-end gap-2">
      <div className={`btn`} onClick={onClose}>
        Close
      </div>
      <div
        className={`btn btn-primary ${
          fields.accountId?.length > 0 && fields.permissions?.length > 0
            ? ""
            : "disabled"
        }`}
        onClick={onSubmit}
      >
        Submit
      </div>
    </div>
  </FormFields>
);
