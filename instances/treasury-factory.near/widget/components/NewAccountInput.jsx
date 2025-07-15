const { onChange, defaultValue, postfix, placeholder, label, id } = props;

const [value, setValue] = useState("");
const [show, setShow] = useState(false);

useEffect(() => {
  if (value !== defaultValue) {
    setValue(defaultValue);
  }
}, [defaultValue]);

return (
  <div className="account-field position-relative d-flex flex-column">
    {label && (
      <div className="d-flex gap-1 align-items-center">
        <label className="fw-semibold mb-1" for={id}>
          {label}
        </label>
      </div>
    )}
    <input
      id={id}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        setValue(v);
        onChange(v);
      }}
    />
    {postfix && (
      <div
        style={{
          position: "absolute",
          right: "0px",
          borderLeft: "1px solid var(--bs-border-color)",
        }}
        className="py-2 px-3"
      >
        {postfix}
      </div>
    )}
  </div>
);
