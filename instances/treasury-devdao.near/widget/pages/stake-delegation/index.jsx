const { hasPermission } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
) || {
  hasPermission: () => {},
};

const { selectedTab, instance } = props;

if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const [showStakeRequest, setShowStakeRequest] = useState(false);
const [showUnStakeRequest, setShowUnStakeRequest] = useState(false);
const createBtnOption = {
  STAKE: "CreateStakeRequest",
  UNSTAKE: "CreateUnstakeRequest",
};
const [isCreateBtnOpen, setCreateBtnOpen] = useState(false);
const [selectedCreatePage, setSelectedCreatePage] = useState(
  createBtnOption.STAKE
);

const hasCreatePermission = hasPermission(
  treasuryDaoID,
  context.accountId,
  "call",
  "AddProposal"
);

const CreateBtn = () => {
  const btnOptions = [
    {
      label: "Stake",
      icon: "${REPL_STAKE_ICON}",
      value: createBtnOption.STAKE,
      onClick: () => {
        setShowStakeRequest(true);
        setCreateBtnOpen(false);
      },
    },
    {
      label: "Unstake",
      icon: "${REPL_UNSTAKE_ICON}",
      value: createBtnOption.UNSTAKE,
      onClick: () => {
        setShowUnStakeRequest(true);
        setCreateBtnOpen(false);
      },
    },
  ];

  const toggleDropdown = () => {
    setCreateBtnOpen(!isCreateBtnOpen);
  };

  const DropdowntBtnContainer = styled.div`
  font-size: 13px;
  min-width: 150px;

  .custom-select {
    position: relative;
  }

  .select-header {
    color:white;
    display: flex;
    justify-content: space-between;
    cursor: pointer;
    background-color: #2C3E50;
    border-radius: 5px;
  }

  .no-border {
    border: none !important;
  }

  .options-card {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    border: 1px solid #ccc;
    background-color: #fff;
    padding: 0.5rem;
    z-index: 99;
    font-size: 13px;
    border-radius:0.375rem !important;
  }

  .left {
    right: 0 !important;
    left: auto !important;
  }

  @media screen and (max-width: 768px) {
    .options-card {
      right: 0 !important;
      left: auto !important;
    }
  }

  .option {
    margin-block: 5px;
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.3s ease;
    border-radius: 0.375rem !important;
  }

  .option:hover {
    background-color: #f0f0f0; /* Custom hover effect color */
  }

  .option:last-child {
    border-bottom: none;
  }

  .selected {
    background-color: #f0f0f0;
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
        className="custom-select"
        tabIndex="0"
        onBlur={() => setCreateBtnOpen(false)}
      >
        <div className={"select-header d-flex gap-1 align-items-center h-100"}>
          <div
            className="d-flex gap-2 align-items-center h6 mb-0"
            style={{ padding: "0.8rem" }}
            onClick={() => {
              setShowStakeRequest(true);
            }}
          >
            <i class="bi bi-plus-lg h5 mb-0"></i>Create Request
          </div>
          <div
            className="h-100 d-flex"
            style={{ borderLeft: "1px solid white" }}
            onClick={toggleDropdown}
          >
            <i
              class={`p-2 bi bi-chevron-${isCreateBtnOpen ? "up" : "down"}`}
            ></i>
          </div>
        </div>

        {isCreateBtnOpen && (
          <div className="options-card">
            {btnOptions.map((option) => (
              <div
                key={option.value}
                className={`option`}
                onClick={option.onClick}
              >
                <div className={`d-flex gap-2 align-items-center text-black`}>
                  <img src={option.icon} height={20} />
                  <div className="fw-bold">{option.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DropdowntBtnContainer>
  );
};

const SidebarMenu = ({ currentTab }) => {
  return (
    <div
      className="d-flex gap-2 align-items-center"
      style={{ paddingBottom: "7px" }}
    >
      {hasCreatePermission && <CreateBtn />}
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.SettingsDropdown`}
        props={{ isPendingPage: currentTab.title === "Pending Requests" }}
      />
    </div>
  );
};

function toggleStakePage() {
  setShowStakeRequest(!showStakeRequest);
}

function toggleUnStakePage() {
  setShowUnStakeRequest(!showUnStakeRequest);
}

const Container = styled.div`
  .flex-1 {
    flex: 1;
  }
`;

return (
  <Container>
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showStakeRequest,
        onClose: toggleStakePage,
        title: "Create Stake Request",
        children: (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateStakeRequest`}
            props={{
              instance,
              onCloseCanvas: toggleStakePage,
            }}
          />
        ),
      }}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.OffCanvas`}
      props={{
        showCanvas: showUnStakeRequest,
        onClose: toggleUnStakePage,
        title: "Create Unstake Request",
        children: (
          <Widget
            src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.CreateUnstakeRequest`}
            props={{
              instance,
              onCloseCanvas: toggleUnStakePage,
            }}
          />
        ),
      }}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Tabs`}
      props={{
        ...props,
        tabs: [
          {
            title: "Pending Requests",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.PendingRequests`,
            props: props,
          },
          {
            title: "History",
            href: `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.stake-delegation.History`,
            props: props,
          },
        ],
        SidebarMenu: SidebarMenu,
      }}
    />
  </Container>
);
