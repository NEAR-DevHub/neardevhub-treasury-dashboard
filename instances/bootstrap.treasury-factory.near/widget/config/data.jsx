const widgetSrc = context.widgetSrc
  ? context.widgetSrc
  : "testing-app2.near/widget/app";
const instance = widgetSrc.split("/")[0];
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
  ],
  treasuryDaoID,
  instance,
  showProposalSelection: false,
  showKYC: false,
  showReferenceProposal: false,
};
