const treasuryDaoID = "${REPL_TREASURY}";
function getTransferApproversAndThreshold() {
  const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
  const groupWithTransferPermission = (daoPolicy.roles ?? []).filter((role) => {
    const transferPermissions = [
      "*:*",
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
  let ratios = [];
  groupWithTransferPermission.map((i) => {
    approversGroup = approversGroup.concat(i.kind.Group);
    if (i.vote_policy["transfer"].weight_kind === "RoleWeight") {
      ratios = ratios.concat(i.vote_policy["transfer"].threshold);
      ratios = ratios.concat(i.vote_policy["transfer"].threshold);
    }
  });

  let numerator = 0;
  let denominator = 0;

  if (ratios.length > 0) {
    ratios.forEach((value, index) => {
      if (index == 0 || index % 2 === 0) {
        // Even index -> numerator
        numerator += value;
      } else {
        // Odd index -> denominator
        denominator += value;
      }
    });
  } else {
    numerator = 1;
    denominator = 2;
  }

  return {
    approverAccounts: approversGroup,
    threshold: numerator / denominator,
  };
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
    const uniqueFilteredProposals = Array.from(
      new Map(filteredProposals.map((item) => [item.id, item])).values()
    );
    const newArray = uniqueFilteredProposals.slice(0, resPerPage);
    if (reverse) {
      newArray.reverse();
    }
    return {
      filteredProposals: newArray,
      totalLength: filteredProposals.length,
    };
  });
}

const data = fetch(`https://httpbin.org/headers`);
const gatewayOrigin = data?.body?.headers?.Origin ?? "";

const isNearSocial =
  gatewayOrigin.includes("near.social") ||
  gatewayOrigin.includes("127.0.0.1:8080");

return {
  getTransferApproversAndThreshold,
  getFilteredProposalsByStatusAndkind,
  isNearSocial,
};
