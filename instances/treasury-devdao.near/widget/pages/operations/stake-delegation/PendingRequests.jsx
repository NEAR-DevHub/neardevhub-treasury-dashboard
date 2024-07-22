const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};

const createBtnOption = {
  STAKE: "CreateStakeRequest",
  UNSTAKE: "CreateUnstakeRequest",
};
const [isCreateBtnOpen, setCreateBtnOpen] = useState(false);
const [selectedCreatePage, setSelectedCreatePage] = useState(
  createBtnOption.STAKE
);

const CreateBtn = () => {
  const btnOptions = [
    {
      label: "Staking Request",
      icon: "${REPL_STAKE_ICON}",
      value: createBtnOption.STAKE,
    },
    {
      label: "Unstaking Request",
      icon: "${REPL_UNSTAKE_ICON}",
      value: createBtnOption.UNSTAKE,
    },
  ];

  const toggleDropdown = () => {
    setCreateBtnOpen(!isCreateBtnOpen);
  };

  const selectedOption = btnOptions.find((i) => i.value === selectedCreatePage);

  const DropdowntBtnContainer = styled.div`
  font-size: 13px;
  min-width: 150px;

  .custom-select {
    position: relative;
  }

  .select-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #ccc;
    border-radius-top: 5px;
    cursor: pointer;
    background-color: #fff;
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
        <div
          className={
            "select-header d-flex gap-1 align-items-center submit-draft-button"
          }
        >
          <div
            onClick={() => handleSubmit(selectedCreatePage)}
            className="d-flex gap-2 align-items-center h6 mb-0"
            style={{ padding: "0.8rem" }}
          >
            <i class="bi bi-plus-circle-fill"></i>Create Request
          </div>
          <div
            className="h-100 p-2"
            style={{ borderLeft: "1px solid #ccc" }}
            onClick={toggleDropdown}
          >
            <i class={`bi bi-chevron-${isCreateBtnOpen ? "up" : "down"}`}></i>
          </div>
        </div>

        {isCreateBtnOpen && (
          <div className="options-card">
            {btnOptions.map((option) => (
              <div
                key={option.value}
                className={`option ${
                  selectedOption.value === option.value ? "selected" : ""
                }`}
              >
                <Link
                  to={href({
                    widgetSrc: `${REPL_TREASURY}/widget/app`,
                    params: {
                      page: "operations",
                      tab: "stake-delegation",
                      innerPage: option.value,
                    },
                  })}
                >
                  <div className={`d-flex gap-2 align-items-center text-black`}>
                    <img src={option.icon} height={20} />
                    <div className="fw-bold">{option.label}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DropdowntBtnContainer>
  );
};

return (
  <div className="d-flex flex-column gap-3">
    <div className="d-flex justify-content-between">
      <h5>Pending Requests</h5>
      <div>
        <CreateBtn />
      </div>
    </div>
  </div>
);
