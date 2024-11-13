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
      title: "Settings",
      href: "?page=settings",
    },
  ],
  treasuryDaoID: "${REPL_TREASURY}",
  showProposalSelection: false,
  showKYC: false,
  showReferenceProposal: false,
  showThresholdConfiguration: true,
  logo: (
    <div className="d-flex align-items-center gap-2">
      <svg
        aria-hidden="true"
        focusable="false"
        role="img"
        width="106"
        height="20"
        viewBox="0 0 106 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="fill-accent"
      >
        <path d="M36.2988 3.25985V16.8847H33.4144V3.25985H36.2988Z"></path>
        <path d="M50.3562 3.25985V16.8847H48.1619L41.8969 8.55801V16.8847H39.0126V3.25985H41.2069L47.4719 11.5721V3.25985H50.3562Z"></path>
        <path d="M55.9544 5.8258V9.05674H61.6301V11.6227H55.9544V16.8775H53.07V3.25985H61.8007V5.8258H55.9544Z"></path>
        <path d="M66.794 3.25985V16.8847H63.9097V3.25985H66.794Z"></path>
        <path d="M80.8437 3.25985V16.8847H78.6494L72.3844 8.55801V16.8847H69.5001V3.25985H71.6944L77.9594 11.5721V3.25985H80.8437Z"></path>
        <path d="M92.5983 14.3115V16.8775H83.5575V3.25985H92.4898V5.8258H86.4341V8.72425H91.9703V11.2541H86.4341V14.3115H92.5983Z"></path>
        <path d="M102.477 16.8775L99.6386 12.4395L96.8008 16.8775H93.5443L98.0104 9.88797L93.7691 3.25262H97.0257L99.6386 7.33647L102.252 3.25262H105.508L101.267 9.86628L105.756 16.8703H102.477V16.8775Z"></path>
        <path d="M17.6202 5.97759V20H0.244141V0H5.04367V3.24539H3.57823V16.8919H14.2861V5.97759H17.6202Z"></path>
        <path d="M24.6993 0V20H19.8997V16.8919H21.3652V3.10806H10.6496V14.0224H7.3155V0H24.6993Z"></path>
      </svg>
      <h6 className="mb-0">Testing</h6>
    </div>
  ),
};
