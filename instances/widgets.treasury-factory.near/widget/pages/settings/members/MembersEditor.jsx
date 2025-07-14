const {
  encodeToMarkdown,
  getFilteredProposalsByStatusAndKind,
  getAllColorsAsObject,
  updateDaoPolicy,
} = VM.require("${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common") || {
  getFilteredProposalsByStatusAndKind: () => {},
  getAllColorsAsObject: () => {},
};

const { TransactionLoader } = VM.require(
  `${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/components.TransactionLoader`
) || { TransactionLoader: () => <></> };

const {
  isEdit,
  availableRoles,
  allMembers,
  selectedMembers,
  disableCancel,
  isSubmitLoading,
  isTreasuryFactory,
  daoPolicy,
  treasuryDaoID,
} = props;

const setUpdatedList = props.setUpdatedList || (() => {});
const setShowEditConfirmationModal =
  props.setShowEditConfirmationModal || (() => {});

const setShowEditor = props.setShowEditor || (() => {});

function onSubmitClick(list) {
  if (isTreasuryFactory) {
    props.onFactorySubmit(
      list.map((member) => ({
        accountId: member.member,
        permissions: member.roles,
      }))
    );
  } else {
    setTxnCreated(true);
    const changes = updateDaoPolicy(list, daoPolicy);
    const updatedPolicy = changes.updatedPolicy;
    const summary = changes.summary;

    let title;
    if (isEdit) {
      title = "Update Policy - Edit Members Permissions";
    } else {
      title = "Update Policy - Add New Members";
    }

    const description = {
      title,
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
        deposit: daoPolicy?.proposal_bond || 0,
      },
    ]);
  }
}

const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;

const metadata = JSON.parse(atob(config.metadata ?? ""));
const isDarkTheme = metadata.theme === "dark";

const primaryColor = metadata?.primaryColor
  ? metadata?.primaryColor
  : themeColor;
const colors = getAllColorsAsObject(isDarkTheme, primaryColor) || {};
const [showCancelModal, setShowCancelModal] = useState(false);
const [isTxnCreated, setTxnCreated] = useState(false);
const [showErrorToast, setShowErrorToast] = useState(false);
const [updatedData, setUpdatedData] = useState(null);
const [lastProposalId, setLastProposalId] = useState(null);

function getLastProposalId() {
  return Near.asyncView(treasuryDaoID, "get_last_proposal_id").then(
    (result) => result
  );
}

