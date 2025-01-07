function getApproversAndThreshold(treasuryDaoID, kind, isDeleteCheck) {
  const daoPolicy = treasuryDaoID
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;
  const groupWithPermission = (daoPolicy.roles ?? []).filter((role) => {
    const permissions = isDeleteCheck
      ? ["*:*", `${kind}:*`, `${kind}:VoteRemove`, "*:VoteRemove"]
      : [
          "*:*",
          `${kind}:*`,
          `${kind}:VoteApprove`,
          `${kind}:VoteReject`,
          "*:VoteApprove",
          "*:VoteReject",
        ];
    return (role?.permissions ?? []).some((i) => permissions.includes(i));
  });

  let approversGroup = [];
  let ratios = [];
  let requiredVotes = null;
  groupWithPermission.map((i) => {
    approversGroup = approversGroup.concat(i.kind.Group ?? []);
    if (Object.values(i.vote_policy ?? {}).length > 0) {
      if (i.vote_policy[kind].weight_kind === "RoleWeight") {
        if (Array.isArray(i.vote_policy[kind].threshold)) {
          ratios = ratios.concat(i.vote_policy[kind].threshold);
          ratios = ratios.concat(i.vote_policy[kind].threshold);
        } else {
          requiredVotes = parseFloat(i.vote_policy[kind].threshold);
        }
      }
    } else {
      ratios = [50, 100];
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
  }
  const approverAccounts = Array.from(new Set(approversGroup));

  return {
    approverAccounts,
    requiredVotes:
      typeof requiredVotes === "number"
        ? requiredVotes
        : Math.floor((numerator / denominator) * approverAccounts.length) + 1,
  };
}

function getRoleWiseData(treasuryDaoID) {
  return Near.asyncView(treasuryDaoID, "get_policy", {}).then((daoPolicy) => {
    const data = [];
    (daoPolicy.roles ?? []).map((role) => {
      const isRatio = Array.isArray(role?.vote_policy?.["vote"]?.threshold);
      data.push({
        roleName: role.name,
        members: role.kind?.Group ?? [],
        isRatio,
        threshold: isRatio
          ? role?.vote_policy?.["vote"]?.threshold[0]
          : role?.vote_policy?.["vote"].threshold,
        requiredVotes: isRatio
          ? Math.floor(
              (role?.vote_policy?.["vote"]?.threshold[0] /
                role?.vote_policy?.["vote"]?.threshold[1]) *
                role.kind?.Group.length
            ) + 1
          : role?.vote_policy?.["vote"]?.threshold ?? 1,
      });
    });
    return data;
  });
}

function getPolicyApproverGroup(treasuryDaoID) {
  const daoPolicy = treasuryDaoID
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;

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

const filterFunction = (
  item,
  filterStatusArray,
  filterKindArray,
  proposalPeriod
) => {
  const kind =
    typeof item.kind === "string" ? item.kind : Object.keys(item.kind)[0];
  const endTime = Big(item.submission_time).plus(proposalPeriod).toFixed();

  const timestampInMilliseconds = Big(endTime) / Big(1_000_000);
  const currentTimeInMilliseconds = Date.now();

  let statusValid = true;

  // Override "InProgress" if timestamp has expired
  if (filterStatusArray.includes("Expired")) {
    if (
      item.status === "InProgress" &&
      Big(timestampInMilliseconds).lt(currentTimeInMilliseconds)
    ) {
      item.status = "Expired"; // Treat "InProgress" as "Expired"
    }
  }

  // Check for "InProgress" and validate timestamp if applicable
  if (
    filterStatusArray.includes("InProgress") &&
    item.status === "InProgress"
  ) {
    statusValid = Big(timestampInMilliseconds).gt(currentTimeInMilliseconds);
  }

  // Return false if status is not valid
  if (!statusValid) return false;

  if (filterStatusArray.length > 0 && filterKindArray.length > 0) {
    return (
      filterStatusArray.includes(item.status) && filterKindArray.includes(kind)
    );
  }

  if (filterKindArray.length > 0) {
    return filterKindArray.includes(kind);
  }

  if (filterStatusArray.length > 0) {
    return filterStatusArray.includes(item.status);
  }

  // Return true if no filters are applied
  return true;
};

function parseKeyToReadableFormat(key) {
  return key
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Add spaces between camelCase or PascalCase words
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize each word
}

const encodeToMarkdown = (data) => {
  return Object.entries(data)
    .filter(([key, value]) => {
      return (
        key && // Key exists and is not null/undefined
        value !== null &&
        value !== undefined &&
        value !== ""
      );
    })
    .map(([key, value]) => {
      return `* ${parseKeyToReadableFormat(key)}: ${String(value)}`;
    })
    .join(" <br>");
};

const decodeProposalDescription = (key, description) => {
  // Try to parse as JSON
  let parsedData;
  try {
    parsedData = JSON.parse(description);
    if (parsedData && parsedData[key] !== undefined) {
      return parsedData[key]; // Return value from JSON if key exists
    }
  } catch (error) {
    // Not JSON, proceed to parse as markdown
  }

  // Handle as markdown
  const markdownKey = parseKeyToReadableFormat(key);

  const lines = description.split("<br>");
  for (const line of lines) {
    const match = line.match(/^\* (.+): (.+)$/);
    if (match) {
      const currentKey = match[1];
      const value = match[2];

      if (currentKey === markdownKey) {
        return value.trim();
      }
    }
  }

  return null; // Return null if key not found
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
  const policy = Near.asyncView(treasuryDaoID, "get_policy", {});
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
    const isAssetExchange =
      decodeProposalDescription("proposal_action", item.description) ===
      "asset-exchange";
    return isAssetExchange;
  };

  const checkForStakeProposals = (item) => {
    const proposalAction = decodeProposalDescription(
      "proposal_action",
      item.description
    );
    const isStakeRequest =
      decodeProposalDescription("isStakeRequest", item.description) ||
      proposalAction === "stake" ||
      proposalAction === "unstake" ||
      proposalAction === "withdraw";

    return isStakeRequest;
  };

  return Promise.all([...promiseArray, policy]).then((res) => {
    const policyResult = res[res.length - 1];
    const proposals = res.slice(0, -1).flat();
    filteredProposals = proposals.filter((item) => {
      const kindCondition = filterFunction(
        item,
        filterStatusArray,
        filterKindArray,
        policyResult.proposal_period
      );
      if (!kindCondition) return false;

      // Check for asset exchange or stake delegation, if applicable
      if (isAssetExchange && !checkForExchangeProposals(item)) return false;
      if (isStakeDelegation && !checkForStakeProposals(item)) return false;

      return true;
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
  const daoPolicy = treasuryDaoID
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;

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
  const daoPolicy = treasuryDaoID
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;

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
      return "Allows users to control treasury admins and their access levels.";
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
    // for tests
    gatewayOrigin.includes("localhost:8080") ||
    gatewayOrigin.includes("near.social") ||
    gatewayOrigin.includes("dev.near.org")
  );
}

function formatNearAmount(amount) {
  return Big(amount ?? "0")
    .div(Big(10).pow(24))
    .toFixed(2);
}

function getNearBalances(accountId) {
  const resp = fetch(`https://api.fastnear.com/v1/account/${accountId}/full`);
  const storage = Big(resp?.body?.state?.storage_bytes ?? "0")
    .mul(Big(10).pow(19))
    .toFixed();
  const total = Big(resp?.body?.state?.balance ?? "0").toFixed();
  const available = Big(resp?.body?.state?.balance ?? "0")
    .minus(storage ?? "0")
    .toFixed();
  return {
    total,
    available,
    storage,
    totalParsed: formatNearAmount(total),
    availableParsed: formatNearAmount(available),
    storageParsed: formatNearAmount(storage),
  };
}

// https://github.com/near/core-contracts/blob/master/lockup/src/lib.rs#L33
const LOCKUP_MIN_BALANCE_FOR_STORAGE = Big(3.5).mul(Big(10).pow(24)).toFixed();

function formatSubmissionTimeStamp(submissionTime, proposalPeriod) {
  const endTime = Big(submissionTime).plus(proposalPeriod).toFixed();
  const milliseconds = Number(endTime) / 1000000;
  const date = new Date(milliseconds);

  // Calculate days and minutes remaining from the timestamp
  const now = new Date();
  let diffTime = date - now;

  // Check if the difference is negative
  const isNegative = diffTime < 0;

  // Convert the total difference into days, hours, and minutes
  const totalMinutes = Math.floor(diffTime / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  // Get hours, minutes, day, month, and year
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();
  return (
    <div className="d-flex flex-column">
      <div className="fw-bold">
        {isNegative
          ? "Expired"
          : `${totalDays}d ${remainingHours}h ${remainingMinutes}m`}
      </div>
      <div className="text-secondary text-sm">
        {hours}:{minutes} {day} {month} {year}
      </div>
    </div>
  );
}

const TooltipText = {
  available: "Spendable now. Use these tokens for payments or staking.",

  staked:
    "Earning rewards with validators. To spend these tokens, unstake them first. This takes 52-65 hours.",
  pendingRelease:
    "Unstaking tokens … These tokens are ready to withdraw 52 to 65 hours after unstaking.",
  availableForWithdraw:
    "Unstaked tokens. Withdraw these tokens to make them spendable.",
  locked:
    "This is your locked NEAR balance. Until it vests, staking is the only way to use it.",
  reservedForStorage:
    "Keeps your account active. This small amount of NEAR covers storage costs.",
  readyToStake: "Available to stake. Earn rewards by staking these tokens",
};

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
  getRoleWiseData,
  encodeToMarkdown,
  decodeProposalDescription,
  LOCKUP_MIN_BALANCE_FOR_STORAGE,
  formatSubmissionTimeStamp,
  TooltipText,
};
