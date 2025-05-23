const { selectedValue, onChange, disabled, isPendingPage } = props;

onChange = onChange || (() => {});

const columnsVisibility = JSON.parse(
  Storage.get(
    "COLUMNS_VISIBILITY",
    `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.lockup.SettingsDropdown`
  ) ?? "[]"
);

function changeColumnsVisibility(value) {
  Storage.set("COLUMNS_VISIBILITY", JSON.stringify(value));
}

const baseColumns = [
  { title: "Created At", show: true },
  { title: "Recipient Account", show: true },
  { title: "Amount", show: true },
  { title: "Start Date", show: true },
  { title: "End Date", show: true },
  { title: "Cliff Date", show: true },
  { title: "Allow Cancellation", show: true },
  { title: "Allow Staking", show: true },
  { title: "Required Votes", show: true },
  { title: "Approvers", show: true },
];

const [settingsOptions, setSettingsOptions] = useState(
  columnsVisibility.length ? columnsVisibility : baseColumns
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

  .custom-select {
    position: relative;
  }
`;

const Item = ({ option }) => {
  return (
    <div
      className={"d-flex align-items-center w-100 justify-content-between "}
      style={{ opacity: option.show ? "1" : "0.3" }}
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
        className={"dropdown-toggle btn btn-outline-secondary "}
        onClick={toggleDropdown}
      >
        <i class="bi bi-gear"></i>
      </div>

      {isOpen && (
        <div className="dropdown-menu rounded-2 dropdown-menu-end dropdown-menu-lg-start px-2 shadow show w-100">
          <div>
            <div className="text-secondary text-sm">Shown in table</div>
            {settingsOptions.map((option) => {
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
