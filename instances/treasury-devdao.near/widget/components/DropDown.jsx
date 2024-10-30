const options = props.options; // [{label:"",value:""}]
const onUpdate = props.onUpdate ?? (() => {});
const selectedValue = props.selectedValue;
const disabled = props.disabled;
const [selected, setSelected] = useState(selectedValue);

const StyledDropdown = styled.div`
  .drop-btn {
    width: 100%;
    text-align: left;
    padding-inline: 10px;
  }

  .dropdown-item.active,
  .dropdown-item:active {
    background-color: #f0f0f0 !important;
    color: black;
  }

  .dropdown-toggle:after {
    position: absolute;
    top: 22%;
    right: 5%;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .text-sm {
    font-size: 12px !important;
  }

  .text-muted {
    color: rgba(153, 153, 153, 1);
  }
`;

useEffect(() => {
  onUpdate(selected);
}, [selected]);

return (
  <StyledDropdown>
    <div class="dropdown w-100" data-testid="dropdown">
      <button
        disabled={disabled}
        class="btn drop-btn text-truncate dropdown-toggle bg-white border rounded-2"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        data-testid="dropdown-btn"
      >
        {selected.label}
      </button>
      <ul class="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2 shadow w-100">
        {options.map((item) => (
          <li
            style={{ borderRadius: "5px" }}
            class="dropdown-item cursor-pointer link-underline link-underline-opacity-0"
            onClick={() => {
              if (selected.label !== item.label) {
                setSelected(item);
              }
            }}
          >
            {item.label}
          </li>
        ))}
      </ul>
      {selected?.description && (
        <div className="text-muted text-sm mt-1">{selected.description}</div>
      )}
    </div>
  </StyledDropdown>
);
