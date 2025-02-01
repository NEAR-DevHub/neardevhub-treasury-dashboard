const { getAllColorsAsObject } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);

const treasuryDaoID = props.treasuryDaoID ?? "";
const instance = props.instance ?? "";
const options = props.options ?? [];
const onSubmit = props.onSubmit ?? (() => {});
const onCancel = props.onCancel ?? (() => {});
const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = JSON.parse(atob(config.metadata ?? ""));
const isDarkTheme = metadata.theme === "dark";

const { themeColor } = VM.require(`${instance}/widget/config.data`) || {
  themeColor: "",
};

if (
  !Array.isArray(options) ||
  !options?.length ||
  typeof getAllColorsAsObject !== "function"
) {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center w-100 h-100">
      <Widget
        src={"${REPL_DEVHUB}/widget/devhub.components.molecule.Spinner"}
      />
    </div>
  );
}
const primaryColor = metadata?.primaryColor
  ? metadata?.primaryColor
  : themeColor;

const colors = getAllColorsAsObject(isDarkTheme, primaryColor);
const code = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dropdown Component</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/big-js@3.1.3/big.min.js"></script>
  <style>

  :root {
    --bs-body-bg: ${colors["--bg-page-color"]} !important;
    --bs-border-color: ${colors["--border-color"]} !important;
  }
  body {
    background-color: ${colors["--bg-page-color"]} !important;
    color: ${colors["--text-color"]} !important;
    overflow-y: hidden;
  }
  label {
    font-weight: 500;
    margin-bottom: 3px;
    font-size: 15px;
  }
  .drop-btn {
    width: 100%;
    text-align: left;
    padding-inline: 10px;
  }
  .dropdown-toggle {
    color: inherit !important;
  }
  .dropdown-toggle:after {
    position: absolute;
    top: 46%;
    right: 5%;
  }
  .dropdown-item {
    font-size: 13px;
  }
  .custom-select {
    position: relative;
  }
  .scroll-box {
    max-height: 200px;
    overflow-y: scroll;
  }
  .selected {
    background-color: ${colors["--grey-04"]};
  }
  .text-wrap {
    overflow: hidden;
    white-space: normal;
  }
  .text-orange {
    color: rgba(255, 149, 0, 1) !important;
  }
  .disabled {
    background-color: ${colors["--grey-04"]} !important;
    color: ${colors["--text-secondary-color"]} !important;
    border-color: ${colors["--border-color"]};
    cursor: not-allowed !important;
    border-radius: 5px;
    opacity: inherit !important;
  }
  .text-green {
    color: ${colors["--other-green"]};
  }
  .input-group {
    position: relative;
  }
  .input-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }
  .amount-input {
    margin-left: 55px !important;
    padding-block: 9px !important;
  }
  .error-message {
    color: red;
    font-size: 0.875rem;
    margin-top: 5px;
  }
  .action-buttons button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .dropdown-menu {
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
  .btn {
    padding: 0.5rem 1.2rem !important;
  }
  .btn, .input-group-text, input, textarea {
    border-color: ${colors["--border-color"]} !important;
  }
  .input-icon {
    background: ${colors["--bg-page-color"]} !important;
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
  .bg-validator-info {
    background:  ${colors["--grey-04"]} !important;
    color: ${colors["--grey-02"]} !important;
    padding-inline: 0.8rem;
    padding-block: 0.5rem;
    font-weight: 500;
    font-size: 13px;
  }

  .use-max-bg {
    color: #007aff;
    cursor: pointer;
  }

  .text-sm {
    font-size: 13px;
  }

  </style>
</head>
<body data-bs-theme=${isDarkTheme ? "dark" : "light"}>
<div class='d-flex flex-column gap-3'>
  <div class="d-flex flex-column">
    <label for="dropdown" class="form-label">Validator</label>
    <div class="custom-select" tabindex="0">
      <div id="dropdown" class="dropdown-toggle bg-dropdown border rounded-2 btn drop-btn" onclick="toggleDropdown()">
        <div id="selectedOption" class="selected-option w-100 text-wrap">Select a validator</div>
      </div>
      <div id="dropdownMenu" class="dropdown-menu dropdown-menu-end dropdown-menu-lg-start px-2" style="display:none;">
        <input id="searchInput" type="text" class="form-control mb-2" placeholder="Search options" onkeyup="handleSearch(event)" />
        <div id="scrollBox" class="scroll-box"></div>
      </div>
    </div>
  </div>

  <div id="validator-info" class="gap-2 align-items-center my-2 rounded-2 bg-validator-info" style="display: none;">
  <i class="bi bi-info-circle h6 mb-0"></i>
  <span id="lockup-message"></span>
</div>
  
  <div class="d-flex flex-column">
  <div class='d-flex justify-content-between'>
    <label for="amount" class="form-label">Amount</label>
    <div id='use-max-amount' class='use-max-bg px-3 py-1 rounded-2' style="display: none;"> Use Max </div>
    </div>
    <div class="input-group">
  <span class="input-group-text input-icon">
    <svg
      width="30"
      height="30"
      viewBox="0 0 32 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="1"
        y="1.5"
        width="30"
        height="30"
        rx="15"
        stroke=${colors["--icon-color"]}
        stroke-width="2"
      />
      <path
        d="M20.8341 9.31248L17.4906 14.2778C17.4364 14.3495 17.4113 14.439 17.4204 14.5284C17.4296 14.6178 17.4722 14.7004 17.5397 14.7597C17.6072 14.8189 17.6947 14.8504 17.7844 14.8477C17.8742 14.8451 17.9596 14.8085 18.0235 14.7454L21.3138 11.9009C21.3328 11.8835 21.3564 11.8721 21.3818 11.868C21.4072 11.8639 21.4333 11.8674 21.4568 11.878C21.4802 11.8886 21.5 11.9058 21.5138 11.9276C21.5275 11.9494 21.5346 11.9747 21.5341 12.0005V20.9409C21.5338 20.968 21.5253 20.9945 21.5096 21.0166C21.4939 21.0388 21.4719 21.0556 21.4464 21.0649C21.4209 21.0742 21.3932 21.0754 21.3669 21.0685C21.3407 21.0616 21.3172 21.0469 21.2996 21.0262L11.3507 9.11514C11.1918 8.92392 10.9931 8.76978 10.7685 8.66352C10.5438 8.55726 10.2987 8.50146 10.0502 8.50003H9.70375C9.25189 8.50003 8.81853 8.67965 8.49902 8.99938C8.1795 9.31911 8 9.75276 8 10.2049V22.7951C8 23.2473 8.1795 23.6809 8.49902 24.0007C8.81853 24.3204 9.25189 24.5 9.70375 24.5C9.9949 24.5 10.2812 24.4253 10.5353 24.283C10.7894 24.1408 11.0028 23.9358 11.1552 23.6876L14.4988 18.7222C14.553 18.6506 14.578 18.561 14.5689 18.4716C14.5598 18.3822 14.5172 18.2996 14.4496 18.2404C14.3821 18.1811 14.2947 18.1497 14.2049 18.1523C14.1151 18.155 14.0297 18.1916 13.9658 18.2547L10.6755 21.0991C10.6566 21.1165 10.6329 21.128 10.6075 21.1321C10.5821 21.1361 10.556 21.1327 10.5326 21.1221C10.5091 21.1115 10.4893 21.0942 10.4755 21.0724C10.4618 21.0506 10.4547 21.0253 10.4553 20.9996V12.068C10.4555 12.0409 10.4641 12.0145 10.4797 11.9923C10.4954 11.9702 10.5175 11.9533 10.543 11.944C10.5684 11.9348 10.5962 11.9335 10.6224 11.9404C10.6486 11.9473 10.6721 11.9621 10.6898 11.9827L20.6387 23.8938C20.7987 24.0833 20.9982 24.2355 21.2231 24.3399C21.448 24.4443 21.693 24.4984 21.9409 24.4982H22.2962C22.52 24.4982 22.7415 24.4541 22.9482 24.3684C23.155 24.2828 23.3428 24.1572 23.501 23.9989C23.6592 23.8406 23.7847 23.6526 23.8703 23.4458C23.9559 23.2389 24 23.0172 24 22.7933V10.2049C24 9.98013 23.9556 9.75756 23.8693 9.55001C23.783 9.34247 23.6566 9.15405 23.4972 8.9956C23.3379 8.83714 23.1488 8.71178 22.9409 8.62674C22.7329 8.54169 22.5102 8.49863 22.2856 8.50003C21.9944 8.50007 21.7082 8.57476 21.4541 8.71699C21.2 8.85922 20.9865 9.06424 20.8341 9.31248Z"
        fill=${colors["--icon-color"]}
      />
    </svg>
  </span>
  <input type="number" id="amount" class="form-control amount-input" placeholder="Enter amount" />
</div>
<div id='available-balance' class='align-items-center text-sm gap-1 text-secondary mt-1' style="display: none;"> Available to unstake: </div>
    <div id="amountError" class="error-message" style="display:none;"></div>
  </div>

  <div class="d-flex flex-column">
    <label for="notes" class="form-label">Notes</label>
    <textarea id="notes" class="form-control" rows="3" placeholder="Enter your notes here..."></textarea>
  </div>

  <div class="d-flex gap-3 align-items-center justify-content-end">
    <button id="cancelBtn" class="btn btn-outline-secondary" onclick="cancelForm()">Cancel</button>
    <button id="submitBtn" class="btn theme-btn" onclick="submitForm()" disabled>Submit</button>
  </div>
</div>

<script>
  let options = [];
  let searchTerm = '';
  let isOpen = false;
  let treasuryDaoID = '';
  let lockupContract = '';
  let selectedWallet = '';
  let selectedOption = null;
  let maxAmount = null;
  let lockupStakedPoolId = null;
  let isStakePage = true;

  // Check if amount exceeds the max value
  function checkAmount() {
    const amountInput = document.getElementById("amount");
    const amountError = document.getElementById("amountError");
    const amountValue = parseFloat(amountInput.value);

    if (typeof maxAmount === "number" &&  amountValue > maxAmount) {
      amountError.textContent = isStakePage ? "Your account doesn't have sufficient balance." : "The amount exceeds the balance you have staked.";
      amountError.style.display = 'block';
      document.getElementById("submitBtn").disabled = true;
    } else {
      amountError.style.display = 'none';
      if(selectedOption){
        document.getElementById("submitBtn").disabled = false;
      }
      
    }
    updateIframeHeight()
  }

  // Add event listener to the Amount input field
  document.getElementById("amount").addEventListener("input", checkAmount);

  // Toggle the dropdown menu visibility
  function toggleDropdown() {
    isOpen = !isOpen;
    document.getElementById("dropdownMenu").style.display = isOpen ? 'block' : 'none';
  }

  // Handle search input
  function handleSearch(event) {
    searchTerm = event.target.value.toLowerCase();
    filterOptions();
  }

  // Filter the options based on search term
  function filterOptions() {
    const filteredOptions = options.filter(option => option.pool_id.toLowerCase().includes(searchTerm));
    displayOptions(filteredOptions);
  }

  function formatNearAmount(amount) {
    return Big(amount ?? "0")
      .div(Big(10).pow(24))
      .toFixed(2);
  }

  // Display filtered options in the dropdown
  function displayOptions(filteredOptions) {
    const scrollBox = document.getElementById("scrollBox");
    scrollBox.innerHTML = ''; // Clear current options
  
    filteredOptions.forEach(option => {
      const optionElement = document.createElement('div');
      optionElement.className = 'dropdown-item cursor-pointer w-100 text-wrap px-3 text-truncate d-flex flex-column gap-1 border-bottom';
      optionElement.style.paddingBlock = '0.8rem';
  
      // Fee and pool_id content
      optionElement.innerHTML = 
        '<div class="d-flex align-items-center gap-2 text-sm">' +
          '<span class="text-secondary">' + option.fee + '% Fee</span>' +
          '<span class="text-green">Active</span>' +
        '</div>' +
        '<div class="h6 mb-0">' + option.pool_id + '</div>';
  
      // Add the balance display section if stakedBalance exists
      if (option.stakedBalance && option.stakedBalance[selectedWallet]) {
        const { stakedBalance, unstakedBalance, availableToWithdrawBalance } = option.stakedBalance[selectedWallet];
        let balanceContainer = '<div class="d-flex flex-column gap-1">';
  
        if (stakedBalance > 1) {
          balanceContainer += 
            '<div class="d-flex align-items-center gap-1 text-sm">' +
              '<div class="text-secondary">Staked:</div>' +
              '<div class="text-orange">' + formatNearAmount(stakedBalance) + ' NEAR</div>' +
            '</div>';
        }
  
        if (unstakedBalance > 1) {
          balanceContainer += 
            '<div class="d-flex align-items-center gap-1 text-sm">' +
              '<div class="text-secondary">Pending release:</div>' +
              '<div class="text-orange">' + formatNearAmount(unstakedBalance) + ' NEAR</div>' +
            '</div>';
        }
  
        if (availableToWithdrawBalance > 1) {
          balanceContainer += 
            '<div class="d-flex align-items-center gap-1 text-sm">' +
              '<div class="text-secondary">Available for withdrawal:</div>' +
              '<div class="text-orange">' + formatNearAmount(availableToWithdrawBalance) + ' NEAR</div>' +
            '</div>';
        }
  
        balanceContainer += '</div>';
        optionElement.innerHTML += balanceContainer;
      }
  
      // Handle the option click
      optionElement.onclick = function() {
        selectOption(option);
        toggleDropdown()
      };
  
      // Append the option to the scroll box
      scrollBox.appendChild(optionElement);
    });
  }

    
  function updateIframeHeight() {
    const height = document.documentElement.scrollHeight || document.body.scrollHeight;
    // Send the new height to the parent window
    window.parent.postMessage({ handler: 'updateIframeHeight', height: height }, '*');
  }    


  // Select an option from the dropdown
  function selectOption(option) {
    selectedOption = option;
    document.getElementById("selectedOption").innerText = option?.pool_id ?? 'Select a validator';
    const useMaxBtn = document.getElementById("use-max-amount"); 
    const availableBalance = document.getElementById("available-balance"); 

    if(option){
      const stakedBalance = formatNearAmount(option?.stakedBalance?.[selectedWallet]?.stakedBalance)
      useMaxBtn.style.display = 'flex';
      availableBalance.innerHTML = "Available to unstake: " + stakedBalance
      availableBalance.style.display = isStakePage ? 'none' : 'flex';
      maxAmount = isStakePage ? maxAmount : parseFloat(stakedBalance) 
      useMaxBtn.onclick = function() {
        const amountInput = document.getElementById("amount");
        amountInput.value = maxAmount;       
        checkAmount() 
      };
    } else {
      useMaxBtn.style.display = 'none';
      availableBalance.style.display = 'none';
    }
    updateIframeHeight()
  }

  function submitForm() {
    const amountInput = document.getElementById("amount");
    const notesInput = document.getElementById("notes");
    window.parent.postMessage(
        { 
            handler: "onSubmit", 
            notes: notesInput.value, 
            amount: amountInput.value, 
            validatorAccount: selectedOption.pool_id 
        }, 
            "*"
        );
  }

    function cancelForm() {
        window.parent.postMessage({ handler: "onCancel" }, "*");
    }

   window.addEventListener(
      "message",
      function (event) {
        treasuryDaoID = event.data.treasuryDaoID;
        lockupContract = event.data.lockupContract;
        lockupStakedPoolId = event.data.lockupStakedPoolId;
        selectedWallet =  event.data.selectedWallet;
        isStakePage = event.data.isStakePage;
        options = event.data.options;
        displayOptions(options);
        maxAmount = event.data.availableBalance ? parseFloat(event.data.availableBalance) : null;
        document.getElementById("submitBtn").disabled = event.data.disbabledActionButtons;
        document.getElementById("cancelBtn").disabled = event.data.disbabledActionButtons;
        if (event.data.selectedValue) {
          // When selectedValue is set, use it and select the option
          selectedOption = event.data.selectedValue;
          selectOption(selectedOption);
        } else {
          selectedOption = null; // Reset selectedOption
          selectOption();
        }
        
        const dropdown = document.getElementById('dropdown');
        if (event.data.disabledDropdown) {
          // Disable the dropdown
          dropdown.classList.add('disabled');
          dropdown.removeAttribute('onclick');
        } else {
          // If disabledDropdown is not set, reset the dropdown to its default state
          dropdown.classList.remove('disabled');
          dropdown.setAttribute('onclick', 'toggleDropdown()');
        } 
        const validatorInfoDiv = document.getElementById("validator-info");
        const lockupMessage = document.getElementById("lockup-message");
        if (selectedWallet && lockupContract && selectedWallet === lockupContract) {
          // Show the div
          validatorInfoDiv.style.display = "flex";
      
          if (lockupStakedPoolId) {
            lockupMessage.innerHTML = '<span>You cannot split your locked funds across multiple validators. To change your validator, please contact our support team.</span>';
          } else {
            lockupMessage.innerHTML = "<span>You cannot split your locked funds across multiple validators. Choose <span class='fw-bold'>one</span> validator from the list. Once you select a validator and click submit, a one-time whitelist request will be created. You\'ll need to approve this request before you can proceed with approving the staking request. <br><br>Note: We currently do not support changing validators through the treasury UI. If you need to change your validator, please contact our team.</span>";
          }
        } else {
          validatorInfoDiv.style.display = "none";
        }
        updateIframeHeight()
      }
    );
</script>
</body>
</html>
`;

State.init({
  height: "350px",
});

return (
  <iframe
    srcDoc={code}
    style={{ width: "100%", height: state.height }}
    message={{
      ...props,
      onCancel: null,
      onSubmit: null,
    }}
    onMessage={(e) => {
      switch (e.handler) {
        case "onCancel": {
          onCancel();
        }
        case "onSubmit": {
          onSubmit(e.validatorAccount, e.amount, e.notes);
        }
        case "updateIframeHeight": {
          State.update({ height: e.height });
        }
      }
    }}
  />
);