useEffect(() => {
  if (!isTreasuryFactory) {
    getLastProposalId().then((i) => {
      setLastProposalId(i);
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
          props.updateLastProposalId(id);
          props.setToastStatus(true);
          clearTimeout(checkTxnTimeout);
          setTxnCreated(false);
          setShowEditor(false);
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
}, [isTxnCreated, lastProposalId, treasuryDaoID]);

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
         padding-bottom:80px;
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
         background: ${colors["--bg-page-color"]} !important;
         }
         .custom-header {
         border: 1px solid ${colors["--border-color"]};
         border-bottom: 0;
         height: 70px;
         background-color: ${colors["--grey-05"]}; 
         z-index: 1;
         position: relative;
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
         .input-group-text{
         background: ${colors["--bg-page-color"]} !important;
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
         .warning-box{
         background: rgba(255, 158, 0, 0.1);
         color: ${colors["--other-warning"]} ;
         padding: 12px;
         font-weight: 500;
         font-size: 13px;
         margin-top:12px;
         i {
         color: ${colors["--other-warning"]} !important;
         }
         }
         .select-tag.disabled {
         pointer-events: none;
         opacity: 0.5;
         cursor: not-allowed;
         }
         .account-info {
          min-width: 0;
          flex: 1;
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
      let allMembers = [];
      let selectedMembers = [];
      let cachedProfilesData = null;
      const NEARN_ACCOUNT_ID = "nearn-io.near";
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
        const inputs = document.querySelectorAll("input[id^='accountInput-']");
        const accounts = [];
      
        inputs.forEach((input, idx) => {
          if (idx === skipIndex) return;
      
          // Use offsetParent to check if visible (works even if hidden via class/CSS)
          if (input.offsetParent === null) return;
      
          const val = input.value.trim().toLowerCase();
          if (val) accounts.push(val);
        });
      
        return accounts;
      }
      
      
      
      function validateMember(index) {
        const input = document.getElementById("accountInput-" + index);
        const error = document.getElementById("accountError-" + index);
        const roleError = document.getElementById("roleError-" + index);
        const selectedRoles = window["selectedRoles_" + index];
        let isValid = true;
        let errorMessage = "";
      
        const account = input ? input.value.trim() : "";
        const accountLower = account.toLowerCase();
      
        const allAccounts = getAllEnteredAccounts(index); // exclude current index
      
        if (!isEdit) {
          // 1. Empty + no roles
          if (!account && (!selectedRoles || selectedRoles.length === 0)) {
            isValid = false;
            errorMessage = "Username and Permissions are missing.";
          }
      
          // 2. Invalid NEAR account
          else if (account.length > 0 && !isValidNearAccount(account) && error) {
            error.textContent = "Please enter a valid account ID.";
            error.classList.remove("d-none");
            isValid = false;
            errorMessage = "Please enter a valid account ID.";
          }
          
          // 3. Duplicate in current list
          else if (account && allAccounts.includes(accountLower) && error) {
            // Find the first visible member with this account (excluding current member)
            const allVisibleInputs = document.querySelectorAll("input[id^='accountInput-']");
            let firstDuplicateIndex = -1;
            
            for (let i = 0; i < allVisibleInputs.length; i++) {
              if (i === index) continue; // Skip current member
              
              const input = allVisibleInputs[i];
              if (input.offsetParent === null) continue; // Skip hidden members
              
              const inputVal = input.value.trim().toLowerCase();
              if (inputVal === accountLower) {
                firstDuplicateIndex = i;
                break;
              }
            }
            
            // Only show error if this member has a higher index than the first duplicate
            if (firstDuplicateIndex >= 0 && index > firstDuplicateIndex) {
              error.textContent = "This account is already added above.";
              error.classList.remove("d-none");
              isValid = false;
              errorMessage = "This account is already added above.";
            } else {
              error.classList.add("d-none");
            }
          }        
          // 4. Already exists in external list
          else if (!isEdit && allMembers.map(a => (a?.member ?? '').toLowerCase()).includes(accountLower) && error) {
            error.textContent = "This account is already a member.";
            error.classList.remove("d-none");
            isValid = false;
            errorMessage = "This account is already a member.";
          } else {
            error?.classList.add("d-none");
          }
        }
      
        if ((isEdit || account) && (!selectedRoles || selectedRoles.length === 0)) {
          roleError?.classList.remove("d-none");
          roleError?.classList.add("d-flex");
          isValid = false;
          if (!errorMessage) {
            errorMessage = "The Permissions are missing.";
          }
        } else {
          roleError?.classList.remove("d-flex");
          roleError?.classList.add("d-none");
        }
      
        return { isValid, errorMessage };
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
      const errorMessages = [];
      availableRoles.forEach(function(role) {
        roleAssignments[role.value] = false;
      });
      
      memberBlocks.forEach(function(el, index) {
        if (el.style.display === 'none') return; // Skip removed members
      
        const validation = validateMember(index);
        if (!validation.isValid) {
          isAllValid = false;
          const memberLabel = el.querySelector("#memberLabel-" + index);
          const memberNumber = memberLabel ? memberLabel.textContent : "Member #" + (index + 1);
          errorMessages.push(memberNumber + " - " + validation.errorMessage);
        }
      
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
        adminRoleError.innerHTML = "";
      
        const selectedIndexMap = new Map(selectedMembers.map((m, i) => [m.member, i]));
      
        const updatedMembers = allMembers.map(member => {
          const i = selectedIndexMap.get(member.member);
          if (typeof i !== 'undefined') {
            const block = document.getElementById("member-" + i);
            if (block && block.style.display !== 'none') {
              const latestRolesObjects = window["selectedRoles_" + i];
              if (Array.isArray(latestRolesObjects)) {
                const latestRoles = latestRolesObjects.map(roleObj => roleObj.value);
                return { ...member, roles: latestRoles };
              }
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
      
      // Show error messages in bottom error box
      if (!isAllValid && errorMessages.length > 0) {
        const errorBox = document.createElement("div");
        errorBox.className = "error-box rounded-3 d-flex align-items-start gap-2 mb-2";
        
        const icon = document.createElement("i");
        icon.className = "bi bi-exclamation-octagon h5 mb-0";
        
        const errorContent = document.createElement("div");
        errorContent.innerHTML = "<div class='mb-2'><strong>Please complete all member details before proceeding</strong></div>" +
          errorMessages.map(function(msg) { return "<div>" + msg + "</div>"; }).join("");
        
        errorBox.appendChild(icon);
        errorBox.appendChild(errorContent);
        adminRoleError.appendChild(errorBox);
        adminRoleError.classList.remove("d-none");
      }
      
      updateIframeHeight();
      return isAllValid;
      }
      
      async function fetchProfileData() {
        if (cachedProfilesData) return; // Already fetched
        
        try {
          const response = await fetch('https://api.near.social/get', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              "keys": ["*/profile/name"]
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            cachedProfilesData = data;
            console.log('Profile data loaded:', Object.keys(data).length, 'profiles');
          } else {
            console.error('Failed to fetch profiles:', response.status);
          }
        } catch (error) {
          console.error('Error fetching profiles:', error);
        }
      }
      
      function updateNearnWarning(index) {
        let account = '';
        const input = document.getElementById("accountInput-" + index);
        if (input) {
          account = input.value.trim().toLowerCase();
        } else if (typeof selectedMembers !== 'undefined' && selectedMembers[index]) {
          account = (selectedMembers[index].member || '').toLowerCase();
        }
        const isNearnAccount = account === NEARN_ACCOUNT_ID;
        const nearnWarning = document.getElementById("nearnWarning-" + index);
        if (nearnWarning) {
          if (isNearnAccount) {
            nearnWarning.classList.add("d-flex");
            nearnWarning.classList.remove("d-none");
          } else {
            nearnWarning.classList.remove("d-flex");
            nearnWarning.classList.add("d-none");
          }
        }
        updateAddPermissionButtonVisibility(index);
        renderDropdown(index);
      }
      
      async function handleAccountInput(index) {
        const input = document.getElementById("accountInput-" + index);
        const query = input.value.trim().toLowerCase();  
      
        // Clear errors when user starts typing
        const error = document.getElementById("accountError-" + index);
        if (error) {
          error.classList.add("d-none");
        }
        
        // Clear bottom error box
        const adminRoleError = document.getElementById("rolesError");
        if (adminRoleError) {
          adminRoleError.innerHTML = "";
          adminRoleError.classList.add("d-none");
        }
      
        if (query.length === 0) {
          renderAutocompleteResults(index, []);
          updateNearnWarning(index);
          return;
        }
        
        if (cachedProfilesData) {
          filterAndRenderResults(index, query, cachedProfilesData);
        } else {
          await fetchProfileData();
          if (cachedProfilesData) {
            filterAndRenderResults(index, query, cachedProfilesData);
          }
        }
        
        setTimeout(updateIframeHeight, 0);
        updateNearnWarning(index);
      }
      
      function filterAndRenderResults(index, query, data) {
        const filtered = [];
        
        Object.keys(data).forEach(accountId => {
          if (accountId.toLowerCase().includes(query)) {
            const profile = data[accountId]?.profile;
            if (profile) {
              filtered.push({
                accountId: accountId,
                name: profile.name || accountId
              });
            }
          }
        });
        
        // Limit to top 7 results
        renderAutocompleteResults(index, filtered.slice(0, 7));
      }
      
      function renderAutocompleteResults(index, filtered) {
        const suggestions = document.getElementById("accountSuggestions-" + index);
        suggestions.innerHTML = "";
        if (filtered.length === 0) {
          suggestions.classList.add("d-none");
          suggestions.classList.remove("mt-2");
          return;
        }
        filtered.forEach(function(acc) {
          const item = document.createElement("div");
          item.className = "account-item";
          item.onclick = function() {
            selectAccount(index, acc.accountId);
          };
          item.innerHTML =
          "<div class='d-flex gap-2 p-2 align-items-center'>" +
            "<img src='https://i.near.social/magic/large/https://near.social/magic/img/account/" + acc.accountId + "' class='account-avatar' />" +
            "<div class='d-flex flex-column text-sm text-secondary account-info'>" +
              "<div class='text-truncate'>" + acc.name + "</div>" +
              "<div class='text-truncate'>@" + acc.accountId + "</div>" +
            "</div>" +
          "</div>";      
          suggestions.appendChild(item);
        });
        suggestions.classList.remove("d-none");
        suggestions.classList.add("mt-2");
        setTimeout(updateIframeHeight, 0);
      }
      
      function selectAccount(index, accountId) {
        const input = document.getElementById("accountInput-" + index);
        input.value = accountId;
        document.getElementById("accountSuggestions-" + index).classList.add("d-none");
        
        // Clear errors when user selects an account
        const error = document.getElementById("accountError-" + index);
        if (error) {
          error.classList.add("d-none");
        }
        
        // Clear bottom error box
        const adminRoleError = document.getElementById("rolesError");
        if (adminRoleError) {
          adminRoleError.innerHTML = "";
          adminRoleError.classList.add("d-none");
        }
        
        setTimeout(updateIframeHeight, 0);
        updateNearnWarning(index);
      }
      
      function removeMember(index) {
          const member = document.getElementById('member-' + index);
          if (!member) return;
        
          member.style.display = 'none';
          member.classList.add('removed');
        
           // Clear bottom error box when member is removed
          const adminRoleError = document.getElementById("rolesError");
          if (adminRoleError) {
            adminRoleError.innerHTML = "";
            adminRoleError.classList.add("d-none");
          }
            
          const visibleMembers = document.querySelectorAll('.member-container:not([style*="display: none"])');
          let visiblePosition = 1;
        
          visibleMembers.forEach(function(el) {
            // Extract the actual member index from the element ID (array position)
            const memberId = el.id;
            const memberIndex = memberId.replace('member-', '');
            const label = el.querySelector('#memberLabel-' + memberIndex);
            if (label) {
              label.textContent = 'Member #' + (visiblePosition);
              visiblePosition++;
            }
      
            const btn = el.querySelector('.remove-member-btn');
            if (btn) {
              btn.setAttribute('onclick', 'removeMember(' + memberIndex + ')');
            }
          });
          setTimeout(updateIframeHeight, 0);
        }
        
        
      function setCustomHeaderHeights() {
        const headers = document.querySelectorAll(".member-container .custom-header");
        headers.forEach(function (header) {
          header.style.height = isEdit ? "70px" : "60px";
        });
      }
      
      function addMember(existingMember) {
        const index = memberCount++;
        // Calculate visible numbering: allMembers.length + visible position
        const visibleMembers = document.querySelectorAll(".member-container:not([style*='display: none'])");
        const visiblePosition = visibleMembers.length + 1;
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
            '<span id="memberLabel-' + index + '">Member #' + (visiblePosition) + '</span>' +
                (index !== 0
                  ? '<div class="cursor-pointer text-red remove-member-btn" onclick="removeMember(' + index + ')">' +
                      '<i class="bi bi-trash3 h6 mb-0"></i>' +
                    '</div>'
                  : '') +
              '</div>') +
        '</div>' +
        '<div class="card p-3 border-top-0 rounded-top-0" style="margin-top: ' +
          (isEdit ? '-25px' : '-15px') +
        ';">' +
          '<div class="d-flex flex-column">' +
            (!isEdit
              ? '<div class="d-flex flex-column gap-1">' +
                  '<label>Username</label>' +
                  '<div class="input-group">' +
                    '<span class="input-group-text border-end-0">@</span>' +
                    '<input type="text" class="form-control border border-start-0" placeholder="treasury.near" ' +
                    'id="accountInput-' + index + '" maxlength="64" ' +
                    (existingMember ? 'value="' + existingMember.username + '" ' : '') +
                    'oninput="handleAccountInput(' + index + ')" />' +
                  '</div>' +
                  '<div id="accountError-' + index + '" class="error-text text-sm d-none">Please enter a valid account ID.</div>' +
                  '<div id="accountSuggestions-' + index + '" class="account-suggestions d-none"></div>' +
                '</div>'
              : '') +
              '<div class="position-relative mt-2">' +
              '<label>Permissions</label>' +
              '<div class="d-flex flex-wrap gap-1 align-items-center">' +
                '<div id="selectedRoles-' + index + '"></div>' +
                '<div id="selectTag-' + index + '" class="select-tag select-permission d-flex gap-1 align-items-center" onclick="toggleDropdown(' + index + ')" style="cursor:pointer;">' +
                  '<i class="bi bi-plus-lg h5 mb-0"></i> Add Permission</div>' +
              '</div>' +
              '<div id="dropdownMenu-' + index + '" class="dropdown-menu rounded-2 dropdown-menu-end dropdown-menu-lg-start px-2 w-100"></div>' +
               '<div id="roleError-' + index + '" class="error-box rounded-3 d-none gap-2 align-items-center">' +
                '<i class="bi bi-exclamation-octagon h5 mb-0"></i>' +
                '<span>You must assign at least one role.</span>' +
              '</div>' +
              '<div id="nearnWarning-' + index + '" class="warning-box rounded-3 d-none gap-2 align-items-center">' +
                '<i class="bi bi-exclamation-triangle h5 mb-0"></i>' +
                '<span>Only the Requestor role can be assigned to this member, enabling them to create requests in NEARN.</span>' +
              '</div>' +
            
            '</div>'          
          '</div>' +
        '</div>';
      
        membersContainer.appendChild(memberDiv);
        window["selectedRoles_" + index] = [];
      
        if (existingMember) {
          existingMember.roles.forEach(function(r) {
            addRole(index, availableRoles.find(function(role) { return (role.value).toLowerCase() === (r || '').toLowerCase(); }));
          });
          updateAddPermissionButtonVisibility(index);
          validateMember(index);
          updateNearnWarning(index);
        }
        setCustomHeaderHeights(); 
        setTimeout(updateIframeHeight, 0);
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
        
        // Get the account for this member
        let account = '';
        const input = document.getElementById("accountInput-" + index);
        if (input) {
          account = input.value.trim().toLowerCase();
        } else if (typeof selectedMembers !== 'undefined' && selectedMembers[index]) {
          account = (selectedMembers[index].member || '').toLowerCase();
        }
        const isNearnAccount = account === NEARN_ACCOUNT_ID;

        // Filter out already selected roles
        const availableRolesToShow = availableRoles.filter(function(role) {
          return !selectedRoles.some(function(selectedRole) {
            return selectedRole.value === role.value;
          });
        });
        
        availableRolesToShow.forEach(function(role) {
          const item = document.createElement("div");
          let isDisabled = false;
          if (isNearnAccount && role.value !== "Requestor") {
            isDisabled = true;
            item.className = "dropdown-item w-100 my-1 disabled";
            item.style.pointerEvents = "none";
            item.style.opacity = 0.5;
          } else {
            item.className = "dropdown-item cursor-pointer w-100 my-1";
          }
          item.innerHTML = "<div>" + role.title + "</div>" + (roleDescriptions[role.value]
            ? "<div class='text-secondary text-sm text-wrap'>" + roleDescriptions[role.value] + "</div>"
            : "");
          if (!isDisabled) {
            item.onclick = function() {
              addRole(index, role);
            };
          }
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
      
        // Clear role error when user adds a role
        const roleError = document.getElementById("roleError-" + index);
        if (roleError) {
          roleError.classList.remove("d-flex");
          roleError.classList.add("d-none");
        }
        
        // Clear bottom error box
        const adminRoleError = document.getElementById("rolesError");
        if (adminRoleError) {
          adminRoleError.innerHTML = "";
          adminRoleError.classList.add("d-none");
        }
      
        selectedRoles.push(role);
        document.getElementById("dropdownMenu-" + index).classList.remove("show");
        renderSelectedRoles(index);
        setTimeout(updateIframeHeight, 0);
      }
      
      
      function removeRole(index, value) {
        let selectedRoles = window["selectedRoles_" + index];
        selectedRoles = selectedRoles.filter(function(r) {
          return r.value !== value;
        });
        window["selectedRoles_" + index] = selectedRoles;
        renderSelectedRoles(index);
        setTimeout(updateIframeHeight, 0);
      }
      
      function updateAddPermissionButtonVisibility(index) {
        const selectedRoles = window["selectedRoles_" + index];
        const selectTag = document.getElementById("selectTag-" + index);
        // Get the account for this member
        let account = '';
        const input = document.getElementById("accountInput-" + index);
        if (input) {
          account = input.value.trim().toLowerCase();
        } else if (typeof selectedMembers !== 'undefined' && selectedMembers[index]) {
          account = (selectedMembers[index].member || '').toLowerCase();
        }
        const isNearnAccount = account === NEARN_ACCOUNT_ID;
        if (selectTag) {
          if (isNearnAccount) {
            // Only show if Requestor is not already selected
            if (selectedRoles.some(r => r.value === "Requestor")) {
              selectTag.classList.add("d-none");
            } else {
              selectTag.classList.remove("d-none");
              selectTag.classList.remove("disabled");
              selectTag.classList.add("d-flex");
            }
          } else {
            // For other accounts, show only if not all roles are selected
            if (selectedRoles.length >= availableRoles.length) {
              selectTag.classList.add("d-none");
            } else {
              selectTag.classList.remove("d-none");
              selectTag.classList.remove("disabled");
              selectTag.classList.add("d-flex");
            }
          }
        }
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
        updateAddPermissionButtonVisibility(index);
        setTimeout(updateIframeHeight, 0);
      }
      
      
      function submitForm() {
        // Validate all members before submitting
        const isValid = validateAllMembers();
        
        if (!isValid) {
          // Don't submit if validation fails
          return;
        }
        
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
              const memberBlocks = document.querySelectorAll(".member-container");
            
              memberBlocks.forEach((block, i) => {
                if (block.style.display === "none") return; // Skip hidden/removed members
            
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
              });
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
        if (!availableRoles.length) {
          isEdit = event.data.isEdit;
          availableRoles = event.data.availableRoles;
          allMembers = event.data.allMembers || [];
        
          if (Array.isArray(event.data.selectedMembers) && event.data.selectedMembers.length > 0) {
            selectedMembers = event.data.selectedMembers;
        
            event.data.selectedMembers.forEach((i) => {
              addMember({ username: i.member, roles: i.roles });
            });
        
            if (isEdit) {
              document.getElementById("addMemberBtn").style.display = "none";
            }
        
          } else {
            addMember();
          }
          fetchProfileData();
        } else {
          // Handle update to buttons only when availableRoles is already set
          document.getElementById("submitBtn").disabled = !!event.data.isSubmitLoading;
          document.getElementById("cancelBtn").disabled = !!event.data.disableCancel;
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
          setShowEditor(false);
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
        isEdit,
        availableRoles,
        allMembers,
        selectedMembers,
        disableCancel,
        isSubmitLoading,
      }}
      onMessage={(e) => {
        switch (e.handler) {
          case "onCancel": {
            setShowCancelModal(true);
            break;
          }
          case "onSubmit": {
            if (isTreasuryFactory) {
              onSubmitClick(e.args);
            } else {
              if (isEdit) {
                setUpdatedList(e.args);
                setShowEditConfirmationModal(true);
                setShowEditor(false);
              } else {
                setTxnCreated(true);
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
  </div>
);
