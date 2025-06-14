const {
  encodeToMarkdown,
  getFilteredProposalsByStatusAndKind,
  getAllColorsAsObject,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getFilteredProposalsByStatusAndKind: () => {},
  getAllColorsAsObject: () => {},
};
const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const isTreasuryFactory = props.isTreasuryFactory;
const instance = props.instance;
if (!instance && !isTreasuryFactory) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);

const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = JSON.parse(atob(config.metadata ?? ""));
const isDarkTheme = metadata.theme === "dark";

const primaryColor = metadata?.primaryColor
  ? metadata?.primaryColor
  : themeColor;

const colors = getAllColorsAsObject(isDarkTheme, primaryColor);
const selectedMembers = props.selectedMembers ?? [];
const isEdit = selectedMembers.length > 0;
const availableRoles = props.availableRoles || [];
const allMembers = props.allMembers || [];
const profilesData = Social.get("*/profile/name", "final") || {};
const accounts = Object.keys(profilesData);
const onCloseCanvas = props.onCloseCanvas ?? (() => {});
const setToastStatus = props.setToastStatus ?? (() => {});
const updateLastProposalId = props.updateLastProposalId || (() => {});

const [showCancelModal, setShowCancelModal] = useState(false);
const [isTxnCreated, setTxnCreated] = useState(false);
const [lastProposalId, setLastProposalId] = useState(null);
const [showErrorToast, setShowErrorToast] = useState(false);
const [
  showProposalsOverrideConfirmModal,
  setShowProposalsOverrideConfirmModal,
] = useState(false);
const [proposals, setProposals] = useState([]);
const [updatedList, setUpdatedList] = useState([]);

if (!profilesData || !accounts.length || !availableRoles.length) return <></>;

const fetchProposals = async (proposalId) =>
  getFilteredProposalsByStatusAndKind({
    treasuryDaoID,
    resPerPage: 10,
    isPrevPageCalled: false,
    filterKindArray: ["ChangePolicy"],
    filterStatusArray: ["InProgress"],
    offset: proposalId,
    lastProposalId: proposalId,
  }).then((r) => {
    return r.filteredProposals;
  });

const daoPolicy =
  treasuryDaoID && !isTreasuryFactory
    ? Near.view(treasuryDaoID, "get_policy", {})
    : null;

const deposit = daoPolicy?.proposal_bond || 0;

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  if (!isTreasuryFactory) {
    getLastProposalId().then((i) => {
      setLastProposalId(i);
      fetchProposals(i).then((prpls) => {
        setProposals(prpls);
      });
    });
  }
}, [isTreasuryFactory]);

// close canvas after proposal is submitted
useEffect(() => {
  if (isTxnCreated) {
    let checkTxnTimeout = null;

    const checkForNewProposal = () => {
      getLastProposalId().then((id) => {
        if (typeof lastProposalId === "number" && lastProposalId !== id) {
          updateLastProposalId(lastProposalId);
          setToastStatus(true);
          onCloseCanvas();
          clearTimeout(checkTxnTimeout);
          setTxnCreated(false);
        } else {
          checkTxnTimeout = setTimeout(() => checkForNewProposal(), 1000);
        }
      });
    };
    checkForNewProposal();

    return () => {
      clearTimeout(checkTxnTimeout);
    };
  }
}, [isTxnCreated, lastProposalId]);

