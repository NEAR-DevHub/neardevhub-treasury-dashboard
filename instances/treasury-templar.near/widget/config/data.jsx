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
      title: "Settings",
      href: "?page=settings",
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
};
