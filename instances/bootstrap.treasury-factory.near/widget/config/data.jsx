const sputnikAccount =
  context.widgetSrc?.split("/")[0].split(".near")[0] ??
  "testing-astradao" + "sputnik-dao.near";
return {
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
  treasuryDaoID: sputnikAccount,
  showProposalSelection: false,
  showKYC: false,
  showReferenceProposal: false,
};
