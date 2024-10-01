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
    // {
    //   title: "Stake Delegation",
    //   href: "?page=stake-delegation",
    // },
    // {
    //   title: "Asset Exchange",
    //   href: "?page=asset-exchange",
    // },
    {
      title: "Settings",
      href: "?page=settings",
    },
  ],
  treasuryDaoID: "${REPL_TREASURY}",
  proposalIndexerQueryName: "${REPL_PROPOSAL_FEED_INDEXER_QUERY_NAME}",
  proposalIndexerHasuraRole: "${REPL_X_HASURA_ROLE}",
  showProposalSelection: true,
  showKYC: true,
  showReferenceProposal: true,
};
