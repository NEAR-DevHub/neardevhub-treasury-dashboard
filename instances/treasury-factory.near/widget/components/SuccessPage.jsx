const { formFields } = props;
const storageAccountName = Storage.get(
  "TreasuryAccountName",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.create-treasury.SummaryStep`
);

const accountName = formFields.accountName ?? storageAccountName;

const AccountDisplay = ({ label, prefix, tooltipInfo, noBorder }) => {
  return (
    <div className="d-flex flex-column">
      <div className={!noBorder && "border-bottom"}>
        <div className="py-2 d-flex gap-1 align-items-center justify-content-between px-3">
          <div className="h6 mb-0">
            {label}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="tooltip">{tooltipInfo}</Tooltip>}
            >
              <i className="mx-1 bi bi-info-circle text-secondary" />
            </OverlayTrigger>
          </div>
          <div className="h6 mb-0 d-flex align-items-center">
            <div className="text-primary">{accountName}</div>
            <div>{prefix}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GatewayLink = ({ link, label }) => {
  return (
    <div className="d-flex gap-2 align-items-center flex-1">
      <div className="custom-tag rounded-3 text-sm w-25 text-center">
        {label}
      </div>
      <div className="custom-truncate flex-1">{link}</div>

      <div
        style={{ cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          clipboard.writeText(link);
        }}
      >
        <i className="bi bi-copy h6 mb-0"></i>
      </div>
      <a target="_blank" rel="noopener noreferrer" href={link}>
        <i className="bi bi-box-arrow-up-right h6 mb-0"></i>
      </a>
    </div>
  );
};

const Container = styled.div`
  .custom-tag {
    background-color: var(--grey-035);
    color: var(--text-color);
    padding: 3px;
  }

  .flex-1 {
    flex: 1;
  }

  .custom-truncate {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .btn-transparent {
    background: none;
    border: 1px solid var(--border-color);
    &:hover {
      background: none;
      border: 1px solid var(--border-color);
    }
  }

  .dropdown-toggle::after {
    display: none !important;
  }

  .dropdown-menu {
    background-color: var(--bg-page-color) !important;
    color: var(--text-color) !important;
  }
`;

const [dropdownOpen, setDropdownOpen] = useState(null);

function toggleDropdown() {
  setDropdownOpen(!dropdownOpen);
}

const AccountsToggle = () => {
  return (
    <div className="dropdown">
      <button
        className="btn btn-transparent dropdown-toggle"
        type="button"
        onClick={toggleDropdown}
      >
        <i className="bi bi-chevron-down h6 mb-0"></i>
      </button>
      {dropdownOpen && (
        <div className="dropdown-menu d-flex flex-column gap-2 p-3">
          <div className="text-sm">Select gateway</div>
          <GatewayLink link={`https://${accountName}.near.page`} label="Web4" />
          <GatewayLink
            link={`https://near.social/${accountName}.near/widget/app`}
            label="Near Social"
          />
          <GatewayLink
            link={`https://dev.near.org/${accountName}.near/widget/app`}
            label="Dev Near"
          />
        </div>
      )}
    </div>
  );
};

return (
  <Container className="d-flex flex-column gap-4 align-items-center mt-4">
    <img
      src="https://ipfs.near.social/ipfs/bafkreieelunmk6hppzvaobpq26bspqk2pcybek35us7p4cjd2lvnomppbe"
      height={50}
      width={50}
    />
    <div>
      <h3 className="text-center">Congrats! Your Treasury is ready</h3>
      <p>
        You can access and manage your treasury using any of these gateways.
      </p>
    </div>
    <div className="card card-body w-100 d-flex flex-column gap-4 ">
      <div className="border border-1 rounded-3 p-0">
        <AccountDisplay
          label={"NEAR"}
          prefix=".near"
          tooltipInfo="This NEAR account name will be used for the application's URL and other management purposes, not the actual account where the funds will be held."
        />
        <AccountDisplay
          label={"Sputnik DAO"}
          prefix=".sputnik-dao.near"
          tooltipInfo="This is the name of your treasury's account on the Sputnik DAO platform, where your funds will be held."
          noBorder
        />
      </div>
      <div className="d-flex gap-3 align-items-center">
        <a
          className="btn btn-primary w-100"
          href={`https://${accountName}.near.page`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Treasury
        </a>
        <AccountsToggle />
      </div>
    </div>
    <a
      href="?page=create-treasury"
      className="btn btn-transparent w-100"
      onClick={() => Storage.set("TreasuryAccountName", null)}
    >
      Create another Treasury
    </a>
  </Container>
);
