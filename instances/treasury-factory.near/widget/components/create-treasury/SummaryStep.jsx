const { formFields } = props;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  border-bottom: ${(props) => (props.withBorder ? "1px solid #E2E6EC" : "0")};

  label {
    font-size: 12px;
    color: #999999;
    margin-bottom: 5px;
  }

  i {
    font-size: 18px;
    color: #060606;
  }
`;

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

function createDao() {
  // Near.call(...)
  retutn;
}

const ListItem = ({ member }) => (
  <Item className="d-flex align-items-center w-100">
    <div className="w-50">
      <Widget
        src="mob.near/widget/Profile.ShortInlineBlock"
        props={{
          accountId: member.accountId,
        }}
      />
    </div>

    <div className="d-flex gap-2 align-items-center">
      {member.permissions.map((permission, i) => (
        <Badge key={i}>{permission}</Badge>
      ))}
    </div>
  </Item>
);

return (
  <div className="d-flex flex-column w-100 gap-3">
    <h3>Summary</h3>

    <div>
      <h4>General</h4>
      <Section withBorder>
        <label>Your Wallet</label>
        <Widget
          src="mob.near/widget/Profile.ShortInlineBlock"
          props={{
            accountId: context.accountId,
          }}
        />
      </Section>
    </div>

    <div>
      <Section withBorder>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <label>Applicatiion Account name</label>
            <div>
              {formFields.accountName ? `${formFields.accountName}.near` : "-"}
            </div>
          </div>
          <Link
            href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=1`}
          >
            <i className="bi bi-pencil" />
          </Link>
        </div>
      </Section>

      <Section>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <label>Sputnik Account Name</label>
            <div>
              {formFields.sputnikAccountName
                ? `${formFields.sputnikAccountName}.sputnik-dao.near`
                : "-"}
            </div>
          </div>
          <Link
            href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=2`}
          >
            <i className="bi bi-pencil" />
          </Link>
        </div>
      </Section>
    </div>

    <Section>
      <div className="d-flex justify-content-between align-items-center">
        <h4>Members and permissions</h4>
        <Link
          href={`/${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/app?page=create-treasury&step=3`}
        >
          <i className="bi bi-pencil" />
        </Link>
      </div>
      {formFields.members && (
        <Section>
          <div className="d-flex flex-column w-100">
            {formFields.members.map((member, i) => (
              <ListItem key={i} member={member} />
            ))}
          </div>
        </Section>
      )}
    </Section>

    <button
      className="btn btn-primary w-100"
      onClick={createDao}
      disabled={
        !formFields.members ||
        !formFields.sputnikAccountName ||
        !formFields.accountName
      }
    >
      Confirm and Create
    </button>
  </div>
);