function updateDaoPolicy(membersList) {
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

function onSubmitClick(list) {
  if (isTreasuryFactory) {
    props.onSubmit(
      list.map((member) => ({
        accountId: member.member,
        permissions: member.roles, // roles is now a string[]
      }))
    );
  } else {
    setTxnCreated(true);
    const changes = updateDaoPolicy(list);
    const updatedPolicy = changes.updatedPolicy;
    const summary = changes.summary;

    const description = {
      title: "Update policy - Members Permissions",
      summary,
    };

    Near.call([
      {
        contractName: treasuryDaoID,
        methodName: "add_proposal",
        args: {
          proposal: {
            description: encodeToMarkdown(description),
            kind: {
              ChangePolicy: {
                policy: updatedPolicy,
              },
            },
          },
        },
        gas: 200000000000000,
        deposit,
      },
    ]);
  }
}

const code = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css"
  rel="stylesheet"
  />
  <script src="https://cdn.jsdelivr.net/npm/big-js@3.1.3/big.min.js"></script>
  <link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
  />
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<style>
  :root {
    --bs-body-bg: ${colors["--bg-page-color"]} !important;
    --bs-border-color: ${colors["--border-color"]} !important;
    --border-color: ${colors["--border-color"]} !important;
    --bs-form-control-disabled-bg: ${colors["--grey-04"]} !important;
}
body {
  background-color: ${colors["--bg-page-color"]} !important;
  color: ${colors["--text-color"]} !important;
  overflow:visible;
}
   
    .error-text {
      color: ${colors["--other-red"]} !important;
      font-size: 0.9rem;
    }
    .select-tag {
      display: inline-flex;
      align-items: center;
      border: 1px solid ${colors["--border-color"]} !important;
      border-radius: 20px;
      padding: 4px 10px;
      margin: 5px 5px 0 0;
      font-size: 14px;
      background-color: ${colors["--grey-04"]} !important;
    }
    

    .role-tag {
      display: inline-flex;
      align-items: center;
      border: 1px solid ${colors["--border-color"]} !important;
      border-radius: 20px;
      padding: 4px 10px;
      margin: 5px 5px 0 0;
      font-size: 14px;
    }
    .role-tag i {
      margin-left: 8px;
      cursor: pointer;
    }
    .account-suggestions {
      display: flex;
      overflow-x: auto;
      gap: 12px;
      white-space: nowrap;
      position: relative;
      max-width: 400px;
    }
    .account-item {
      max-width: 175px;
      flex-grow: 0;
      flex-shrink: 0;
      border: 1px solid ${colors["--border-color"]} !important;
      border-radius: 6px;
      padding: 6px;
      transition: all 200ms;
    }
    .account-item:hover {
      background-color: ${colors["--grey-04"]};
    }
    .account-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
    }
    .cursor-pointer { cursor: pointer; }
    .text-sm {
      font-size: 12px;
  }
  i{
    color: ${colors["--icon-color"]};
 }
 .btn-outline-secondary {
  border-color: ${colors["--border-color"]} !important;
  color: ${colors["--text-color"]} !important;
  border-width: 1px !important;
}
.btn-outline-secondary i {
  color: ${colors["--text-color"]} !important;
}
.btn-outline-secondary:hover {
  color: ${colors["--text-color"]} !important;
  border-color: ${colors["--border-color"]} !important;
  background: ${colors["--grey-035"]} !important;
}

.card{
  border-color: ${colors["--border-color"]} !important;
  border-width: 1px !important;
  border-radius: 16px;
  background-color:${colors["--bg-page-color"]} !important;
}
    .text-secondary {
      color: ${colors["--text-secondary-color"]};
    }
    .dropdown-menu {
      display: none;
      width: 100%;
      background-color: ${colors["--bg-page-color"]} !important;
      color: ${colors["--text-color"]} !important;
  }
  .dropdown-item {
      cursor: pointer;
  }
  .dropdown-item.active,
  .dropdown-item:active {
  background-color: ${colors["--grey-04"]} !important;
  color: inherit !important;
  }
  .dropdown-item:hover,
  .dropdown-item:focus {
      background-color: ${colors["--grey-04"]} !important;
      color: inherit !important;
  }
  .btn {
    padding: 0.5rem 1.2rem !important;
}
.theme-btn {
  background: ${colors["--theme-color"]} !important;
  color: white !important;
  border: none;
}
.theme-btn.btn:hover {
  color: white !important;
  background: ${colors["--theme-color-dark"]} !important;
}
.member-container {
  position: relative; /* still needed for the ::after to be placed correctly */
  background: ${colors["--bg-page-color"]} !important;
}
  .custom-header {
    border: 1px solid ${colors["--border-color"]};
    border-bottom: 0;
    height: 70px;
    background-color: ${colors["--grey-05"]}; 
    z-index: 1;
  }

  /* Inward bottom curve */
  .custom-header::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 11px;
    border-radius: 150rem 150rem 0 0;
    border-top: 1px solid ${colors["--border-color"]};
    background: ${colors["--bg-page-color"]} !important;
  }

  label {
    font-weight: 500;
    margin-bottom: 3px;
    font-size: 14px;
}

