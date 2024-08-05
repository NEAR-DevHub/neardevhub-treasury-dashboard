const treasuryDaoID = "aurorafinance.sputnik-dao.near";
function getTransferApproversGroup() {
  const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
  const groupWithTransferPermission = (daoPolicy.roles ?? []).filter((role) => {
    const transferPermissions = [
      "transfer:*",
      "transfer:VoteApprove",
      "transfer:VoteReject",
      "transfer:VoteRemove",
      "*:VoteApprove",
      "*:VoteReject",
      "*:VoteRemove",
    ];
    return (role?.permissions ?? []).some((i) =>
      transferPermissions.includes(i)
    );
  });

  let approversGroup = [];
  groupWithTransferPermission.map(
    (i) => (approversGroup = approversGroup.concat(i.kind.Group))
  );
  return approversGroup;
}

const filterFunction = (item, filterStatusArray, filterKindArray) => {
  const kind =
    typeof item.kind === "string" ? item.kind : Object.keys(item.kind)[0];
  if (filterStatusArray.length > 0 && filterKindArray.length > 0) {
    return (
      filterStatusArray.includes(item.status) && filterKindArray.includes(kind)
    );
  } else if (filterKindArray.length > 0) {
    return filterKindArray.includes(kind);
  } else if (filterStatusArray.length > 0) {
    return filterStatusArray.includes(item.status);
  }
  return true;
};

function getFilteredProposalsByStatusAndkind({
  resPerPage,
  reverse,
  filterKindArray,
  filterStatusArray,
  offset,
  lastProposalId,
}) {
  let newLastProposalId = offset ?? 0;
  let filteredProposals = [];
  const limit = 30;
  if (reverse && !offset) {
    newLastProposalId = lastProposalId;
  }
  const promiseArray = [];
  while (
    (reverse && newLastProposalId > 0) ||
    (!reverse && newLastProposalId < lastProposalId)
  ) {
    promiseArray.push(
      Near.asyncView(treasuryDaoID, "get_proposals", {
        from_index:
          newLastProposalId - limit > 0 ? newLastProposalId - limit : 0,
        limit: limit,
      })
    );
    if (reverse) {
      newLastProposalId -= limit;
    } else {
      newLastProposalId += limit;
    }
  }
  return Promise.all(promiseArray).then((res) => {
    const proposals = [].concat(...res);
    filteredProposals = proposals.filter((item) =>
      filterFunction(item, filterStatusArray, filterKindArray)
    );
    const newArray = filteredProposals.slice(0, resPerPage);
    if (reverse) {
      newArray.reverse();
    }
    return {
      filteredProposals: newArray,
      totalLength: filteredProposals.length,
    };
  });
}

return {
  getTransferApproversGroup,
  getFilteredProposalsByStatusAndkind,
};
