const { formFields } = props;
const { Copy } = VM.require(
  "${REPL_DEVDAO_ACCOUNT}/widget/components.Icons"
) || {
  Copy: () => <></>,
};
const storageAccountName = Storage.get(
  "TreasuryAccountName",
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.treasury.Create`
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
        <Copy />
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
`;

return (
  <Container className="d-flex flex-column gap-4 align-items-center">
    <img
      src="https://ipfs.near.social/ipfs/bafkreieelunmk6hppzvaobpq26bspqk2pcybek35us7p4cjd2lvnomppbe"
      height={50}
      width={50}
    />
    <div className="text-center">
      <h5 className="text-center">Congratulations! Your Treasury is ready</h5>
      <p className="text-sm mb-0">
        You can access and manage your treasury using any of these gateways.
      </p>
    </div>
    <div className="card w-100 d-flex flex-column gap-4 border-0">
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
      </div>
    </div>
  </Container>
);