.text-red {
  color: ${colors["--other-red"]} ;
}

.text-red i {
  color: ${colors["--other-red"]} ;
}

.error-box {
  background:rgba(217, 92, 74, 0.1);
  color: ${colors["--other-red"]} ;
  padding: 12px;
  font-weight: 500;
  font-size: 13px;
  margin-top:12px;
  i {
          color: ${colors["--other-red"]} !important;
      }
}

}
  </style>
</head>
<body data-bs-theme=${isDarkTheme ? "dark" : "light"}>
  <div class="d-flex flex-column gap-3">
    <div id="membersContainer" class="d-flex flex-column gap-3"></div>
    <button id="addMemberBtn" class="btn btn-outline-secondary" onclick="addMember()"> + Add Another Member</button>
    <div id="rolesError" class="d-none"></div>
    <div class="d-flex justify-content-end gap-2 align-items-center">
      <button  id="cancelBtn" class="btn btn-outline-secondary" onclick="onCancel()">Cancel</button>
      <button id="submitBtn" class="btn theme-btn" onclick="submitForm()">Submit</button>
    </div>
  </div>

  <script>
    let isEdit = false;
    let availableRoles = [];
    let accounts = []
    let allMembers = [];
    let selectedMembers = [];
    const roleDescriptions = {
      Requestor: "Allows to create transaction requests (payments, stake delegation, and asset exchange).",
      Approver: "Allows to vote on transaction requests (payments, stake delegation, and asset exchange).",
      Admin: "Allows to both create and vote on treasury settings (members and permissions, voting policies and duration, and appearance)."
    };

    let memberCount = 0;
    const membersContainer = document.getElementById("membersContainer");

    function isValidNearAccount(account) {
      return (
        account.length === 64 ||
        account.includes(".near") ||
        account.includes(".tg") ||
        account.includes(".aurora")
      );
    }

    function getAllEnteredAccounts(skipIndex) {
      const inputs = document.querySelectorAll("[id^='accountInput-']");
      const accounts = [];
      inputs.forEach((input, idx) => {
        if (idx !== skipIndex) {
          const val = input.value.trim().toLowerCase();
          if (val) accounts.push(val);
        }
      });
      return accounts;
    }    

    function validateMember(index) {
      const input = document.getElementById("accountInput-" + index);
      const error = document.getElementById("accountError-" + index);
      const roleError = document.getElementById("roleError-" + index);
      const selectedRoles = window["selectedRoles_" + index];
      let isValid = true;
    
      const account = input ? input.value.trim() : "";
      const accountLower = account.toLowerCase();
    
      const allAccounts = getAllEnteredAccounts(index); // exclude current index
    
      if (!isEdit) {
        // 1. Empty + no roles
        if (!account && (!selectedRoles || selectedRoles.length === 0)) {
          isValid = false;
        }
    
        // 2. Invalid NEAR account
        if (account.length > 0 && !isValidNearAccount(account) && error) {
          error.textContent = "Please enter a valid account ID.";
          error.classList.remove("d-none");
          isValid = false;
        }
        // 3. Duplicate in current list
        else if (account && allAccounts.includes(accountLower) && error) {
          const firstIndex = getAllEnteredAccounts().indexOf(accountLower);
          if (firstIndex < index) {
            error.textContent = "This account is already added above.";
            error.classList.remove("d-none");
            isValid = false;
          } else {
            error.classList.add("d-none");
          }
        }        
        // 4. Already exists in external list
        else if (allMembers.map(a => (a?.member ?? '').toLowerCase()).includes(accountLower) && error) {
          error.textContent = "This account is already a member.";
          error.classList.remove("d-none");
          isValid = false;
        } else {
          error?.classList.add("d-none");
        }
      }
    
      if ((isEdit || account) && (!selectedRoles || selectedRoles.length === 0)) {
        roleError?.classList.remove("d-none");
        roleError?.classList.add("d-flex");
        isValid = false;
      } else {
        roleError?.classList.remove("d-flex");
        roleError?.classList.add("d-none");
      }
    
      return isValid;
    }    
    
    function updateIframeHeight() {
      const height =
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      )
      // Send the new height to the parent window
      window.parent.postMessage(
      { handler: "updateIframeHeight", height: height },
      "*",
      );
  }

    function validateAllMembers() {
      const memberBlocks = document.querySelectorAll(".member-container");
      let isAllValid = true;
      const roleAssignments = {};
      availableRoles.forEach(function(role) {
        roleAssignments[role.value] = false;
      });
      memberBlocks.forEach(function(_, index) {
        const valid = validateMember(index);
        if (!valid) isAllValid = false;
        const roles = window["selectedRoles_" + index];
        if (roles && roles.length > 0) {
          roles.forEach(function(r) {
            if (roleAssignments.hasOwnProperty(r.value)) {
              roleAssignments[r.value] = true;
            }
          });
        }
      });

      const adminRoleError = document.getElementById("rolesError");
      adminRoleError.innerHTML = "";
      adminRoleError.classList.add("d-none");
      if (isEdit) {
        adminRoleError.innerHTML = ""; // Clear previous errors
      
        // Create a map from member ID to index in selectedMembers
        const selectedIndexMap = new Map(selectedMembers.map((m, i) => [m.member, i]));
      
        const updatedMembers = allMembers.map(member => {
          if (selectedIndexMap.has(member.member)) {
            const i = selectedIndexMap.get(member.member);
            const latestRolesObjects = window["selectedRoles_" + i];
            if (Array.isArray(latestRolesObjects)) {
              const latestRoles = latestRolesObjects.map(roleObj => roleObj.value);
              return {
                ...member,
                roles: latestRoles
              };
            }
          }
          return member;
        });
            
    
        // Validate that every role in availableRoles is assigned to at least one member
        availableRoles.forEach(role => {
          const roleAssigned = updatedMembers.some(m => m.roles.includes(role.value));
          if (!roleAssigned) {
            isAllValid = false;
      
            const msgBox = document.createElement("div");
            msgBox.className = "error-box rounded-3 d-flex align-items-start gap-2 mb-2";
      
            const icon = document.createElement("i");
            icon.className = "bi bi-exclamation-octagon h5 mb-0";
      
            const msgText = document.createElement("div");
            msgText.textContent = "You must assign at least one member with the " + role.title + " role.";
      
            msgBox.appendChild(icon);
            msgBox.appendChild(msgText);
            adminRoleError.appendChild(msgBox);
            adminRoleError.classList.remove("d-none");
          }
        });
      }
      
      
      if (!isEdit) {
        document.getElementById("addMemberBtn").disabled = !isAllValid;
      }
      document.getElementById("submitBtn").disabled = !isAllValid;
      updateIframeHeight();
      return isAllValid;
    }

    async function handleAccountInput(index) {
      const input = document.getElementById("accountInput-" + index);
      const query = input.value.trim().toLowerCase();  

      const filtered = !query.length ? [] : accounts.filter(function(acc) {
        return acc.toLowerCase().includes(query) || acc.toLowerCase().includes(query);
      }).slice(0, 5); // Limit to top 5;
      renderAutocompleteResults(index, filtered);
      validateAllMembers();
    }

    function renderAutocompleteResults(index, filtered) {
      const suggestions = document.getElementById("accountSuggestions-" + index);
      suggestions.innerHTML = "";
      if (filtered.length === 0) {
        suggestions.classList.add("d-none");
        return;
      }
      filtered.forEach(function(acc) {
        const item = document.createElement("div");
        item.className = "account-item";
        item.onclick = function() {
          selectAccount(index, acc);
        };
        item.innerHTML =
        "<div class='d-flex gap-2 p-2 align-items-center'>" +
          "<img src='https://i.near.social/magic/large/https://near.social/magic/img/account/" + acc + "' class='account-avatar' />" +
          "<div class='text-sm text-secondary'>@" + acc + "</div>" +
        "</div>";      
        suggestions.appendChild(item);
      });
      suggestions.classList.remove("d-none");
    }

    function selectAccount(index, accountId) {
      const input = document.getElementById("accountInput-" + index);
      input.value = accountId;
      document.getElementById("accountSuggestions-" + index).classList.add("d-none");
      validateAllMembers();
    }

    function removeMember(index) {
      const memberDiv = document.getElementById("member-" + index);
      if (memberDiv) {
        memberDiv.remove();
        delete window["selectedRoles_" + index];
        validateAllMembers();
      }
    }

    function setCustomHeaderHeights() {
      const headers = document.querySelectorAll(".member-container .custom-header");
      headers.forEach(function (header) {
        header.style.height = isEdit ? "70px" : "60px";
      });
    }

    function addMember(existingMember) {
      const index = memberCount++;
      const memberDiv = document.createElement("div");
      memberDiv.className = "member-container";
      memberDiv.id = "member-" + index;
      const showDelete = !isEdit && index > 0;
      memberDiv.innerHTML =
      '<div class="custom-header px-3 rounded-3">' +
        (isEdit
          ? "<div class='d-flex gap-2 align-items-center' style='padding-top:14px;'>" +
              "<img src='https://i.near.social/magic/large/https://near.social/magic/img/account/" + existingMember.username + "' class='account-avatar' />" +
              "<div class='text-sm text-secondary text-truncate' style='max-width: 400px;'>@" + existingMember.username + "</div>" +
            "</div>"
          : '<div class="d-flex justify-content-between" style="padding-top:12px;">' +
              'Member #' + (index + 1) +
              (index !== 0
                ? '<div class="cursor-pointer text-red" onclick="removeMember(' + index + ')">' +
                    '<i class="bi bi-trash3 h6 mb-0"></i>' +
                  '</div>'
                : '') +
            '</div>') +
      '</div>' +
      '<div class="card p-3 border-top-0 rounded-top-0" style="margin-top: ' +
        (isEdit ? '-15px' : '-5px') +
      ';">' +
        '<div class="d-flex flex-column">' +
          (!isEdit
            ? '<div class="d-flex flex-column gap-1">' +
                '<label>Username</label>' +
                '<div class="input-group">' +
                  '<span class="input-group-text border-end-0">@</span>' +
                  '<input type="text" class="form-control border border-start-0" placeholder="treasury.near" ' +
                  'id="accountInput-' + index + '" maxlength="64" ' +
                  (existingMember ? 'value="' + existingMember.username + '"' : 'oninput="handleAccountInput(' + index + ')"') +
                  '/>' +
                '</div>' +
                '<div id="accountError-' + index + '" class="error-text text-sm d-none">Please enter a valid account ID.</div>' +
                '<div id="accountSuggestions-' + index + '" class="account-suggestions d-none"></div>' +
              '</div>'
            : '') +
          '<div class="position-relative mt-2">' +
            '<label>Permissions</label>' +
            '<div class="d-flex flex-wrap gap-1 align-items-center">' +
              '<div id="selectedRoles-' + index + '"></div>' +
              '<div class="select-tag select-permission d-flex gap-1 align-items-center" onclick="toggleDropdown(' + index + ')" style="cursor:pointer;">' +
                '<i class="bi bi-plus-lg h5 mb-0"></i> Select Permission</div>' +
            '</div>' +
            '<div id="dropdownMenu-' + index + '" class="dropdown-menu rounded-2 dropdown-menu-end dropdown-menu-lg-start px-2 w-100"></div>' +
            '<div id="roleError-' + index + '" class="error-box rounded-3 d-none gap-2 align-items-center">' +
              '<i class="bi bi-exclamation-octagon h5 mb-0"></i>' +
              '<span>You must assign at least one role.</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    
      membersContainer.appendChild(memberDiv);
      window["selectedRoles_" + index] = [];

      if (existingMember) {
        existingMember.roles.forEach(function(r) {
          addRole(index, availableRoles.find(function(role) { return role.value === r; }));
        });
      }
      setCustomHeaderHeights(); 
      validateAllMembers();
    }

    document.addEventListener("click", function (event) {
      const allDropdowns = document.querySelectorAll("[id^='dropdownMenu-']");
    
      allDropdowns.forEach((menu) => {
        const toggleButton = event.target.closest(".select-permission");
        const clickedInsideMenu = menu.contains(event.target);
    
        // Only close if click is outside both dropdown and its toggle button
        if (!clickedInsideMenu && !toggleButton && menu.classList.contains("show")) {
          menu.classList.remove("show");
          menu.removeAttribute("data-open");
        }
      });
    });

    function toggleDropdown(index) {
      const menu = document.getElementById("dropdownMenu-" + index);
      const isNowVisible = menu.classList.toggle("show");
      if (isNowVisible) renderDropdown(index);
      setTimeout(updateIframeHeight, 0);
    }

    function renderDropdown(index) {
      const menu = document.getElementById("dropdownMenu-" + index);
      const selectedRoles = window["selectedRoles_" + index];
      menu.innerHTML = "";
      availableRoles.forEach(function(role) {
        const item = document.createElement("div");
        item.className = "dropdown-item cursor-pointer w-100 my-1";
        item.innerHTML = "<div>" + role.title + "</div>" + (roleDescriptions[role.value]
          ? "<div class='text-secondary text-sm text-wrap'>" + roleDescriptions[role.value] + "</div>"
          : "");

        item.onclick = function() {
          addRole(index, role);
        };
        menu.appendChild(item);
      });
    }

    function addRole(index, role) {
      const selectedRoles = window["selectedRoles_" + index];
    
      // Check if the role already exists
      const alreadyExists = selectedRoles.some(function (r) {
        return r.value === role.value;
      });
    
      if (alreadyExists) {
        return;
      }
    
      selectedRoles.push(role);
      document.getElementById("dropdownMenu-" + index).classList.remove("show");
      renderSelectedRoles(index);
      validateAllMembers();
    }
    

    function removeRole(index, value) {
      let selectedRoles = window["selectedRoles_" + index];
      selectedRoles = selectedRoles.filter(function(r) {
        return r.value !== value;
      });
      window["selectedRoles_" + index] = selectedRoles;
      renderSelectedRoles(index);
      validateAllMembers();
    }

    function renderSelectedRoles(index) {
      const container = document.getElementById("selectedRoles-" + index);
      const selectedRoles = window["selectedRoles_" + index];
      container.innerHTML = "";
      selectedRoles.forEach(function (role) {
        const div = document.createElement("div");
        div.className = "role-tag";
        div.textContent = role.title + " ";
    
        const icon = document.createElement("i");
        icon.className = "bi bi-x-lg";
        icon.style.cursor = "pointer";
        icon.onclick = () => removeRole(index, role.value);
    
        div.appendChild(icon);
        container.appendChild(div);
      });
    }
    

    function submitForm() {
      const members = [];
    
      if (isEdit) {
        // In edit mode, use selectedMembers and update roles from window["selectedRoles_" + i]
        selectedMembers.forEach((member, i) => {
          const latestRolesObjects = window["selectedRoles_" + i];
          const latestRoles = Array.isArray(latestRolesObjects)
            ? latestRolesObjects.map(roleObj => roleObj.value)
            : [];
    
          if (member.member && latestRoles.length > 0) {
            members.push({
              ...member,
              roles: latestRoles
            });
          }
        });
      } else {
        // In create mode, use the DOM inputs
        const totalMembers = document.querySelectorAll(".member-container").length;
    
        for (let i = 0; i < totalMembers; i++) {
          const input = document.getElementById("accountInput-" + i);
          const username = input ? input.value.trim() : "";
    
          const rolesObjects = window["selectedRoles_" + i];
          const roles = Array.isArray(rolesObjects)
            ? rolesObjects.map(role => role.value)
            : [];
    
          if (username && roles.length > 0) {
            members.push({
              member: username,
              roles: roles,
            });
          }
        }
      }
    
      window.parent.postMessage(
        {
          handler: "onSubmit",
          args: members,
        },
        "*"
      );
    }
    
    function onCancel() {
      window.parent.postMessage({ handler: "onCancel" }, "*");
    }
    
    window.addEventListener("message", function (event) {
      if (!availableRoles?.length){
        isEdit = event.data.isEdit;
        accounts = event.data.accounts;
        availableRoles= event.data.availableRoles;
        allMembers = event.data.allMembers;

        if (isEdit) {
          if (Array.isArray(event.data.selectedMembers)) {
            selectedMembers = event.data.selectedMembers;
            event.data.selectedMembers.forEach((i, idx) => {
              addMember({ username: i.member, roles: i.roles });
            });
          }      
          document.getElementById("addMemberBtn").style.display = "none";
        } else {
          addMember();
          document.getElementById("addMemberBtn").disabled = true;
          document.getElementById("submitBtn").disabled = true;
        }
      } else {
        document.getElementById("submitBtn").disabled = event.data.isSubmitLoading;
        document.getElementById("cancelBtn").disabled = event.data.disableCancel;
      }    
  });
    </script>
