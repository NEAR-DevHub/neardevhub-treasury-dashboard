return {
  appName: "Templar",
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
    {
      title: "Lockup",
      href: "?page=lockup",
    },
  ],
  treasuryDaoID: "${REPL_TREASURY}",
  showProposalSelection: false,
  showKYC: false,
  showReferenceProposal: false,
  logo: (
    <img
      src="https://github.com/user-attachments/assets/d1d3da13-452a-4501-bdc6-f906598dd5a4"
      style={{ height: 40, width: 40 }}
    />
  ),
  themeColor: "#8942d9",
};
