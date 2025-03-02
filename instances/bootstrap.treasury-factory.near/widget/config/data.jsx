const instance = `${REPL_BOOTSTRAP_ACCOUNT}`;
const treasuryDaoID = instance.split(".near")[0] + ".sputnik-dao.near";

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
    {
      title: "Lockup",
      href: "?page=lockup",
    },
  ],
  treasuryDaoID,
  instance,
  showProposalSelection: false,
  showKYC: false,
  showReferenceProposal: false,
};
