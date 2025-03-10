const { StakeIcon, UnstakeIcon, WithdrawIcon } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Icons"
) || {
  StakeIcon: () => <></>,
  UnstakeIcon: () => <></>,
  WithdrawIcon: () => <></>,
};

const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { isPendingPage, instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "call",
  "AddProposal"
);

const [showStakeRequest, setShowStakeRequest] = useState(false);
const createBtnOption = { STAKE: "CreateStakeRequest" };
const [isCreateBtnOpen, setCreateBtnOpen] = useState(false);
const [selectedCreatePage, setSelectedCreatePage] = useState(
  createBtnOption.STAKE
);

function toggleStakePage() {
  setShowStakeRequest((prev) => !prev);
}

const toggleDropdown = () => {
  setCreateBtnOpen((prev) => !prev);
};

const CreateBtn = () => {
  const btnOptions = [
    {
      label: "Stake",
      icon: <StakeIcon />,
      value: createBtnOption.STAKE,
      onClick: () => {
        setShowUnStakeRequest(false);
        setShowStakeRequest(true);
        setCreateBtnOpen(false);
      },
    },
  ];

  const DropdowntBtnContainer = styled.div`
    font-size: 13px;
    min-width: 150px;
  
    .custom-select {
      position: relative;
    }
  
    .select-header {
      display: flex;
      justify-content: space-between;
      cursor: pointer;
      border-radius: 5px;
    }
  
    .no-border {
      border: none !important;
    }
  
    .left {
      right: 0 !important;
      left: auto !important;
    }

    .selected {
      background-color: var(--grey-04);
    }
  
    .disabled {
      background-color: #f4f4f4 !important;
      cursor: not-allowed !important;
      font-weight: 500;
      color: #b3b3b3;
    }
  
    .grey {
      background-color: #818181;
    }
  
    a:hover {
      text-decoration: none;
    }
  }
  `;

  return (
    <div
      className={"btn primary-button d-flex align-items-center"}
      onClick={() => {
        setShowStakeRequest(true);
        setCreateBtnOpen(false);
      }}
    >
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
        showCanvas: showStakeRequest,
        onClose: toggleStakePage,
        title: "Create Lockup",
        children: (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.CreateRequest`}
            props={{
              instance,
              onCloseCanvas: toggleStakePage,
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
            callbackAction: toggleDropdown,
          }}
        />
      )}
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.SettingsDropdown`}
        props={{ isPendingPage: currentTab.title === "Pending Requests" }}
      />
    </div>
  </div>
);
