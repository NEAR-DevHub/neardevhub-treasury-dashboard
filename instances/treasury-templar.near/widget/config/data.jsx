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
  showThresholdConfiguration: false,
  logo: (
    <img
      src="https://github.com/user-attachments/assets/a1a33023-42ef-4e60-83d9-d93c71412404"
      style={{ height: 40, width: 40 }}
    />
  ),
};
