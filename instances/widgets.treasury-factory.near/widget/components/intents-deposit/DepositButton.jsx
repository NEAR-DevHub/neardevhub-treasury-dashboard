const { href } = VM.require("${REPL_DEVHUB}/widget/core.lib.url") || {
  href: () => {},
};
const { instance } = props;

const options = [
  {
    label: "Sputnik DAO",
    description: "Manage tokens: payments, staking, swaps & lockups",
    value: "sputnik-dao",
  },
  {
    label: "Intents",
    description: "Cross-chain tokens & payments only",
    value: "intents",
  },
];

return (
  <div className="dropdown w-100">
    <button
      className="btn theme-btn w-100"
      type="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      data-testid="intents-deposit-btn"
    >
      Deposit
    </button>
    <ul className="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2 shadow w-100">
      {options.map((item) => (
        <a
          href={href({
            widgetSrc: `${instance}/widget/app`,
            params: {
              page: "dashboard",
              deposit: item.value,
            },
          })}
          rel="noopener noreferrer"
          className="dropdown-item cursor-pointer py-2"
        >
          {item.label}

          <div className="text-secondary text-sm mt-1">{item.description}</div>
        </a>
      ))}
    </ul>
  </div>
);
