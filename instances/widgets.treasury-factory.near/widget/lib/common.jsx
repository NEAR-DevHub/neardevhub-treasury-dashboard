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

const roleOrder = [
  "Requestor",
  "Create Requests",
  "Approver",
  "Manage Members",
  "Admin",
  "Vote",
];

function fetchDaoPolicy(treasuryDaoID) {
  return treasuryDaoID
    ? Near.asyncView(treasuryDaoID, "get_policy", {}).then((daoPolicy) => {
        return {
          ...daoPolicy,
          roles: daoPolicy.roles.sort((a, b) => {
            return (
              (roleOrder.indexOf(a.name) !== -1
                ? roleOrder.indexOf(a.name)
                : Infinity) -
              (roleOrder.indexOf(b.name) !== -1
                ? roleOrder.indexOf(b.name)
                : Infinity)
            );
          }),
        };
      })
    : [];
}

function getRoleWiseData(treasuryDaoID) {
  return fetchDaoPolicy(treasuryDaoID).then((daoPolicy) => {
    const data = [];
    const defaultPolicy = daoPolicy.default_vote_policy;

    daoPolicy.roles.forEach((role) => {
      // Sort members alphabetically
      const members = (role.kind?.Group ?? []).sort((a, b) =>
        a.localeCompare(b)
      );

      // if there is no role.vote_policy, default is applied
      const threshold = Object.keys(role?.vote_policy ?? {}).length
        ? role?.vote_policy?.["vote"]?.threshold
        : defaultPolicy.threshold;
      const isRatio = Array.isArray(threshold);

      data.push({
        roleName: role.name,
        members,
        isRatio,
        threshold: isRatio
          ? threshold[1] === 100
            ? threshold[0]
            : (threshold[0] / threshold[1]) * 100
          : threshold,
        requiredVotes: isRatio
          ? Math.floor(
              (threshold[0] / threshold[1]) * role.kind?.Group.length
            ) + 1
          : threshold ?? 1,
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

  const checkForTransferProposals = (item) => {
    return (
      decodeProposalDescription("proposal_action", item.description) ===
        "transfer" || item.kind?.Transfer
    );
  };

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
      if (
        filterKindArray.includes("Transfer") &&
        !checkForTransferProposals(item)
      )
        return false;
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
  gatewayOrigin.includes("testnet.page") ||
  gatewayOrigin.includes("near.page");

function getMembersAndPermissions(treasuryDaoID) {
  return fetchDaoPolicy(treasuryDaoID).then((daoPolicy) => {
    const memberMap = new Map();

    daoPolicy.roles.forEach((role) => {
      (role.kind?.Group ?? []).forEach((member) => {
        if (!memberMap.has(member)) {
          memberMap.set(member, {
            member: member,
            permissions: [],
            roles: [],
          });
        }

        memberMap.get(member).permissions.push(...role.permissions);
        memberMap.get(member).roles.push(role.name);
      });
    });

    // Convert map to array, remove duplicates, and sort by member name
    return Array.from(memberMap.values())
      .map((data) => ({
        member: data.member,
        permissions: Array.from(new Set(data.permissions)), // Remove duplicate permissions
        roles: Array.from(new Set(data.roles)), // Remove duplicate role names
      }))
      .sort((a, b) => a.member.localeCompare(b.member)); // Sort alphabetically
  });
}

function getDaoRoles(treasuryDaoID) {
  const daoPolicy = treasuryDaoID
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;

  if (Array.isArray(daoPolicy.roles)) {
    return daoPolicy.roles
      .map((role) => role.name)
      .sort((a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b));
  }

  return [];
}

function hasPermission(treasuryDaoID, accountId, kindName, actionType) {
  if (!accountId) {
    return false;
  }

  const daoPolicy = treasuryDaoID
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;

  if (!daoPolicy || !Array.isArray(daoPolicy.roles)) {
    return false;
  }

  const kindNames = Array.isArray(kindName) ? kindName : [kindName];
  const actionTypes = Array.isArray(actionType) ? actionType : [actionType];

  for (const role of daoPolicy.roles) {
    if (
      !Array.isArray(role.kind.Group) ||
      !role.kind.Group.includes(accountId)
    ) {
      continue;
    }

    for (const kind of kindNames) {
      for (const action of actionTypes) {
        const permissionVariants = [
          `${kind}:${action}`,
          `${kind}:*`,
          `*:${action}`,
          "*:*",
        ];

        if (
          permissionVariants.some((perm) => role.permissions.includes(perm))
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

function getRolesDescription(type) {
  switch (type) {
    case "Requestor":
      return "Allows to create transaction requests (payments, stake delegation, and asset exchange).";
    case "Approver": {
      return "Allows to vote on transaction requests (payments, stake delegation, and asset exchange).";
    }
    case "Admin": {
      return "Allows to both create and vote on treasury settings (members and permissions, voting policies and duration, and appearance).";
    }
    default:
      return "";
  }
}

function getRolesThresholdDescription(type) {
  switch (type) {
    case "Approver":
      return "Vote for Payments, Stake Delegation, and Asset Exchange.";
    case "Admin":
      return "Vote for Members and Settings.";
    default:
      return "";
  }
}

function isBosGateway() {
  return (
    // for tests
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

function hexToHsl(hex) {
  // Remove # if present
  hex = hex ?? "";
  hex = hex.startsWith("#") ? hex.slice(1) : hex;

  // Extract RGB components
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Normalize RGB values
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l < 0.5 ? delta / (max + min) : delta / (2 - max - min);

    if (max === rNorm) {
      h = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }

    h *= 60;
  }

  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

// Function to convert HSL to HEX
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHex = (value) => {
    const hex = value.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getAllColorsAsObject(isDarkTheme, primaryColor) {
  const themeColor = primaryColor ? primaryColor : "#01BF7A";

  const [h, s, l] = hexToHsl(themeColor);

  // Calculate hover color (darken by reducing lightness)
  const hoverColor = hslToHex(h, s, Math.max(l - 10, 0));

  return {
    "--theme-color": themeColor,
    "--theme-color-dark": hoverColor,
    "--bg-header-color": isDarkTheme ? "#222222" : "#2C3E50",
    "--bg-page-color": isDarkTheme ? "#222222" : "#FFFFFF",
    "--bg-system-color": isDarkTheme ? "#131313" : "#f4f4f4",
    "--text-color": isDarkTheme ? "#CACACA" : "#1B1B18",
    "--text-secondary-color": isDarkTheme ? "#878787" : "#999999",
    "--text-alt-color": "#FFFFFF",
    "--border-color": isDarkTheme ? "#3B3B3B" : "rgba(226, 230, 236, 1)",
    "--grey-01": isDarkTheme ? "#F4F4F4" : "#1B1B18",
    "--grey-02": isDarkTheme ? "#B3B3B3" : "#555555",
    "--grey-03": isDarkTheme ? "#555555" : "#B3B3B3",
    "--grey-035": isDarkTheme ? "#3E3E3E" : "#E6E6E6",
    "--grey-04": isDarkTheme ? "#323232" : "#F4F4F4",
    "--grey-05": isDarkTheme ? "#1B1B18" : "#F7F7F7",
    "--icon-color": isDarkTheme ? "#CACACA" : "#060606",
    "--other-primary": "#2775C9",
    "--other-warning": "#B17108",
    "--other-green": "#3CB179",
    "--other-red": "#D95C4A",
    "--bs-body-bg": "var(--bg-page-color)",
    "--bs-border-color": "var(--border-color)",
  };
}

function getAllColorsAsCSSVariables(isDarkTheme, themeColor) {
  const colors = getAllColorsAsObject(isDarkTheme, themeColor);
  return Object.entries(colors)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n");
}
return {
  getApproversAndThreshold,
  hasPermission,
  getFilteredProposalsByStatusAndKind,
  isNearSocial,
  getMembersAndPermissions,
  getDaoRoles,
  getPolicyApproverGroup,
  getRolesDescription,
  isBosGateway,
  getNearBalances,
  getRoleWiseData,
  encodeToMarkdown,
  decodeProposalDescription,
  LOCKUP_MIN_BALANCE_FOR_STORAGE,
  formatSubmissionTimeStamp,
  TooltipText,
  getAllColorsAsObject,
  getAllColorsAsCSSVariables,
  getRolesThresholdDescription,
};
