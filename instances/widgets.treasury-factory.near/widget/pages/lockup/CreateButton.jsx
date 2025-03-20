const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { isPendingPage, instance } = props;

if (!instance) return <></>;

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "call",
  "AddProposal"
);

const [showCanvas, setShowCanvas] = useState(false);

const CreateBtn = () => {
  return (
    <div className={"btn primary-button d-flex align-items-center"}>
      <div className="d-flex gap-2 align-items-center ">
        <i class="bi bi-plus-lg h5 mb-0"></i>Create Request
      </div>
    </div>
  );
};

return (
  <div>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas,
        onClose: () => setShowCanvas(false),
        title: "Create Lockup Request",
        children: (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.CreateRequest`}
            props={{
              instance,
              onCloseCanvas: () => setShowCanvas(false),
            }}
          />
        ),
      }}
    />

    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "16px" }}
    >
      {hasCreatePermission && (
        <Widget
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
          props={{
            ActionButton: CreateBtn,
            checkForDeposit: true,
            treasuryDaoID,
            callbackAction: () => setShowCanvas(true),
          }}
        />
      )}
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.SettingsDropdown`}
        props={{ isPendingPage }}
      />
    </div>
  </div>
);
