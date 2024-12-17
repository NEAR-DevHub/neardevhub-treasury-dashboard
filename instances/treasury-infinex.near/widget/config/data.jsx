return {
  appName: "Treasury",
  navbarLinks: [
    {
      title: "Dashboard",
      href: "?page=dashboard",
    },
    {
      title: "Payments",
      href: "?page=payments",
    },
    {
      title: "Stake Delegation",
      href: "?page=stake-delegation",
    },
    {
      title: "Settings",
      href: "?page=settings",
    },
  ],
  treasuryDaoID: "${REPL_TREASURY}",
  showProposalSelection: false,
  showKYC: false,
  showReferenceProposal: false,
  logo: (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32.0857 17.5643V40.0002H4.80139V8.00018H12.3377V13.1928H10.0366V35.0274H26.8504V17.5643H32.0857Z"
        fill="#F76218"
      />
      <path
        d="M43.2014 8.00018V40.0002H35.6651V35.0274H37.9662V12.9731H21.1403V30.436H15.905V8.00018H43.2014Z"
        fill="#F76218"
      />
    </svg>
  ),
  lockupContract: "77fa9d86aca49e758a4cb72628972a0f3135d168.lockup.near",
};
