const { options, activeTab, onTabChange } = props;

return (
  <div className="d-flex align-items-center w-100">
    <div
      className="d-flex align-items-center rounded-3 w-100"
      style={{
        backgroundColor: "var(--grey-05)",
        padding: "4px",
        border: "1px solid var(--border-color)",
      }}
    >
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onTabChange(option.value)}
          className={`btn rounded-3 px-3 py-2 flex-1 ${
            activeTab === option.value
              ? "bg-white text-color shadow-sm border border-1"
              : "bg-transparent text-secondary border-0"
          }`}
          style={{
            fontSize: "14px",
            fontWeight: activeTab === option.value ? "500" : "400",
            transition: "all 0.2s ease",
            minWidth: "fit-content",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);
