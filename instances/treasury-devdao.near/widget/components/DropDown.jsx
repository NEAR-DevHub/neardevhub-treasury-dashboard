const options = props.options; // [{label:"",value:""}]
const onUpdate = props.onUpdate ?? (() => {});
const selectedValue = props.selectedValue;
const disabled = props.disabled;
const [selected, setSelected] = useState(selectedValue);
const DropdownItemRender = props.DropdownItemRender;

useEffect(() => {
  if (JSON.stringify(selected) !== JSON.stringify(selectedValue)) {
    setSelected(selectedValue);
  }
}, [selectedValue]);

const StyledDropdown = styled.div`
  .drop-btn {
    width: 100%;
    text-align: left;
    padding-inline: 10px;
  }

  .dropdown-toggle:after {
    position: absolute;
    top: 45%;
    right: 5%;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .text-sm {
    font-size: 12px !important;
  }

  .work-break {
    border-radius: 5px;
    white-space: normal;
    word-break: break-word;
  }
`;

useEffect(() => {
  onUpdate(selected);
}, [selected]);

return (
  <StyledDropdown>
    <div className="dropdown w-100" data-testid="dropdown">
      <button
        disabled={disabled}
        className="btn drop-btn text-truncate dropdown-toggle bg-dropdown border rounded-2"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        data-testid="dropdown-btn"
      >
        {selected.label}
      </button>
      <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2 shadow w-100">
        {options.map((item) =>
          DropdownItemRender ? (
            <DropdownItemRender
              item={item}
              setSelected={setSelected}
              selected={selected}
            />
          ) : (
            <li
              className="dropdown-item cursor-pointer link-underline link-underline-opacity-0 work-break"
              onClick={() => {
                if (selected.label !== item.label) {
                  setSelected(item);
                }
              }}
            >
              {item.label}
            </li>
          )
        )}
      </ul>
      {selected?.description && (
        <div classNameName="text-secondary text-sm mt-1">
          {selected.description}
        </div>
      )}
    </div>
  </StyledDropdown>
);
