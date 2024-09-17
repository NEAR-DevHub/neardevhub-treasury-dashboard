const { selectedValue, onChange, disabled, isPendingPage } = props;

onChange = onChange || (() => {});

const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBLILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.asset-exchange.SettingsDropdown`
  ) ?? "[]"
);

function changeColumnsVisibility(value) {
  Storage.set("COLUMNS_VISIBLILITY", JSON.stringify(value));
}

const [settingsOptions, setSettingsOptions] = useState(
  columnsVisibility.length
    ? columnsVisibility
    : [
        {
          title: "Created Date",
          show: true,
        },
        {
          title: "Send",
          show: true,
        },
        {
          title: "Receive",
          show: true,
        },
        {
          title: "Slippage Limit",
          show: true,
        },
        {
          title: "Creator",
          show: true,
        },
        {
          title: "Notes",
          show: true,
        },
        {
          title: "Required Votes",
          show: true,
        },
        {
          title: "Votes",
          show: true,
        },
        {
          title: "Approvers",
          show: true,
        },
        {
          title: "Expiring Date",
          show: true,
        },
      ]
);

const [isOpen, setIsOpen] = useState(false);

const toggleDropdown = () => {
  setIsOpen(!isOpen);
};

const handleOptionClick = (option) => {
  const newOptions = [...settingsOptions];
  const index = newOptions.findIndex((i) => i.title === option.title);
  newOptions[index].show = !newOptions[index].show;
  setSettingsOptions(newOptions);
  changeColumnsVisibility(newOptions);
};

const Container = styled.div`
  .dropdown-toggle:after {
    display: none;
  }

  .dropdown-menu {
    position: absolute;
    top: 110%;
    right: 0;
    min-width: 220px;
    z-index: 9999;
  }

  .dropdown-item.active,
  .dropdown-item:active {
    background-color: #f0f0f0 !important;
    color: black;
  }

  .custom-select {
    position: relative;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .text-grey {
    color: #b3b3b3;
  }

  .text-sm {
    font-size: 13px;
  }
`;

const Item = ({ option }) => {
  return (
    <div
      className={
        "d-flex align-items-center w-100 justify-content-between " +
        (option.show ? "text-black" : "text-grey")
      }
    >
      <div className="h6 mb-0"> {option.title}</div>
      <div>
        <i class="bi bi-eye h5"></i>
      </div>
    </div>
  );
};

return (
  <Container>
    <div
      className="custom-select w-100"
      tabIndex="0"
      onBlur={() => setIsOpen(false)}
    >
      <div
        className={"dropdown-toggle btn-outline-plain "}
        onClick={toggleDropdown}
      >
        <i class="bi bi-gear"></i>
      </div>

      {isOpen && (
        <div className="dropdown-menu rounded-2 dropdown-menu-end dropdown-menu-lg-start px-2 shadow show w-100">
          <div>
            <div className="text-muted text-sm">Shown in table</div>
            {settingsOptions.map((option) => {
              // hide certain items for history page
              if (
                !isPendingPage &&
                (option.title === "Expiring Date" ||
                  option.title === "Required Votes" ||
                  option.title === "Votes")
              ) {
                return;
              }
              return (
                <div
                  key={option.title}
                  className={`dropdown-item cursor-pointer w-100 my-1`}
                  onClick={() => handleOptionClick(option)}
                >
                  <Item option={option} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </Container>
);
