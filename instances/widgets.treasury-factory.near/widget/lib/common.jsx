function getApproversAndThreshold(
  treasuryDaoID,
  kind,
  accountId,
  isDeleteCheck
) {
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
  let everyoneHasAccess = false;
  // if group kind is everyone, current user will have access
  groupWithPermission.map((i) => {
    approversGroup = approversGroup.concat(i?.kind?.Group ?? []);
    everyoneHasAccess = i.kind === "Everyone";
    const votePolicy =
      Object.values(i?.vote_policy?.[kind] ?? {}).length > 0
        ? i.vote_policy[kind]
        : daoPolicy.default_vote_policy;
    if (votePolicy.weight_kind === "RoleWeight") {
      if (Array.isArray(votePolicy.threshold)) {
        ratios = ratios.concat(votePolicy.threshold);
        ratios = ratios.concat(votePolicy.threshold);
      } else {
        requiredVotes = parseFloat(votePolicy.threshold);
      }
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
    // if everyoneHasAccess, current account doesn't change the requiredVotes
    approverAccounts:
      everyoneHasAccess && accountId
        ? [...approverAccounts, accountId]
        : approverAccounts,
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
  "Vote",
  "Admin",
  "Manage Members",
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
    : { roles: [], default_vote_policy: {} };
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
        ? Object.values(role?.vote_policy)?.[0]?.threshold
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
    if (line.startsWith("* ")) {
      const rest = line.slice(2);
      const indexOfColon = rest.indexOf(":");
      if (indexOfColon !== -1) {
        const currentKey = rest.slice(0, indexOfColon).trim();
        const value = rest.slice(indexOfColon + 1).trim();

        if (currentKey.toLowerCase() === markdownKey.toLowerCase()) {
          return value;
        }
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
  isLockup,
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
        "transfer" ||
      item.kind?.Transfer ||
      item.kind?.FunctionCall?.actions[0].method_name === "ft_withdraw" ||
      item.kind?.FunctionCall?.actions[0].method_name === "ft_transfer" ||
      item.kind?.FunctionCall?.actions[1].method_name === "ft_transfer"
    );
  };

  const checkForExchangeProposals = (item) => {
    const isAssetExchange =
      decodeProposalDescription("proposal_action", item.description) ===
      "asset-exchange";
    return isAssetExchange;
  };

  const checkForLockupProposals = (item) => {
    return item?.kind?.FunctionCall?.receiver_id === "lockup.near";
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
      ) {
        return false;
      }
      if (isAssetExchange && !checkForExchangeProposals(item)) return false;
      if (isStakeDelegation && !checkForStakeProposals(item)) return false;
      if (isLockup && !checkForLockupProposals(item)) return false;

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

function getProposalsFromIndexer({
  daoId,
  category,
  page,
  pageSize,
  statuses,
  proposalType,
  sortDirection,
  filters,
  search,
  amountValues,
}) {
  let query = `${REPL_SPUTNIK_INDEXER}/proposals/${daoId}?page=${page}&page_size=${pageSize}&sort_by=CreationTime&sort_direction=${sortDirection}`;

  if (category && category.length > 0) {
    query += `&category=${category}`;
  }
  if (proposalType && proposalType.length > 0) {
    query += `&proposal_types=${proposalType.join(",")}`;
  }

  // Handle search
  if (search && search.trim()) {
    query += `&search=${encodeURIComponent(search.trim())}`;
  }

  // Handle statuses - use filters.statuses if available, otherwise use statuses parameter
  let hasStatusesInFilters = false;
  if (
    filters &&
    filters.statuses &&
    filters.statuses.values &&
    filters.statuses.values.length > 0
  ) {
    hasStatusesInFilters = true;
  }

  if (!hasStatusesInFilters && statuses && statuses.length > 0) {
    query += `&statuses=${statuses.join(",")}`;
  }

  // Handle filters object
  if (filters && typeof filters === "object") {
    // Iterate through each filter key
    Object.keys(filters).forEach((filterKey) => {
      const filter = filters[filterKey];

      if (filter && filter.values && filter.values.length > 0) {
        const values = filter.values.filter((value) => value && value !== ""); // Filter out empty values

        if (values.length > 0) {
          // Only add if we have non-empty values
          const include = filter.include !== false; // default to true if not specified

          // Map filter keys to URL parameters
          switch (filterKey) {
            case "statuses":
              query += `&statuses=${values.join(",")}`;
              break;

            case "proposers":
              if (include) {
                query += `&proposers=${values.join(",")}`;
              } else {
                query += `&proposers_not=${values.join(",")}`;
              }
              break;

            case "approvers":
              if (include) {
                query += `&approvers=${values.join(",")}`;
              } else {
                query += `&approvers_not=${values.join(",")}`;
              }
              break;

            case "recipients":
              if (include) {
                query += `&recipients=${values.join(",")}`;
              } else {
                query += `&recipients_not=${values.join(",")}`;
              }
              break;

            case "token":
              query += `&tokens=${values.join(",")}`;
              break;

            case "created_date":
              // For date filters, preserve the original array structure
              const originalValues = filter.values;
              const fromDate = originalValues[0];
              const toDate = originalValues[1];

              if (fromDate && toDate) {
                query += `&created_date_from=${fromDate}&created_date_to=${toDate}`;
              } else if (fromDate) {
                query += `&created_date_from=${fromDate}`;
              } else if (toDate) {
                query += `&created_date_to=${toDate}`;
              }
              break;

            default:
              break;
          }
        }
      }
    });
  }

  if (amountValues) {
    const amountParams = [];

    if (amountValues.min && amountValues.min !== "") {
      amountParams.push(`amount_min=${amountValues.min}`);
    }
    if (amountValues.max && amountValues.max !== "") {
      amountParams.push(`amount_max=${amountValues.max}`);
    }
    if (amountValues.equal && amountValues.equal !== "") {
      amountParams.push(`amount_equal=${amountValues.equal}`);
    }

    if (amountParams.length > 0) {
      query += `&${amountParams.join("&")}`;
    }
  }

  return asyncFetch(query).then((r) => r.body);
}

const data = fetch("${REPL_BACKEND_API}".replace("/api", "") + "/headers");
const gatewayOrigin = data?.body?.headers?.origin ?? "";

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

  // if the role is all and has everyone, we need to check for it
  for (const role of daoPolicy.roles) {
    if (
      role.kind !== "Everyone" &&
      Array.isArray(role.kind.Group) &&
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
  if (!accountId) {
    return {};
  }
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

function formatSubmissionTimeStamp(
  submissionTime,
  proposalPeriod,
  isProposalDetailsPage
) {
  const endTime = Big(submissionTime ?? "0")
    .plus(proposalPeriod ?? "0")
    .toFixed();
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
  const formattedUTC = date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
    timeZoneName: "short",
  });
  return isProposalDetailsPage ? (
    <div className={isNegative && "text-secondary"}>{formattedUTC}</div>
  ) : (
    <div className="d-flex flex-wrap">
      <div className="fw-bold">
        {isNegative
          ? "Expired"
          : `${totalDays}d ${remainingHours}h ${remainingMinutes}m`}

        <div className="text-secondary text-sm">
          {hours}:{minutes} {day} {month} {year}
        </div>
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
    "--grey-045": isDarkTheme ? "#1d1d1d" : "#F4F4F4",
    "--grey-05": isDarkTheme ? "#1B1B18" : "#F7F7F7",
    "--icon-color": isDarkTheme ? "#CACACA" : "#060606",
    "--other-primary": "#2775C9",
    "--other-warning": "#B17108",
    "--other-green": "#3CB179",
    "--other-green-light": "#3CB1791A",
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

function decodeBase64(encodedArgs) {
  if (!encodedArgs) return null;
  try {
    const jsonString = Buffer.from(encodedArgs, "base64").toString("utf8");
    const parsedArgs = JSON.parse(jsonString);
    return parsedArgs;
  } catch (error) {
    console.error("Failed to decode or parse encodedArgs:", error);
    return null;
  }
}

function accountToLockup(accountId) {
  if (!accountId) {
    return null;
  }
  // Compute SHA-256 hash
  const hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(accountId));

  // Take the first 40 characters (20 bytes in hex)
  const truncatedHash = hash.slice(2, 42); // Remove '0x' and take first 40 chars
  const lockupAccount = `${truncatedHash}.lockup.near`;
  const resp = fetch(`${REPL_RPC_URL}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "view_account",
        finality: "final",
        account_id: `${lockupAccount}`,
      },
    }),
  });

  if (resp.body?.result?.amount) {
    return lockupAccount;
  }
  return false;
}

async function asyncAccountToLockup(accountId) {
  if (!accountId) {
    return null;
  }
  // Compute SHA-256 hash
  const hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(accountId));

  // Take the first 40 characters (20 bytes in hex)
  const truncatedHash = hash.slice(2, 42); // Remove '0x' and take first 40 chars
  const lockupAccount = `${truncatedHash}.lockup.near`;

  return asyncFetch(`${REPL_RPC_URL}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "view_account",
        finality: "final",
        account_id: `${lockupAccount}`,
      },
    }),
  });
}

function deserializeLockupContract(byteArray) {
  let offset = 0;

  function readU8() {
    return byteArray[offset++];
  }

  function readU32() {
    const bytes = [
      byteArray[offset++],
      byteArray[offset++],
      byteArray[offset++],
      byteArray[offset++],
    ];
    let result = new BN(0);
    for (let i = 0; i < 4; i++) {
      result = result.add(new BN(bytes[i]).mul(new BN(256).pow(new BN(i))));
    }
    return result;
  }

  function readU64() {
    const bytes = Array(8)
      .fill(0)
      .map(() => byteArray[offset++]);
    let result = new BN(0);
    for (let i = 0; i < 8; i++) {
      result = result.add(new BN(bytes[i]).mul(new BN(256).pow(new BN(i))));
    }
    return result;
  }

  function readU128() {
    const bytes = Array(16)
      .fill(0)
      .map(() => byteArray[offset++]);
    let result = new BN(0);
    for (let i = 0; i < 16; i++) {
      result = result.add(new BN(bytes[i]).mul(new BN(256).pow(new BN(i))));
    }
    return result;
  }

  function readString() {
    const length = readU32().toNumber();
    const strBytes = byteArray.slice(offset, offset + length);
    offset += length;
    return String.fromCharCode(...strBytes);
  }

  function readOption(reader) {
    const hasValue = readU8() === 1;
    return hasValue ? reader() : null;
  }

  function readVecU8() {
    const length = readU32();
    const bytes = byteArray.slice(offset, offset + length);
    offset += length;
    return Array.from(bytes);
  }

  // Deserialize TransfersInformation enum
  function readTransfersInformation() {
    const variant = readU8();
    if (variant === 0) {
      return {
        type: "TransfersEnabled",
        transfers_timestamp: readU64(),
      };
    } else if (variant === 1) {
      return {
        type: "TransfersDisabled",
        transfer_poll_account_id: readString(),
      };
    }
    console.log("var", variant);
    throw `Invalid TransfersInformation variant ${variant}`;
  }

  // Deserialize TransactionStatus enum
  function readTransactionStatus() {
    const variant = readU8();
    return variant === 0 ? "Idle" : "Busy";
  }

  // Deserialize VestingSchedule
  function readVestingSchedule() {
    return {
      start_timestamp: readU64(),
      cliff_timestamp: readU64(),
      end_timestamp: readU64(),
    };
  }

  // Deserialize VestingInformation enum
  function readVestingInformation() {
    const variant = readU8();
    switch (variant) {
      case 0:
        return { type: "None" };
      case 1:
        return {
          type: "VestingHash",
          hash: readVecU8(),
        };
      case 2:
        return {
          type: "VestingSchedule",
          schedule: readVestingSchedule(),
        };
      case 3:
        return {
          type: "Terminating",
          unvested_amount: readU128(),
          status: readU8(), // TerminationStatus as simple u8 for now
        };
      default:
        throw new Error("Invalid VestingInformation variant");
    }
  }

  const result = {
    owner_account_id: readString(),
    lockup_information: {
      lockup_amount: readU128(),
      termination_withdrawn_tokens: readU128(),
      lockup_duration: readU64(),
      release_duration: readOption(readU64),
      lockup_timestamp: readOption(readU64),
      transfers_information: readTransfersInformation(),
    },
    vesting_information: readVestingInformation(),
    staking_pool_whitelist_account_id: readString(),
    staking_information: readOption(() => ({
      staking_pool_account_id: readString(),
      status: readTransactionStatus(),
      deposit_amount: readU128(),
    })),
    foundation_account_id: readOption(readString),
  };

  return result;
}

function waitForSocialGet(key, retries, interval) {
  retries = retries ?? 3;
  interval = interval ?? 200;

  return new Promise((resolve) => {
    let attempts = 0;

    const check = () => {
      const result = Social.get(key);
      if (result || attempts >= retries) {
        resolve(result);
      } else {
        attempts += 1;
        setTimeout(check, interval);
      }
    };

    check();
  });
}

function getUserDaos(accountId, doAsyncFetch) {
  if (!accountId) return [];

  const url = `${REPL_BACKEND_API}/user-daos?account_id=${accountId}`;

  const doFetch = doAsyncFetch
    ? asyncFetch(url).then((res) => res?.body ?? [])
    : fetch(url, { headers });

  return doFetch;
}

function getUserTreasuries(accountId) {
  return getUserDaos(accountId, true).then((userDaos) => {
    return Promise.all(
      userDaos.map((daoId) => {
        const spuntikName = daoId.split(".")[0];
        const selfFrontendKey = `${spuntikName}.near/widget/app`;
        const instanceAccount = `treasury-${spuntikName}.near`;
        const manualFrontendKey = `${instanceAccount}/widget/app`;

        return Promise.all([
          Near.asyncView(daoId, "get_config"),
          waitForSocialGet(selfFrontendKey),
          waitForSocialGet(manualFrontendKey),
        ]).then((res) => {
          const config = res[0];
          const selfCreatedfrontendExists = res[1];
          const manualCreatedfrontendExists = res[2];
          return {
            daoId,
            instanceAccount: selfCreatedfrontendExists
              ? `${spuntikName}.near`
              : instanceAccount,
            hasTreasury:
              selfCreatedfrontendExists || manualCreatedfrontendExists,
            config: {
              ...config,
              metadata: JSON.parse(atob(config.metadata ?? "")),
            },
          };
        });
      })
    );
  });
}

function getIntentsBalances(accountId) {
  if (!accountId) {
    return Promise.all([]);
  }

  // First get tokens owned by this account
  return Near.asyncView("intents.near", "mt_tokens_for_owner", {
    account_id: accountId,
  })
    .then((ownedTokens) => {
      if (!ownedTokens || ownedTokens.length === 0) {
        return [];
      }

      // Get metadata from chaindefuser API for all tokens
      return asyncFetch("https://api-mng-console.chaindefuser.com/api/tokens")
        .then((resp) => {
          if (!resp.ok) {
            console.error("Failed to fetch tokens from Chaindefuser", resp);
            return [];
          }
          const allTokens = resp.body?.items || [];

          // Filter to only tokens owned by the account
          const ownedTokenIds = ownedTokens.map((t) => t.token_id);
          const relevantTokens = allTokens.filter((t) =>
            ownedTokenIds.includes(t.defuse_asset_id)
          );

          if (relevantTokens.length === 0) {
            return [];
          }

          // Get balances for owned tokens
          const tokenIds = relevantTokens.map((t) => t.defuse_asset_id);
          return Near.asyncView("intents.near", "mt_batch_balance_of", {
            account_id: accountId,
            token_ids: tokenIds,
          })
            .then((balances) => {
              if (balances === null || typeof balances === "undefined") {
                console.error(
                  "Failed to fetch balances from intents.near",
                  balances
                );
                return []; // Return empty array on error
              }

              const tokensWithBalances = relevantTokens.map((t, i) => ({
                ...t, // Spread original token data
                amount: balances[i],
              }));

              const filteredTokensWithBalances = tokensWithBalances.filter(
                (token) => token.amount && Big(token.amount).gt(0)
              );

              if (filteredTokensWithBalances.length === 0) {
                return [];
              }

              const iconPromises = filteredTokensWithBalances.map((token) => {
                let iconPromise = Promise.resolve(token.icon); // Default to original icon
                if (
                  token.defuse_asset_id &&
                  token.defuse_asset_id.startsWith("nep141:")
                ) {
                  const parts = token.defuse_asset_id.split(":");
                  if (parts.length > 1) {
                    const contractId = parts[1];
                    iconPromise = Near.asyncView(contractId, "ft_metadata")
                      .then((metadata) => metadata?.icon || token.icon)
                      .catch(() => token.icon); // Fallback to original icon on error
                  }
                }
                return iconPromise;
              });

              return Promise.all(iconPromises)
                .then((resolvedIcons) => {
                  const finalTokens = filteredTokensWithBalances.map(
                    (t, i) => ({
                      // contract_id is needed by TokensDropdown
                      contract_id: t.defuse_asset_id.startsWith("nep141:")
                        ? t.defuse_asset_id.split(":")[1]
                        : t.defuse_asset_id,
                      ft_meta: {
                        symbol: t.symbol,
                        icon: resolvedIcons[i], // Use icon from ft_metadata or original
                        decimals: t.decimals,
                        price: t.price, // Include price if available
                      },
                      amount: t.amount,
                      blockchain: t.blockchain,
                    })
                  );
                  return finalTokens;
                })
                .catch((iconError) => {
                  console.error(
                    "Error fetching some token icons, using defaults.",
                    iconError
                  );
                  // Fallback to original icons if Promise.all fails for ft_metadata calls
                  const fallbackTokens = filteredTokensWithBalances.map(
                    (t) => ({
                      contract_id: t.defuse_asset_id.startsWith("nep141:")
                        ? t.defuse_asset_id.split(":")[1]
                        : t.defuse_asset_id,
                      ft_meta: {
                        symbol: t.symbol,
                        icon: t.icon, // Fallback to original icon
                        decimals: t.decimals,
                        price: t.price,
                      },
                      amount: t.amount,
                      blockchain: t.blockchain,
                    })
                  );
                  return fallbackTokens;
                });
            })
            .catch((balanceError) => {
              console.error("Error fetching intents balances:", balanceError);
              return []; // Return empty array on error
            });
        })
        .catch((fetchError) => {
          console.error("Error fetching token metadata:", fetchError);
          return []; // Return empty array on error
        });
    })
    .catch((fetchError) => {
      console.error("Error fetching owned tokens:", fetchError);
      return []; // Return empty array on error
    });
}

function updateDaoPolicy(membersList, daoPolicy) {
  const updatedPolicy = { ...daoPolicy };
  const additions = [];
  const edits = [];

  const originalRolesMap = new Map();

  if (Array.isArray(updatedPolicy.roles)) {
    updatedPolicy.roles.forEach((role) => {
      if (role.name !== "all" && role.kind.Group) {
        role.kind.Group.forEach((user) => {
          if (!originalRolesMap.has(user)) {
            originalRolesMap.set(user, []);
          }
          originalRolesMap.get(user).push(role.name);
        });
      }
    });

    updatedPolicy.roles = updatedPolicy.roles.map((role) => {
      if (role.name === "all" && role.kind === "Everyone") return role;

      let group = [...(role.kind.Group || [])];

      membersList.forEach(({ member, roles }) => {
        const shouldHaveRole = roles.includes(role.name);
        const isAlreadyInRole = group.includes(member);

        if (shouldHaveRole && !isAlreadyInRole) {
          group.push(member);
        } else if (!shouldHaveRole && isAlreadyInRole) {
          group = group.filter((u) => u !== member);
        }
      });

      return {
        ...role,
        kind: { Group: group },
      };
    });
  }

  membersList.forEach(({ member, roles }) => {
    const oldRoles = originalRolesMap.get(member) || [];
    const newRoles = roles;

    const added = newRoles.filter((r) => !oldRoles.includes(r));
    const removed = oldRoles.filter((r) => !newRoles.includes(r));

    if (oldRoles.length === 0 && newRoles.length > 0) {
      additions.push(
        `- add "${member}" to [${newRoles.map((r) => `"${r}"`).join(", ")}]`
      );
    } else if (added.length > 0 || removed.length > 0) {
      edits.push(
        `- edit "${member}" from [${oldRoles
          .map((r) => `"${r}"`)
          .join(", ")}] to [${newRoles.map((r) => `"${r}"`).join(", ")}]`
      );
    }
  });

  const summaryLines = [...additions, ...edits];
  const summary = summaryLines.length
    ? `${context.accountId} requested to:\n${summaryLines.join("\n")}`
    : `${context.accountId} made no permission changes.`;

  return {
    updatedPolicy,
    summary,
  };
}

function nearAccountValidation(accountId, fieldName, isSputnikDaoCheck) {
  if (!accountId || typeof accountId !== "string") {
    return { isValid: false, error: `${fieldName} must be a string` };
  }

  // Check minimum and maximum length
  if (accountId.length < 2) {
    return {
      isValid: false,
      error: `${fieldName} must be at least 2 characters long`,
    };
  }
  if (accountId.length > 64) {
    return {
      isValid: false,
      error: `${fieldName} must be at most 64 characters long`,
    };
  }

  // If isSputnikCheck is true, disallow hex accounts (implicit accounts) and dots
  if (isSputnikDaoCheck) {
    // Check for ETH-implicit account ID (0x followed by 40 hex characters)
    if (accountId.startsWith("0x")) {
      return {
        isValid: false,
        error: `${fieldName} cannot be an ETH-implicit account (hex address)`,
      };
    }

    if (accountId.endsWith(".near")) {
      return {
        isValid: false,
        error: `${fieldName} cannot end with .near`,
      };
    }

    // Check for NEAR-implicit account ID (64 lowercase hex characters)
    if (accountId.length === 64 && /^[0-9a-f]{64}$/.test(accountId)) {
      return {
        isValid: false,
        error: `${fieldName} cannot be a NEAR-implicit account (hex address)`,
      };
    }

    // For Sputnik, disallow dots (no subaccounts allowed)
    if (accountId.includes(".")) {
      return {
        isValid: false,
        error: `${fieldName} cannot contain dots (subaccounts are not allowed)`,
      };
    }
  } else {
    // Check for ETH-implicit account ID (0x followed by 40 hex characters)
    if (accountId.startsWith("0x")) {
      if (accountId.length !== 42) {
        return {
          isValid: false,
          error:
            "ETH-implicit account ID must be 0x followed by 40 hex characters",
        };
      }
      if (!/^0x[0-9a-f]{40}$/.test(accountId)) {
        return {
          isValid: false,
          error:
            "ETH-implicit account ID must contain only lowercase hex characters",
        };
      }
      return { isValid: true, error: null };
    }

    // Check for NEAR-implicit account ID (64 lowercase hex characters)
    if (accountId.length === 64) {
      if (!/^[0-9a-f]{64}$/.test(accountId)) {
        return {
          isValid: false,
          error:
            "NEAR-implicit account ID must contain only lowercase hex characters",
        };
      }
      return { isValid: true, error: null };
    }
  }

  // Check for subaccount format (parts separated by dots)
  const parts = accountId.split(".");

  // Each part must be valid
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Each part must be at least 1 character
    if (part.length === 0) {
      return { isValid: false, error: `${fieldName} parts cannot be empty` };
    }

    // Each part must consist of lowercase alphanumeric symbols separated by _ or -
    if (!/^[a-z0-9_-]+$/.test(part)) {
      return {
        isValid: false,
        error: `${fieldName} parts must contain only lowercase letters, numbers, underscores, and hyphens`,
      };
    }

    // Each part cannot start or end with _ or -
    if (
      part.startsWith("_") ||
      part.startsWith("-") ||
      part.endsWith("_") ||
      part.endsWith("-")
    ) {
      return {
        isValid: false,
        error: `${fieldName} parts cannot start or end with underscore or hyphen`,
      };
    }

    // Each part cannot have consecutive _ or -
    if (/[_-]{2,}/.test(part)) {
      return {
        isValid: false,
        error: `${fieldName} parts cannot have consecutive underscores or hyphens`,
      };
    }
  }

  return { isValid: true, error: null };
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
  decodeBase64,
  accountToLockup,
  asyncAccountToLockup,
  deserializeLockupContract,
  getUserTreasuries,
  getUserDaos,
  getIntentsBalances,
  updateDaoPolicy,
  nearAccountValidation,
  getProposalsFromIndexer,
};
