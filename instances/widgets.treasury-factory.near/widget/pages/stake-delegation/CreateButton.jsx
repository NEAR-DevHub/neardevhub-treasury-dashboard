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
const { setToastStatus, setVoteProposalId } = props;

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "call",
  "AddProposal"
);

const [showStakeRequest, setShowStakeRequest] = useState(false);
const [showUnStakeRequest, setShowUnStakeRequest] = useState(false);
const [showWithdrawRequest, setShowWithdrawRequest] = useState(false);
const createBtnOption = {
  STAKE: "CreateStakeRequest",
  UNSTAKE: "CreateUnstakeRequest",
  WITHDRAW: "CreateWithdrawRequest",
};
const [isCreateBtnOpen, setCreateBtnOpen] = useState(false);
const [selectedCreatePage, setSelectedCreatePage] = useState(
  createBtnOption.STAKE
);

function toggleStakePage() {
  setShowStakeRequest((prev) => !prev);
}

function toggleUnStakePage() {
  setShowUnStakeRequest((prev) => !prev);
}

function toggleWithdrawPage() {
  setShowWithdrawRequest((prev) => !prev);
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
    {
      label: "Unstake",
      icon: <UnstakeIcon />,
      value: createBtnOption.UNSTAKE,
      onClick: () => {
        setShowStakeRequest(false);
        setShowUnStakeRequest(true);
        setCreateBtnOpen(false);
      },
    },
    {
      label: "Withdraw",
      icon: <WithdrawIcon />,
      value: createBtnOption.WITHDRAW,
      onClick: () => {
        setShowWithdrawRequest(true);
        setCreateBtnOpen(false);
      },
    },
  ];

  const DropdowntBtnContainer = styled.div`
    font-size: 13px;
    width: fit-content;
  
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
    <DropdowntBtnContainer>
      <div
        className="custom-select "
        tabIndex="0"
        onBlur={() => setCreateBtnOpen(false)}
      >
        <div
          className={"dropdown btn primary-button d-flex align-items-center"}
        >
          <div className="d-flex gap-2 align-items-center ">
            <i class="bi bi-plus-lg h5 mb-0"></i>
            <span className="responsive-text">Create Request</span>
          </div>
        </div>

        <div
          className={`dropdown-menu dropdown-menu-end px-2 shadow ${
            isCreateBtnOpen ? "show" : ""
          }`}
          style={{ right: 0, left: "auto" }}
        >
          {btnOptions.map((option) => (
            <div
              key={option.value}
              className="dropdown-item cursor-pointer py-2"
              onClick={option.onClick}
            >
              <div className="d-flex gap-2 align-items-center">
                {option.icon}
                <div>{option.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DropdowntBtnContainer>
  );
};

return (
  <div>
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showStakeRequest,
        onClose: toggleStakePage,
        title: "Create Stake Request",
        children: (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateStakeRequest`}
            props={{
              instance,
              onCloseCanvas: toggleStakePage,
              setToastStatus,
              setVoteProposalId,
            }}
          />
        ),
      }}
    />
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showUnStakeRequest,
        onClose: toggleUnStakePage,
        title: "Create Unstake Request",
        children: (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateUnstakeRequest`}
            props={{
              instance,
              onCloseCanvas: toggleUnStakePage,
              setToastStatus,
              setVoteProposalId,
            }}
          />
        ),
      }}
    />
    <Widget
      loading=""
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showWithdrawRequest,
        onClose: toggleWithdrawPage,
        title: "Create Withdraw Request",
        children: (
          <Widget
            loading=""
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateWithdrawRequest`}
            props={{
              instance,
              onCloseCanvas: toggleWithdrawPage,
              setToastStatus,
              setVoteProposalId,
            }}
          />
        ),
      }}
    />

    <div className="d-flex gap-2 align-items-center">
      {hasCreatePermission && (
        <Widget
          loading=""
          src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.InsufficientBannerModal`}
          props={{
            ActionButton: CreateBtn,
            checkForDeposit: true,
            treasuryDaoID,
            callbackAction: toggleDropdown,
          }}
        />
      )}
    </div>
  </div>
);