</body>
</html>
`;

State.init({
  height: "600px",
});

return (
  <div>
    <TransactionLoader
      showInProgress={isTxnCreated}
      cancelTxn={() => setTxnCreated(false)}
    />
    <Widget
      src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
      props={{
        instance,
        heading: "Are you sure you want to cancel?",
        content:
          "This action will clear all the information you have entered in the form and cannot be undone.",
        confirmLabel: "Yes",
        isOpen: showCancelModal,
        onCancelClick: () => setShowCancelModal(false),
        onConfirmClick: () => {
          setShowCancelModal(false);
          onCloseCanvas();
        },
      }}
    />

    <iframe
      srcDoc={code}
      style={{
        height: `${state.height}px`,
        width: "100%",
        border: "none",
        overflow: "hidden",
      }}
      message={{
        isEdit: isEdit,
        accounts: accounts,
        availableRoles: availableRoles,
        allMembers: allMembers,
        selectedMembers: selectedMembers,
        disableCancel: isTxnCreated || showProposalsOverrideConfirmModal,
        isSubmitLoading: isTxnCreated || showProposalsOverrideConfirmModal,
      }}
      onMessage={(e) => {
        switch (e.handler) {
          case "onCancel": {
            setShowCancelModal(true);
            break;
          }
          case "onSubmit": {
            setUpdatedList(e.args);
            if (isTreasuryFactory) {
              onSubmitClick(e.args);
            } else {
              if (proposals.length > 0) {
                setProposals(proposals);
                setShowProposalsOverrideConfirmModal(true);
              } else {
                onSubmitClick(e.args);
              }
            }
            break;
          }
          case "updateIframeHeight": {
            State.update({ height: e.height });
            break;
          }
        }
      }}
    />

    {proposals.length > 0 && (
      <Widget
        src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.Modal`}
        props={{
          instance,
          heading: "Confirm Your Change",
          wider: true,
          content: (
            <Widget
              src={`${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/pages.settings.WarningTable`}
              props={{
                warningText:
                  "This action will override your previous pending proposals. Complete exsisting one before creating a new to avoid conflicting or incomplete updates.",
                tableProps: [{ proposals }],
              }}
            />
          ),
          confirmLabel: "Yes, proceed",
          isOpen: showProposalsOverrideConfirmModal,
          onCancelClick: () => setShowProposalsOverrideConfirmModal(false),
          onConfirmClick: () => {
            setShowProposalsOverrideConfirmModal(false);
            onSubmitClick(updatedList);
          },
        }}
      />
    )}
  </div>
);
