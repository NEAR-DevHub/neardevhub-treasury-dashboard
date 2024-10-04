function getApproversAndThreshold(treasuryDaoID, kind) {
  const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
  const groupWithPermission = (daoPolicy.roles ?? []).filter((role) => {
    const transferPermissions = [
      "*:*",
      `${kind}:*`,
      `${kind}:VoteApprove`,
      `${kind}:VoteReject`,
      `${kind}:VoteRemove`,
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
  groupWithPermission.map((i) => {
    approversGroup = approversGroup.concat(i.kind.Group ?? []);
    if (i.vote_policy[kind].weight_kind === "RoleWeight") {
      ratios = ratios.concat(i.vote_policy[kind].threshold);
      ratios = ratios.concat(i.vote_policy[kind].threshold);
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
    approverAccounts: Array.from(new Set(approversGroup)),
    threshold: numerator / denominator,
  };
}

function getPolicyApproverGroup(treasuryDaoID) {
  const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
  const groupWithPermission = (daoPolicy.roles ?? []).filter((role) => {
    const policyPermissions = [
      "*:*",
      "policy:AddProposal",
      "policy:*",
      "policy:VoteApprove",
      "policy:VoteReject",
      "policy:VoteRemove",
      "*:VoteApprove",
      "*:VoteReject",
      "*:VoteRemove",
    ];
    return (role?.permissions ?? []).some((i) => policyPermissions.includes(i));
  });

  let approversGroup = [];
  groupWithPermission.map((i) => {
    approversGroup = approversGroup.concat(i.kind.Group ?? []);
  });

  return Array.from(new Set(approversGroup));
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

function getFilteredProposalsByStatusAndKind({
  treasuryDaoID,
  resPerPage,
  isPrevPageCalled,
  filterKindArray,
  filterStatusArray,
  offset,
  lastProposalId,
  currentPage,
  isAssetExchange,
  isStakeDelegation,
}) {
  let newLastProposalId = typeof offset === "number" ? offset : lastProposalId;
  let filteredProposals = [];
  const limit = 30;
  const promiseArray = [];

  if (isPrevPageCalled) {
    let startIndex = newLastProposalId;
    while (startIndex < lastProposalId) {
      promiseArray.push(
        Near.asyncView(treasuryDaoID, "get_proposals", {
          from_index: startIndex,
          limit: limit,
        })
      );
      startIndex += limit;
    }
  } else {
    while (newLastProposalId > 0) {
      promiseArray.push(
        Near.asyncView(treasuryDaoID, "get_proposals", {
          from_index:
            newLastProposalId - limit > 0 ? newLastProposalId - limit : 0,
          limit: offset > 0 && offset < limit ? offset : limit,
        })
      );
      newLastProposalId -= limit;
    }
  }

  const checkForExchangeProposals = (item) => {
    const description = JSON.parse(item.description ?? "{}");
    return description.isAssetExchangeTxn;
  };

  const checkForStakeProposals = (item) => {
    const description = JSON.parse(item.description ?? "{}");
    return description.isStakeRequest;
  };

  return Promise.all(promiseArray).then((res) => {
    const proposals = [].concat(...res);
    filteredProposals = proposals.filter((item) => {
      const kindCondition = filterFunction(
        item,
        filterStatusArray,
        filterKindArray
      );
      // If isAssetExchange is true, check for description.isAssetExchangeTxn
      if (isAssetExchange) {
        return kindCondition && checkForExchangeProposals(item);
      }
      // If isStakeDelegation is true, check for description.isStakeRequest
      if (isStakeDelegation) {
        return kindCondition && checkForStakeProposals(item);
      }
      return kindCondition;
    });
    const uniqueFilteredProposals = Array.from(
      new Map(filteredProposals.map((item) => [item.id, item])).values()
    );
    const sortedProposals = uniqueFilteredProposals.sort((a, b) => b.id - a.id);
    const start = isPrevPageCalled ? currentPage * resPerPage : 0;
    const end = isPrevPageCalled
      ? currentPage * resPerPage + resPerPage
      : resPerPage;
    const newArray = sortedProposals.slice(start, end);
    return {
      filteredProposals: newArray,
      totalLength: sortedProposals.length,
    };
  });
}

const data = fetch(`https://httpbin.org/headers`);
const gatewayOrigin = data?.body?.headers?.Origin ?? "";

const isNearSocial =
  gatewayOrigin.includes("near.social") ||
  gatewayOrigin.includes("127.0.0.1:8080") ||
  gatewayOrigin.includes("treasury-devdao.testnet.page") ||
  gatewayOrigin.includes("treasury-devdao.near.page");

function getMembersAndPermissions(treasuryDaoID) {
  return Near.asyncView(treasuryDaoID, "get_policy", {}).then((daoPolicy) => {
    const memberData = [];

    if (Array.isArray(daoPolicy.roles)) {
      // Use a map to collect permissions and role names for each member
      const memberMap = new Map();

      daoPolicy.roles.forEach((role) => {
        (role.kind.Group ?? []).forEach((member) => {
          if (!memberMap.has(member)) {
            memberMap.set(member, {
              member: member,
              permissions: [],
              roles: [],
            });
          }

          // Add permissions and role names
          memberMap.get(member).permissions.push(...role.permissions);
          memberMap.get(member).roles.push(role.name);
        });
      });

      // Convert map to array and remove duplicates
      return Array.from(memberMap.values()).map((data) => ({
        member: data.member,
        permissions: Array.from(new Set(data.permissions)), // Remove duplicate permissions
        roles: Array.from(new Set(data.roles)), // Remove duplicate role names
      }));
    }

    return memberData;
  });
}

function getDaoRoles(treasuryDaoID) {
  const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
  if (Array.isArray(daoPolicy.roles)) {
    return daoPolicy.roles.map((role) => role.name);
  }

  return [];
}

function hasPermission(treasuryDaoID, accountId, kindName, actionType) {
  if (!accountId) {
    return false;
  }
  const isAllowed = false;
  const daoPolicy = Near.view(treasuryDaoID, "get_policy", {});
  if (Array.isArray(daoPolicy.roles)) {
    const permissions = daoPolicy.roles.map((role) => {
      if (
        Array.isArray(role.kind.Group) &&
        role.kind.Group.includes(accountId)
      ) {
        return (
          role.permissions.includes(`${kindName}:${actionType.toString()}`) ||
          role.permissions.includes(`${kindName}:*`) ||
          role.permissions.includes(`${kindName}:VoteApprove`) ||
          role.permissions.includes(`${kindName}:VoteReject`) ||
          role.permissions.includes(`${kindName}:VoteRemove`) ||
          role.permissions.includes(`*:${actionType.toString()}`) ||
          role.permissions.includes("*:*")
        );
      }
    });
    isAllowed = permissions.some((element) => element === true);
  }
  return isAllowed;
}

function getPermissionsText(type) {
  switch (type) {
    case "Create Requests":
    case "Create requests":
      return "Enables users to initiate payment requests.";
    case "Manage Members": {
      return "Allows users to control treasury adminis and their access levels.";
    }
    case "Vote": {
      return "Allows users to approve or request proposed payment requests.";
    }
    default:
      return "";
  }
}

function isBosGateway() {
  return (
    gatewayOrigin.includes("near.social") ||
    gatewayOrigin.includes("dev.near.org")
  );
}
function formatNearAmount(amount) {
  return Big(amount ?? '0').div(Big(10).pow(24)).toFixed(4);
}

function getNearBalances() {
  const balanceResp = fetch(
    `https://api3.nearblocks.io/v1/account/${treasuryDaoID}`
  );
  const locked = Big(balanceResp?.body?.account?.[0]?.storage_usage ?? "0")
    .mul(Big(10).pow(19))
    .toFixed();

  const available = Big(balanceResp?.body?.account?.[0]?.amount ?? "0").minus(
    locked
  );

  const total = Big(balanceResp?.body?.account?.[0]?.amount ?? "0");

  return {
    total,
    available,
    locked,
    totalParsed: formatNearAmount(total),
    availableParsed: formatNearAmount(available),
    lockedParsed: formatNearAmount(locked),
  };
}

return {
  getApproversAndThreshold,
  hasPermission,
  getFilteredProposalsByStatusAndKind,
  isNearSocial,
  getMembersAndPermissions,
  getDaoRoles,
  getPolicyApproverGroup,
  getPermissionsText,
  isBosGateway,
  getNearBalances,
};
