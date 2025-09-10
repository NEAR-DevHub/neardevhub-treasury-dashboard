const { getAllColorsAsObject } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const { getIntentsBalances } = VM.require(
  "${REPL_BASE_DEPLOYMENT_ACCOUNT}/widget/lib.common"
);
const instance = props.instance;
if (!instance) {
  return <></>;
}

const { treasuryDaoID } = VM.require(`${instance}/widget/config.data`);
const config = treasuryDaoID ? Near.view(treasuryDaoID, "get_config") : null;
const metadata = JSON.parse(atob(config.metadata ?? ""));
const isDarkTheme = metadata.theme === "dark";
const onSubmit = props.onSubmit ?? (() => {});
const onCancel = props.onCancel ?? (() => {});

const { themeColor } = VM.require(`${instance}/widget/config.data`) || {
  themeColor: "",
};
const primaryColor = metadata?.primaryColor
  ? metadata?.primaryColor
  : themeColor;

const colors = getAllColorsAsObject(isDarkTheme, primaryColor);
const nearblocksKey = "${REPL_NEARBLOCKS_KEY}";

const code = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css"
            rel="stylesheet"
            />
            <script src="https://cdn.jsdelivr.net/npm/big-js@3.1.3/big.min.js"></script>
        <script type="module">
            // Import Web3Icons libraries for network name resolution
            import('https://cdn.jsdelivr.net/npm/@web3icons/common@0.11.12/dist/index.min.js').then(module => {
                window.web3IconsCommon = module;
                console.log('Web3Icons Common loaded with', module.networks?.length || 0, 'networks and', module.tokens?.length || 0, 'tokens');
                // Check if both are loaded
                if (window.web3IconsCore) {
                    loadTokenIcons();
                }
            }).catch(err => {
                console.error('Failed to load Web3Icons Common:', err);
            });
            import('https://cdn.jsdelivr.net/npm/@web3icons/core@4.0.15/+esm').then(module => {
                window.web3IconsCore = module;
                console.log('Web3Icons Core loaded with svgs:', module.svgs ? 'available' : 'not available');
                // Check if both are loaded
                if (window.web3IconsCommon) {
                    loadTokenIcons();
                }
            }).catch(err => {
                console.error('Failed to load Web3Icons Core:', err);
            });
        </script>
            <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
            />
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

            <title>1Click Exchange</title>
            <style>
            :root {
                --bs-body-bg: ${colors["--bg-page-color"]} !important;
                --bs-border-color: ${colors["--border-color"]} !important;
                --border-color: ${colors["--border-color"]} !important;
                --bs-form-control-disabled-bg: ${
                  colors["--grey-04"]
                } !important;
            }
            body {
                background-color: ${colors["--bg-page-color"]} !important;
                color: ${colors["--text-color"]} !important;
                overflow-y: hidden;
            }
            .info-message {
                background-color: ${colors["--grey-04"]};
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            .info-icon {
                color: ${colors["--text-secondary-color"]};
                font-size: 20px;
                margin-top: 2px;
            }
            .info-text {
                color: ${colors["--text-color"]};
                font-size: 14px;
                line-height: 1.5;
            }
            .exchange-sections {
                position: relative;
            }
            .send-section {
                background-color: ${colors["--bg-page-color"]};
                border: 1px solid ${colors["--border-color"]};
                border-radius: 12px;
                padding: 20px;
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-bottom: none;
            }
            .receive-section {
                background-color: ${colors["--bg-system-color"]};
                border: 1px solid ${colors["--border-color"]};
                border-radius: 12px;
                padding: 20px;
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }
            .section-label {
                color: ${colors["--text-secondary-color"]};
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 12px;
            }
            .input-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }
            .amount-input {
                flex: 1;
            }
            .amount-input input {
                background: transparent;
                border: none;
                font-size: 24px;
                font-weight: 500;
                padding: 0;
                color: ${colors["--text-color"]};
                width: 100%;
            }
            .amount-input input:focus {
                outline: none;
                box-shadow: none;
            }
            .amount-input input::placeholder {
                color: ${colors["--text-secondary-color"]};
            }
            .token-dropdown {
                flex: 0 0 auto;
                position: relative;
            }
            .dropdown-toggle {
                background-color: ${colors["--bg-page-color"]};
                border: 1px solid ${colors["--border-color"]};
                border-radius: 8px;
                padding: 8px 16px;
                min-width: 150px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                justify-content: space-between;
                color: ${colors["--text-color"]};
            }
            .dropdown-toggle span {
                color: ${colors["--text-color"]};
            }
            .dropdown-toggle::after {
                display: none !important;
            }
            #send-token-display::after,
            #receive-token-display::after,
            #network-display::after {
                display: none !important;
            }
            .dropdown-menu {
                display: none;
                position: absolute;
                right: 0;
                width: 300px;
                max-height: 350px;
                background-color: ${colors["--bg-page-color"]};
                border: 1px solid ${colors["--border-color"]};
                border-radius: 8px;
                margin-top: 4px;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .dropdown-menu.show {
                display: block;
            }
            .scroll-box {
                max-height: 250px;
                overflow-y: auto;
            }
            .text-secondary {
                color: ${colors["--text-secondary-color"]} !important;
            }
            .fw-semibold {
                font-weight: 600;
            }
            .px-3 {
                padding-left: 1rem !important;
                padding-right: 1rem !important;
            }
            .py-2 {
                padding-top: 0.5rem !important;
                padding-bottom: 0.5rem !important;
            }
            .dropdown-search {
                padding: 8px;
                border-bottom: 1px solid ${colors["--border-color"]};
            }
            .dropdown-search input {
                width: 100%;
                padding: 8px;
                border: 1px solid ${colors["--border-color"]};
                border-radius: 4px;
                background-color: ${colors["--bg-page-color"]};
                color: ${colors["--text-color"]};
            }
            .dropdown-item {
                padding: 8px 12px;
                cursor: pointer;
                color: ${colors["--text-color"]};
            }
            .dropdown-item:hover {
                background-color: ${colors["--grey-04"]};
            }
            .dropdown-item.selected {
                background-color: ${colors["--grey-035"]};
            }
            .d-flex {
                display: flex !important;
            }
            .justify-content-between {
                justify-content: space-between !important;
            }
            .align-items-center {
                align-items: center !important;
            }
            .gap-2 {
                gap: 0.5rem !important;
            }
            .text-muted {
                color: ${colors["--text-secondary-color"]} !important;
            }
            .text-sm {
                font-size: 0.875rem !important;
            }
            .mb-0 {
                margin-bottom: 0 !important;
            }
            h6 {
                font-size: 1rem;
                font-weight: 600;
                color: ${colors["--text-color"]};
                margin: 0;
            }
            .value-display {
                color: ${colors["--text-secondary-color"]};
                font-size: 14px;
                margin-top: 4px;
            }
            .swap-divider {
                position: relative;
                height: 1px;
                background-color: ${colors["--border-color"]};
                margin: 0;
            }
            .swap-icon-container {
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                background-color: ${colors["--bg-page-color"]};
                border: 1px solid ${colors["--border-color"]};
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1;
            }
            .swap-icon-container i {
                color: ${colors["--text-secondary-color"]};
                font-size: 20px;
            }
            .form-section {
                margin-bottom: 24px;
            }
            .form-label {
                color: ${colors["--text-color"]};
                font-weight: 500;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .helper-text {
                color: ${colors["--text-secondary-color"]};
                font-size: 13px;
                margin-top: 4px;
            }
            .quote-display {
                margin-bottom: 24px;
            }
            .warning-box {
                background: rgba(255, 158, 0, 0.1);
                color: ${colors["--other-warning"]};
                padding-inline: 0.8rem;
                padding-block: 0.5rem;
                font-weight: 500;
                font-size: 13px;
                border-radius: 0.5rem;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .warning-box i {
                color: ${colors["--other-warning"]} !important;
                font-size: 1.2rem;
            }
            .collapse-container {
                border-radius: 0.5rem;
                border: 1px solid var(--border-color);
            }
            .collapse-container.collapse-shown {
                border-bottom: none !important;
                border-radius: 0.5rem 0.5rem 0 0;
            }
            .toggle-header {
                padding-block: 0.6rem;
                padding-inline: 0.6rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background-color: ${colors["--grey-04"]};
                border-radius: 0.5rem;
            }
            .collapse-container.collapse-shown .toggle-header {
                border-radius: 0.5rem 0.5rem 0 0;
            }
            .exchange-rate-display {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 14px;
                color: ${colors["--text-color"]};
                cursor: pointer;
            }
            .rate-warning {
                color: ${colors["--other-red"]};
            }
            .details-toggle-btn {
                display: flex;
                gap: 0.5rem;
                align-items: center;
                cursor: pointer;
                color: ${colors["--text-color"]};
                font-size: 14px;
            }
            #exchange-details-collapse.show {
                border-top: 1px solid var(--border-color);
            }
            .collapse-item {
                display: flex;
                justify-content: space-between;
                width: 100%;
                align-items: center;
                gap: 0.5rem;
                border: 1px solid var(--border-color);
                border-top: none;
                padding-block: 0.6rem;
                padding-inline: 0.6rem;
                background-color: ${colors["--bg-system-color"]};
            }
            .collapse-item:last-child {
                border-radius: 0 0 0.5rem 0.5rem;
            }
            .detail-label {
                display: flex;
                gap: 0.5rem;
                align-items: center;
                color: ${colors["--text-secondary-color"]};
                font-size: 14px;
            }
            .detail-value {
                color: ${colors["--text-color"]};
                font-size: 14px;
            }
            .text-green {
                color: ${colors["--other-green"]};
            }
            .text-red {
                color: ${colors["--other-red"]};
            }
            .text-warning {
                color: ${colors["--other-warning"]};
            }
            .error-message {
                background-color: rgba(220, 53, 69, 0.1);
                border: 1px solid ${colors["--other-red"]};
                color: ${colors["--other-red"]};
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .spinner-border {
                color: ${colors["--theme-color"]};
            }
            .btn {
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .btn-outline-secondary {
                background: transparent;
                border: 1px solid ${colors["--border-color"]};
                color: ${colors["--text-color"]};
            }
            .btn-outline-secondary:hover {
                background: ${colors["--grey-04"]};
                color: ${colors["--text-color"]};
            }
            .btn-primary {
                background: ${colors["--theme-color"]};
                border: none;
                color: white;
            }
            .btn-primary:hover:not(:disabled) {
                background: ${colors["--theme-color-dark"]};
            }
            .btn-primary:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .btn-success {
                background: ${colors["--other-green"]};
                border: none;
                color: white;
            }
            .btn-success:hover:not(:disabled) {
                opacity: 0.9;
            }
            .custom-tooltip {
                --bs-tooltip-bg: ${colors["--bg-page-color"]};
                --bs-tooltip-color: ${colors["--text-color"]};
                width: 300px;
                font-size: 13px;
                z-index: 1055;
            }
            .tooltip-inner {
                border: 1px solid ${colors["--border-color"]};
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-width: 300px;
                width: 300px;
                white-space: normal;
            }
            </style>
        </head>
        <body data-bs-theme=${isDarkTheme ? "dark" : "light"}>
            <div class="one-click-exchange-form">
                <!-- Info Message -->
                <div class="info-message">
                    <i class="bi bi-info-circle-fill info-icon"></i>
                    <div class="info-text">
                        Swap tokens in your NEAR Intents holdings via the 1Click API.
                        Exchanged tokens stay in your treasury account.
                    </div>
                </div>

                <!-- Error display -->
                <div id="error-container" style="display: none;">
                    <div class="error-message">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                        <span id="error-message"></span>
                    </div>
                </div>

                <!-- Exchange Sections Container -->
                <div class="exchange-sections">
                    <!-- Send Section -->
                    <div class="send-section">
                        <div class="section-label">Send</div>
                        <div class="input-row">
                            <div class="amount-input">
                                <input
                                    type="number"
                                    id="amount-in"
                                    placeholder="0.00"
                                    min="0"
                                    step="any"
                                />
                            </div>
                            <div class="token-dropdown">
                                <button class="dropdown-toggle" id="send-dropdown-toggle">
                                    <span id="send-token-display">Select token</span>
                                    <span class="ms-auto"><i class="bi bi-chevron-down h6 mb-0"></i></span>
                                </button>
                                <div class="dropdown-menu" id="send-dropdown-menu">
                                    <div class="dropdown-search">
                                        <input type="text" placeholder="Search token..." id="send-search" />
                                    </div>
                                    <div class="text-secondary d-flex justify-content-between px-3 mb-2">
                                        <div>Token</div>
                                        <div>Balance</div>
                                    </div>
                                    <div id="send-token-list" class="scroll-box"></div>
                                </div>
                            </div>
                        </div>
                        <div class="value-display" id="send-value">$0.00</div>
                    </div>

                    <!-- Swap Divider with Icon -->
                    <div class="swap-divider">
                        <div class="swap-icon-container">
                            <i class="bi bi-chevron-down"></i>
                        </div>
                    </div>

                    <!-- Receive Section -->
                    <div class="receive-section">
                        <div class="section-label">Receive</div>
                        <div class="input-row">
                            <div class="amount-input">
                                <input
                                    type="text"
                                    id="amount-out"
                                    placeholder="0.00"
                                    readonly
                                    disabled
                                />
                            </div>
                            <div class="token-dropdown">
                                <button class="dropdown-toggle" id="receive-dropdown-toggle">
                                    <span id="receive-token-display">Select token</span>
                                    <span class="ms-auto"><i class="bi bi-chevron-down h6 mb-0"></i></span>
                                </button>
                                <div class="dropdown-menu" id="receive-dropdown-menu">
                                    <div class="dropdown-search">
                                        <input type="text" placeholder="Search token..." id="receive-search" />
                                    </div>
                                    <div class="text-secondary d-flex justify-content-between px-3 mb-2">
                                        <div>Token</div>
                                        <div>Balance</div>
                                    </div>
                                    <div id="receive-token-list" class="scroll-box"></div>
                                </div>
                            </div>
                        </div>
                        <div class="value-display" id="receive-value">$0.00</div>
                    </div>
                </div>

                <!-- Network Section -->
                <div class="form-section">
                    <label class="form-label">Network</label>
                    <div class="token-dropdown" style="width: 100%;">
                        <button class="dropdown-toggle" id="network-dropdown-toggle" style="width: 100%;">
                            <span id="network-display">Select token first</span>
                            <span class="ms-auto"><i class="bi bi-chevron-down h6 mb-0"></i></span>
                        </button>
                        <div class="dropdown-menu" id="network-dropdown-menu" style="width: 100%;">
                            <div id="network-list"></div>
                        </div>
                    </div>
                    <div class="helper-text">
                        Swapped tokens will remain in the treasury's NEAR Intents account
                    </div>
                </div>

                <!-- Price Slippage Limit Section -->
                <div class="form-section">
                    <label class="form-label">
                        Price Slippage Limit (%)
                        <i class="bi bi-info-circle text-muted"
                           data-bs-toggle="tooltip"
                           data-bs-custom-class="custom-tooltip"
                           data-bs-placement="top"
                           title="Maximum price change you're willing to accept. The swap will fail if the price moves beyond this limit.">
                        </i>
                    </label>
                    <div class="d-flex">
                        <input
                            type="number"
                            id="slippage-input"
                            class="form-control"
                            placeholder="Enter percentage"
                            min="0"
                            max="50"
                            step="0.1"
                        />
                    </div>
                    <div class="helper-text">
                        Your transaction will revert if the price changes unfavorably by more than this percentage.
                    </div>
                </div>

                <!-- Quote Display -->
                <div id="quote-display" style="display: none;">
                    <div class="quote-display">
                        <!-- Details section -->
                        <div class="d-flex flex-column gap-2 collapse-container" id="collapse-container">
                            <div class="toggle-header">
                                <div class="d-flex align-items-center gap-3">
                                    <div id="exchange-rate-display" class="exchange-rate-display">
                                        <div id="send-exchange-rate" style="display: none"></div>
                                        <div id="receive-exchange-rate"></div>
                                    </div>
                                    <i class="bi bi-info-circle text-secondary"
                                       data-bs-toggle="tooltip"
                                       data-bs-custom-class="custom-tooltip"
                                       data-bs-placement="top"
                                       title="This exchange rate is based on the 1Click exchange provider.">
                                    </i>
                                </div>
                                <div class="details-toggle-btn"
                                     data-bs-toggle="collapse"
                                     data-bs-target="#exchange-details-collapse"
                                     aria-expanded="false"
                                     aria-controls="exchange-details-collapse">
                                    <i class="bi bi-exclamation-triangle rate-warning" 
                                       id="exchange-rate-warning" 
                                       style="display: none"></i>
                                    <span>Details</span>
                                    <i class="bi bi-chevron-down" id="details-chevron"></i>
                                </div>
                            </div>
                        </div>

                        <div class="collapse" id="exchange-details-collapse">
                            <div class="collapse-item">
                                <div class="detail-label">
                                    <span>Price Difference</span>
                                    <i class="bi bi-info-circle text-secondary"
                                       data-bs-toggle="tooltip"
                                       data-bs-custom-class="custom-tooltip"
                                       data-bs-placement="top"
                                       title="The difference between the market price and the price you get.">
                                    </i>
                                </div>
                                <div class="detail-value" id="exchange-rate-percentage">N/A</div>
                            </div>
                            <div class="collapse-item">
                                <div class="detail-label">
                                    <span>Estimated time</span>
                                </div>
                                <div class="detail-value" id="detail-time">10 minutes</div>
                            </div>
                            <div class="collapse-item">
                                <div class="detail-label">
                                    <span>Minimum received</span>
                                    <i class="bi bi-info-circle text-secondary"
                                       data-bs-toggle="tooltip"
                                       data-bs-custom-class="custom-tooltip"
                                       data-bs-placement="top"
                                       title="The minimum amount you will receive after applying slippage tolerance.">
                                    </i>
                                </div>
                                <div class="detail-value" id="detail-min-received">N/A</div>
                            </div>
                            <div class="collapse-item">
                                <div class="detail-label">
                                    <span>Deposit address</span>
                                    <i class="bi bi-info-circle text-secondary"
                                       data-bs-toggle="tooltip"
                                       data-bs-custom-class="custom-tooltip"
                                       data-bs-placement="top"
                                       title="Clicking 'Create Proposal' will create a DAO proposal to transfer tokens to this deposit address. Once approved, the treasury will send tokens to this address to complete the exchange."
                                       id="deposit-address-info">
                                    </i>
                                </div>
                                <div class="detail-value" id="detail-deposit">N/A</div>
                            </div>
                            <div class="collapse-item">
                                <div class="detail-label">
                                    <span>Quote expires</span>
                                </div>
                                <div class="detail-value" id="detail-expires">N/A</div>
                            </div>
                        </div>
                        
                        <!-- Expiry Warning -->
                        <div class="warning-box mt-3" id="quote-alert">
                            <i class="bi bi-exclamation-triangle"></i>
                            <span id="quote-alert-text"></span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="d-flex justify-content-end gap-2 mt-4">
                    <button class="btn btn-outline-secondary" id="cancel-btn">
                        Cancel
                    </button>
                    <button class="btn btn-primary" id="get-quote-btn" disabled>
                        Get Quote
                    </button>
                    <button class="btn btn-primary" id="create-proposal-btn" style="display: none;" disabled>
                        Create Proposal
                    </button>
                </div>
            </div>

            <script>
            // Global state
            let tokenIn = null;
            let tokenOut = null;
            let networkOut = null;
            let amountIn = "";
            let slippageTolerance = "100"; // basis points
            let isLoading = false;
            let isLoadingQuote = false;
            let isLoadingPreview = false;
            let intentsTokensIn = [];
            let allTokensOut = [];
            let quote = null;
            let realQuote = null; // Real quote from backend
            let previewData = null; // Preview data from dry quote
            let tokenPrices = {}; // Store token prices by symbol
            let showQuoteDetails = false;
            let treasuryDaoID = "";
            let iconCache = {};
            let availableNetworks = [];

            // Fetch token prices from API
            async function fetchTokenPrices() {
                try {
                    const response = await fetch("https://api-mng-console.chaindefuser.com/api/tokens");
                    const data = await response.json();
                    
                    if (data && data.items) {
                        // Create a price map by symbol
                        tokenPrices = {};
                        data.items.forEach(token => {
                            if (token.symbol && token.price !== undefined) {
                                tokenPrices[token.symbol] = token.price;
                            }
                        });
                        
                        // Update existing tokens with prices
                        intentsTokensIn = intentsTokensIn.map(token => ({
                            ...token,
                            price: tokenPrices[token.symbol] || 0
                        }));
                        
                        allTokensOut = allTokensOut.map(token => ({
                            ...token,
                            price: tokenPrices[token.symbol] || 0
                        }));
                        
                        // Refresh the dropdowns to show updated prices
                        if (intentsTokensIn.length > 0) populateSendTokenList();
                        if (allTokensOut.length > 0) populateReceiveTokenList();
                    }
                } catch (error) {
                    console.error("Failed to fetch token prices:", error);
                }
            }

            // Initialize tooltips
            document.addEventListener("DOMContentLoaded", function() {
                var tooltipTriggerList = [].slice.call(
                    document.querySelectorAll('[data-bs-toggle="tooltip"]')
                );
                tooltipTriggerList.map(function(tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl, {
                        html: true,
                        delay: { show: 300, hide: 500 },
                        customClass: 'custom-tooltip',
                        trigger: 'hover focus'
                    });
                });

                // Set initial slippage value
                const slippageInput = document.getElementById("slippage-input");
                if (slippageInput) {
                    slippageInput.value = "1.0";
                }

                // Setup event listeners
                setupEventListeners();
            });

            function setupEventListeners() {
                // Amount input
                document.getElementById("amount-in").addEventListener("input", function(e) {
                    amountIn = e.target.value;
                    updateSendValue();
                    updateReceiveEstimate(); // Only update estimate, don't fetch full quote
                });

                // Slippage input
                document.getElementById("slippage-input").addEventListener("input", function(e) {
                    const value = parseFloat(e.target.value || "0");
                    slippageTolerance = (value * 100).toString(); // Convert to basis points
                    // Don't auto-fetch quote anymore
                });

                // Dropdown toggles
                setupDropdown("send");
                setupDropdown("receive");
                setupDropdown("network");

                // Setup collapse event listeners  
                // Note: The collapse is handled by Bootstrap's data-bs-toggle="collapse"
                // We just need to listen for the events to update icons
                const collapseElement = document.getElementById("exchange-details-collapse");
                if (collapseElement) {
                    const collapseContainer = document.getElementById("collapse-container");
                    const toggleIcon = document.getElementById("details-chevron");
                    
                    collapseElement.addEventListener("shown.bs.collapse", function() {
                        if (collapseContainer) collapseContainer.classList.add("collapse-shown");
                        if (toggleIcon) {
                            toggleIcon.classList.remove("bi-chevron-down");
                            toggleIcon.classList.add("bi-chevron-up");
                        }
                        updateIframeHeight();
                    });
                    
                    collapseElement.addEventListener("hidden.bs.collapse", function() {
                        if (collapseContainer) collapseContainer.classList.remove("collapse-shown");
                        if (toggleIcon) {
                            toggleIcon.classList.remove("bi-chevron-up");
                            toggleIcon.classList.add("bi-chevron-down");
                        }
                        updateIframeHeight();
                    });
                }
                
                // Exchange rate toggle
                const exchangeRateDisplay = document.getElementById("exchange-rate-display");
                if (exchangeRateDisplay) {
                    exchangeRateDisplay.addEventListener("click", function(event) {
                        event.stopPropagation();
                        const sendRate = document.getElementById("send-exchange-rate");
                        const receiveRate = document.getElementById("receive-exchange-rate");
                        if (sendRate && receiveRate) {
                            if (sendRate.style.display === "none") {
                                sendRate.style.display = "block";
                                receiveRate.style.display = "none";
                            } else {
                                sendRate.style.display = "none";
                                receiveRate.style.display = "block";
                            }
                        }
                    });
                }

                // Cancel button
                document.getElementById("cancel-btn").addEventListener("click", function() {
                    window.parent.postMessage({ handler: "onCancel" }, "*");
                });

                // Get Quote button
                document.getElementById("get-quote-btn").addEventListener("click", handleGetQuote);
                
                // Create Proposal button
                document.getElementById("create-proposal-btn").addEventListener("click", handleCreateProposal);
            }

            function setupDropdown(type) {
                const toggle = document.getElementById(type + "-dropdown-toggle");
                const menu = document.getElementById(type + "-dropdown-menu");
                const search = document.getElementById(type + "-search");
                const chevronIcon = toggle.querySelector("i"); // Get the chevron icon
                
                toggle.addEventListener("click", function(e) {
                    e.stopPropagation();
                    const isOpen = menu.classList.contains("show");
                    
                    // Close all other dropdowns and reset their chevrons
                    document.querySelectorAll(".dropdown-menu").forEach(function(m) {
                        if (m !== menu) {
                            m.classList.remove("show");
                            const otherToggle = m.previousElementSibling;
                            if (otherToggle) {
                                const otherChevron = otherToggle.querySelector("i");
                                if (otherChevron) {
                                    otherChevron.classList.add("bi-chevron-down");
                                    otherChevron.classList.remove("bi-chevron-up");
                                }
                            }
                        }
                    });
                    
                    if (!isOpen) {
                        menu.classList.add("show");
                        chevronIcon.classList.remove("bi-chevron-down");
                        chevronIcon.classList.add("bi-chevron-up");
                    } else {
                        menu.classList.remove("show");
                        chevronIcon.classList.add("bi-chevron-down");
                        chevronIcon.classList.remove("bi-chevron-up");
                    }
                });
                
                // Search functionality
                if (search) {
                    search.addEventListener("input", function(e) {
                        const query = e.target.value.toLowerCase();
                        filterTokenList(type, query);
                    });
                    
                    search.addEventListener("click", function(e) {
                        e.stopPropagation();
                    });
                }
                
                // Close dropdown when clicking outside
                document.addEventListener("click", function() {
                    menu.classList.remove("show");
                    chevronIcon.classList.add("bi-chevron-down");
                    chevronIcon.classList.remove("bi-chevron-up");
                });
            }

            function filterTokenList(type, query) {
                const listId = type + "-token-list";
                if (type === "network") {
                    populateNetworkList(query);
                } else if (type === "send") {
                    populateSendTokenList(query);
                } else if (type === "receive") {
                    populateReceiveTokenList(query);
                }
            }

            function populateSendTokenList(searchQuery = "") {
                const container = document.getElementById("send-token-list");
                container.innerHTML = "";
                
                const filtered = intentsTokensIn.filter(token => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    return token.symbol.toLowerCase().includes(query) ||
                           (token.name && token.name.toLowerCase().includes(query));
                });
                
                // Check if any symbol appears multiple times (different networks)
                const symbolCounts = {};
                filtered.forEach(token => {
                    symbolCounts[token.symbol] = (symbolCounts[token.symbol] || 0) + 1;
                });
                
                filtered.forEach(token => {
                    const item = document.createElement("div");
                    item.className = "dropdown-item d-flex justify-content-between align-items-center px-3 py-2" + (tokenIn === token.id ? " selected" : "");
                    
                    const tokenInfo = document.createElement("div");
                    tokenInfo.className = "d-flex gap-2 align-items-center";
                    
                    if (token.icon || iconCache[token.symbol]) {
                        const img = document.createElement("img");
                        img.src = token.icon || iconCache[token.symbol];
                        img.width = 30;
                        img.height = 30;
                        tokenInfo.appendChild(img);
                    } else {
                        // Add spacer div to maintain alignment
                        const spacer = document.createElement("div");
                        spacer.style.width = "30px";
                        spacer.style.height = "30px";
                        tokenInfo.appendChild(spacer);
                    }
                    
                    const nameContainer = document.createElement("div");
                    
                    const symbolText = document.createElement("h6");
                    symbolText.className = "mb-0";
                    // Add network name in parentheses if there are multiple entries for this symbol
                    if (symbolCounts[token.symbol] > 1 && token.blockchain) {
                        const networkName = getNetworkDisplayName(token.blockchain);
                        symbolText.textContent = token.symbol + " (" + networkName + ")";
                    } else {
                        symbolText.textContent = token.symbol;
                    }
                    
                    const priceText = document.createElement("div");
                    priceText.className = "text-muted text-sm";
                    priceText.textContent = "$" + Number(token.price ?? 0).toLocaleString("en-US");
                    
                    nameContainer.appendChild(symbolText);
                    nameContainer.appendChild(priceText);
                    tokenInfo.appendChild(nameContainer);
                    
                    const balanceText = document.createElement("div");
                    balanceText.className = "text-muted";
                    balanceText.textContent = Number(token.balance ?? 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    
                    item.appendChild(tokenInfo);
                    item.appendChild(balanceText);
                    
                    item.addEventListener("click", function() {
                        selectSendToken(token);
                    });
                    
                    container.appendChild(item);
                });
            }

            function populateReceiveTokenList(searchQuery = "") {
                const container = document.getElementById("receive-token-list");
                container.innerHTML = "";
                
                // Get unique symbols with their first token data for price info
                const symbolMap = new Map();
                allTokensOut.forEach(token => {
                    if (!symbolMap.has(token.symbol)) {
                        symbolMap.set(token.symbol, token);
                    }
                });
                
                const filtered = Array.from(symbolMap.entries())
                    .filter(([symbol, token]) => 
                        !searchQuery || 
                        symbol.toLowerCase().includes(searchQuery) ||
                        (token.name && token.name.toLowerCase().includes(searchQuery))
                    )
                    .sort((a, b) => a[0].localeCompare(b[0]));
                
                filtered.forEach(([symbol, token]) => {
                    const item = document.createElement("div");
                    item.className = "dropdown-item d-flex justify-content-between align-items-center px-3 py-2" + (tokenOut === symbol ? " selected" : "");
                    
                    const tokenInfo = document.createElement("div");
                    tokenInfo.className = "d-flex gap-2 align-items-center";
                    
                    if (iconCache[symbol]) {
                        const img = document.createElement("img");
                        img.src = iconCache[symbol];
                        img.width = 30;
                        img.height = 30;
                        tokenInfo.appendChild(img);
                    } else {
                        // Add spacer div to maintain alignment
                        const spacer = document.createElement("div");
                        spacer.style.width = "30px";
                        spacer.style.height = "30px";
                        tokenInfo.appendChild(spacer);
                    }
                    
                    const nameContainer = document.createElement("div");
                    
                    const symbolText = document.createElement("h6");
                    symbolText.className = "mb-0";
                    symbolText.textContent = symbol;
                    
                    const priceText = document.createElement("div");
                    priceText.className = "text-muted text-sm";
                    priceText.textContent = "$" + Number(token.price ?? 0).toLocaleString("en-US");
                    
                    nameContainer.appendChild(symbolText);
                    nameContainer.appendChild(priceText);
                    tokenInfo.appendChild(nameContainer);
                    
                    // Calculate total balance for grouped tokens
                    let totalBalance = 0;
                    let hasBalance = false;
                    
                    // Sum up balances from all matching tokens in intentsTokensIn
                    intentsTokensIn.forEach(inToken => {
                        if (inToken.symbol === symbol && inToken.balance) {
                            const balance = parseFloat(inToken.balance);
                            if (!isNaN(balance)) {
                                totalBalance += balance;
                                hasBalance = true;
                            }
                        }
                    });
                    
                    const balanceText = document.createElement("div");
                    balanceText.className = "text-muted";
                    
                    if (hasBalance) {
                        // Format balance with proper decimals and commas
                        balanceText.textContent = totalBalance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });
                    } else {
                        balanceText.textContent = "-";
                    }
                    
                    item.appendChild(tokenInfo);
                    item.appendChild(balanceText);
                    
                    item.addEventListener("click", function() {
                        selectReceiveToken(symbol);
                    });
                    
                    container.appendChild(item);
                });
            }

            function populateNetworkList(searchQuery = "") {
                const container = document.getElementById("network-list");
                container.innerHTML = "";
                
                const filtered = availableNetworks.filter(network => 
                    !searchQuery || network.name.toLowerCase().includes(searchQuery)
                );
                
                filtered.forEach(network => {
                    const item = document.createElement("div");
                    item.className = "dropdown-item d-flex align-items-center px-3 py-2" + (networkOut === network.id ? " selected" : "");
                    
                    if (network.icon) {
                        const img = document.createElement("img");
                        img.src = network.icon;
                        img.width = 30;
                        img.height = 30;
                        img.style.marginRight = "8px";
                        item.appendChild(img);
                    } else {
                        // Add spacer div to maintain alignment
                        const spacer = document.createElement("div");
                        spacer.style.width = "30px";
                        spacer.style.height = "30px";
                        spacer.style.marginRight = "8px";
                        item.appendChild(spacer);
                    }
                    
                    const nameDiv = document.createElement("div");
                    nameDiv.className = "fw-semibold";
                    nameDiv.textContent = network.name;
                    item.appendChild(nameDiv);
                    
                    item.addEventListener("click", function() {
                        selectNetwork(network);
                    });
                    
                    container.appendChild(item);
                });
            }

            function selectSendToken(token) {
                tokenIn = token.id;
                const display = document.getElementById("send-token-display");
                display.innerHTML = ""; // Clear existing content
                
                // Add icon if available
                if (token.icon || iconCache[token.symbol]) {
                    const img = document.createElement("img");
                    img.src = token.icon || iconCache[token.symbol];
                    img.className = "token-icon";
                    img.style.width = "20px";
                    img.style.height = "20px";
                    img.style.marginRight = "8px";
                    img.style.verticalAlign = "middle";
                    display.appendChild(img);
                }
                
                // Add token symbol
                const symbolSpan = document.createElement("span");
                symbolSpan.textContent = token.symbol;
                display.appendChild(symbolSpan);
                
                document.getElementById("send-dropdown-menu").classList.remove("show");
                const sendChevron = document.getElementById("send-dropdown-toggle").querySelector("i");
                if (sendChevron) {
                    sendChevron.classList.add("bi-chevron-down");
                    sendChevron.classList.remove("bi-chevron-up");
                }
                updateSendValue();
                updateReceiveEstimate(); // Only update estimate
            }

            function selectReceiveToken(symbol) {
                tokenOut = symbol;
                networkOut = null; // Reset network selection
                
                const display = document.getElementById("receive-token-display");
                display.innerHTML = ""; // Clear existing content
                
                // Add icon if available
                if (iconCache[symbol]) {
                    const img = document.createElement("img");
                    img.src = iconCache[symbol];
                    img.className = "token-icon";
                    img.style.width = "20px";
                    img.style.height = "20px";
                    img.style.marginRight = "8px";
                    img.style.verticalAlign = "middle";
                    display.appendChild(img);
                }
                
                // Add token symbol
                const symbolSpan = document.createElement("span");
                symbolSpan.textContent = symbol;
                display.appendChild(symbolSpan);
                
                document.getElementById("receive-dropdown-menu").classList.remove("show");
                const receiveChevron = document.getElementById("receive-dropdown-toggle").querySelector("i");
                if (receiveChevron) {
                    receiveChevron.classList.add("bi-chevron-down");
                    receiveChevron.classList.remove("bi-chevron-up");
                }
                
                // Update available networks
                updateAvailableNetworks();
                updateReceiveEstimate(); // Only update estimate
            }

            function selectNetwork(network) {
                networkOut = network.id;
                
                const display = document.getElementById("network-display");
                display.innerHTML = ""; // Clear existing content
                
                // Add icon if available
                const networkIcon = network.icon || iconCache[network.id + "_network_icon"] || getNetworkIcon(network.id);
                if (networkIcon) {
                    const img = document.createElement("img");
                    img.src = networkIcon;
                    img.className = "token-icon";
                    img.style.width = "20px";
                    img.style.height = "20px";
                    img.style.marginRight = "8px";
                    img.style.verticalAlign = "middle";
                    display.appendChild(img);
                    
                    // Cache the icon for future use
                    if (!iconCache[network.id + "_network_icon"]) {
                        iconCache[network.id + "_network_icon"] = networkIcon;
                    }
                }
                
                // Add network name
                const nameSpan = document.createElement("span");
                nameSpan.textContent = network.name;
                display.appendChild(nameSpan);
                
                document.getElementById("network-dropdown-menu").classList.remove("show");
                const networkChevron = document.getElementById("network-dropdown-toggle").querySelector("i");
                if (networkChevron) {
                    networkChevron.classList.add("bi-chevron-down");
                    networkChevron.classList.remove("bi-chevron-up");
                }
                updateReceiveEstimate(); // Only update estimate
            }

            function getTokenIcon(symbol) {
                if (!window.web3IconsCore || !window.web3IconsCommon) return null;
                try {
                    // Find token in web3icons metadata
                    const web3IconToken = window.web3IconsCommon.tokens.find(t => 
                        t.symbol.toLowerCase() === symbol.toLowerCase()
                    );
                    
                    if (web3IconToken && window.web3IconsCore.svgs.tokens.background[web3IconToken.fileName]) {
                        const svg = window.web3IconsCore.svgs.tokens.background[web3IconToken.fileName].default;
                        return "data:image/svg+xml;base64," + btoa(svg);
                    }
                    
                    return null;
                } catch (err) {
                    console.log("Could not find icon for", symbol, err);
                    return null;
                }
            }
            
            function getNetworkIcon(networkId) {
                if (!window.web3IconsCore || !window.web3IconsCommon) return null;
                try {
                    const parts = networkId.split(":");
                    const layer1 = parts[0];
                    const chainId = parts[1];
                    
                    let web3IconNetwork = null;
                    
                    // 1. Match by exact chainId
                    if (chainId) {
                        web3IconNetwork = window.web3IconsCommon.networks.find(n => 
                            String(n.chainId) === chainId
                        );
                    }
                    
                    // 2. Match by network ID starting with layer1
                    if (!web3IconNetwork && layer1) {
                        web3IconNetwork = window.web3IconsCommon.networks.find(n => 
                            n.id.toLowerCase().startsWith(layer1.toLowerCase())
                        );
                    }
                    
                    if (web3IconNetwork && window.web3IconsCore.svgs.networks.background[web3IconNetwork.fileName]) {
                        const svg = window.web3IconsCore.svgs.networks.background[web3IconNetwork.fileName].default;
                        return "data:image/svg+xml;base64," + btoa(svg);
                    }
                    
                    return null;
                } catch (err) {
                    console.log("Could not find network icon for", networkId, err);
                    return null;
                }
            }
            
            function loadTokenIcons() {
                if (!window.web3IconsCore || !window.web3IconsCommon) return;
                
                console.log("Loading token icons...");
                
                // Load icons for intents tokens
                intentsTokensIn.forEach(token => {
                    if (!iconCache[token.symbol]) {
                        const icon = getTokenIcon(token.symbol);
                        if (icon) {
                            iconCache[token.symbol] = icon;
                            console.log("Loaded icon for", token.symbol);
                        }
                    }
                });
                
                // Load icons for output tokens
                const uniqueSymbols = [...new Set(allTokensOut.map(t => t.symbol))];
                uniqueSymbols.forEach(symbol => {
                    if (!iconCache[symbol]) {
                        const icon = getTokenIcon(symbol);
                        if (icon) {
                            iconCache[symbol] = icon;
                            console.log("Loaded icon for", symbol);
                        }
                    }
                });
                
                // Load network icons
                availableNetworks.forEach(network => {
                    if (!iconCache[network.id + "_network_icon"]) {
                        const icon = getNetworkIcon(network.id);
                        if (icon) {
                            iconCache[network.id + "_network_icon"] = icon;
                            console.log("Loaded network icon for", network.id);
                        }
                    }
                });
                
                // Refresh UI with new icons
                console.log("Refreshing UI with", Object.keys(iconCache).length, "icons");
                populateSendTokenList();
                populateReceiveTokenList();
                if (networkOut) {
                    populateNetworkList();
                }
            }
            
            function getNetworkDisplayName(networkId) {
                // Parse the network ID format (e.g., "eth:1:0xa0b86991...")
                const parts = networkId.split(":");
                const baseNetwork = parts[0].toLowerCase();
                const chainId = parts[1];
                
                // Try to resolve using Web3Icons if available
                if (window.web3IconsCommon && window.web3IconsCommon.networks) {
                    let web3IconNetwork = null;
                    
                    // 1. Match by exact chainId
                    if (chainId) {
                        web3IconNetwork = window.web3IconsCommon.networks.find(n => 
                            String(n.chainId) === chainId
                        );
                    }
                    
                    // 2. Match by network ID starting with baseNetwork
                    if (!web3IconNetwork && baseNetwork) {
                        web3IconNetwork = window.web3IconsCommon.networks.find(n => 
                            n.id.toLowerCase().startsWith(baseNetwork)
                        );
                    }
                    
                    if (web3IconNetwork && web3IconNetwork.name) {
                        console.log("Resolved " + networkId + " to " + web3IconNetwork.name + " using Web3Icons");
                        // Cache the resolved name for future lookups
                        if (!iconCache) iconCache = {};
                        iconCache[networkId + "_network"] = web3IconNetwork.name;
                        return web3IconNetwork.name;
                    }
                }
                
                // Check icon cache (might have been populated from parent)
                if (iconCache && iconCache[networkId + "_network"]) {
                    return iconCache[networkId + "_network"];
                }
                
                
                
                // Final fallback: format the raw ID (capitalize first letter)
                return baseNetwork.charAt(0).toUpperCase() + baseNetwork.slice(1);
            }
            
            function updateAvailableNetworks() {
                const display = document.getElementById("network-display");
                
                if (!tokenOut) {
                    availableNetworks = [];
                    display.innerHTML = "";
                    display.textContent = "Select token first";
                    return;
                }
                
                availableNetworks = allTokensOut
                    .filter(token => token.symbol === tokenOut)
                    .map(token => {
                        const networkName = getNetworkDisplayName(token.network);
                        return {
                            id: token.network,
                            name: networkName,
                            tokenId: token.id,
                            icon: iconCache[token.network + "_network_icon"] || getNetworkIcon(token.network)
                        };
                    });
                
                if (availableNetworks.length > 0) {
                    display.innerHTML = "";
                    display.textContent = "Select network";
                    populateNetworkList();
                }
            }

            function updateSendValue() {
                const valueDisplay = document.getElementById("send-value");
                if (tokenIn && amountIn) {
                    const token = intentsTokensIn.find(t => t.id === tokenIn);
                    if (token) {
                        valueDisplay.textContent = "$" + (parseFloat(amountIn || 0) * parseFloat(token.price || 0)).toFixed(2) +
                            " • NEAR Intents balance: " + token.balance + " " + token.symbol;
                    }
                } else {
                    valueDisplay.textContent = "$0.00";
                }
            }

            function updateReceiveEstimate() {
                // Only update the receive amount estimate, not the full quote details
                if (!tokenIn || !tokenOut || !networkOut || !amountIn || parseFloat(amountIn) <= 0) {
                    document.getElementById("amount-out").value = "";
                    document.getElementById("receive-value").textContent = "$0.00";
                    previewData = null;
                    updateSubmitButton();
                    return;
                }
                
                // Show loading state in receive amount field
                document.getElementById("amount-out").value = "Loading...";
                document.getElementById("receive-value").textContent = "Calculating...";
                
                // Fetch dry quote for estimate only
                fetchDryQuoteForEstimate();
            }

            function fetchRealQuote() {
                // Fetch real quote from our backend directly
                const selectedTokenIn = intentsTokensIn.find(t => t.id === tokenIn);
                const selectedTokenOut = allTokensOut.find(
                    t => t.symbol === tokenOut && t.network === networkOut
                );
                
                if (!selectedTokenIn || !selectedTokenOut) {
                    showError("Cannot find token information. Please try again.");
                    return;
                }
                
                isLoadingQuote = true;
                updateSubmitButton();
                clearError();
                
                const decimals = selectedTokenIn.decimals || 18;
                const amountInSmallestUnit = Big(amountIn)
                    .mul(Big(10).pow(decimals))
                    .toFixed(0);
                
                const requestBody = {
                    treasuryDaoID,
                    inputToken: selectedTokenIn,
                    outputToken: selectedTokenOut,
                    amountIn: amountInSmallestUnit,
                    slippageTolerance: parseInt(slippageTolerance),
                    networkOut: selectedTokenOut.network,
                    tokenOutSymbol: selectedTokenOut.symbol
                };
                
                console.log("Sending request to backend:", requestBody);
                
                // Call backend directly
                fetch("${REPL_BACKEND_API}/treasury/oneclick-quote", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify(requestBody)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            console.error("Backend error response:", text);
                            throw new Error("Backend error (" + response.status + "): " + (text || response.statusText));
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    isLoadingQuote = false;
                    console.log("Backend response:", data);
                    
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    if (!data.success || !data.proposalPayload) {
                        throw new Error("Invalid response from backend");
                    }
                    
                    // Store the real quote with token symbols
                    realQuote = {
                        ...data.proposalPayload,
                        tokenInSymbol: selectedTokenIn.symbol,
                        tokenOutSymbol: selectedTokenOut.symbol
                    };
                    
                    // Lock fields after getting quote
                    lockFields();
                    
                    // Update display with real quote details
                    updateQuoteDisplay();
                    
                    // Change button to "Create Proposal"
                    updateSubmitButton();
                })
                .catch(err => {
                    isLoadingQuote = false;
                    console.error("Failed to get quote:", err);
                    showError(err.message || "Failed to get quote. Please try again.");
                    updateSubmitButton();
                });
            }
            
            function fetchDryQuoteForEstimate() {
                // Similar to fetchDryQuote but only updates the receive amount
                const selectedTokenIn = intentsTokensIn.find(t => t.id === tokenIn);
                const selectedTokenOut = allTokensOut.find(
                    t => t.symbol === tokenOut && t.network === networkOut
                );
                
                if (!selectedTokenIn || !selectedTokenOut) {
                    return;
                }
                
                const requestPayload = {
                    originAsset: selectedTokenIn.symbol,
                    destinationAsset: tokenOut,
                    originAmount: parseFloat(amountIn),
                    destinationNetwork: networkOut,
                    treasuryDaoId: treasuryDaoID,
                    slippagePercentage: parseFloat(slippageTolerance) / 100
                };
                
                // Mark that we're loading preview
                isLoadingPreview = true;
                
                const decimals = selectedTokenIn.decimals || 18;
                const amountInSmallestUnit = Big(amountIn)
                    .mul(Big(10).pow(decimals))
                    .toFixed(0);
                
                // Calculate deadline (7 days for DAO voting)
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 7);
                
                const quoteRequest = {
                    dry: true,
                    swapType: "EXACT_INPUT",
                    slippageTolerance: parseInt(slippageTolerance),
                    originAsset: selectedTokenIn.id.startsWith("nep141:")
                        ? selectedTokenIn.id
                        : "nep141:" + selectedTokenIn.id,
                    depositType: "INTENTS",
                    destinationAsset: selectedTokenOut.id,
                    refundTo: treasuryDaoID,
                    refundType: "INTENTS",
                    recipient: treasuryDaoID,
                    recipientType: "INTENTS",
                    deadline: deadline.toISOString(),
                    amount: amountInSmallestUnit
                };
                
                fetch("https://1click.chaindefuser.com/v0/quote", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(quoteRequest)
                })
                .then(response => response.json())
                .then(data => {
                    isLoadingPreview = false;
                    if (data.quote) {
                        // Store preview data
                        previewData = data.quote;
                        
                        // Update the receive amount display
                        const amountOut = data.quote.amountOutFormatted || 
                            Big(data.quote.amountOut || "0")
                                .div(Big(10).pow(selectedTokenOut.decimals || 18))
                                .toFixed(6);
                        document.getElementById("amount-out").value = amountOut;
                        const usdValue = parseFloat(amountOut) * (selectedTokenOut.price || 1);
                        document.getElementById("receive-value").textContent = "$" + usdValue.toFixed(2);
                        
                        // Update button state now that we have preview
                        updateSubmitButton();
                    } else {
                        // If no quote, show error in receive field
                        document.getElementById("amount-out").value = "Error";
                        document.getElementById("receive-value").textContent = "Unable to quote";
                        previewData = null;
                        updateSubmitButton();
                    }
                })
                .catch(err => {
                    isLoadingPreview = false;
                    console.error("Error fetching estimate:", err);
                    document.getElementById("amount-out").value = "Error";
                    document.getElementById("receive-value").textContent = "Unable to quote";
                    previewData = null;
                    updateSubmitButton();
                });
            }
            
            function updateQuoteDisplay() {
                const quoteContainer = document.getElementById("quote-display");
                
                // Only show full quote details if we have a real quote from backend
                if (realQuote && realQuote.quote) {
                    const quote = realQuote.quote;
                    
                    // Update quote display
                    const selectedTokenIn = intentsTokensIn.find(t => t.id === tokenIn);
                    
                    document.getElementById("quote-alert-text").textContent = 
                        "Please approve this request within " + getTimeRemaining(quote.deadline) + 
                        " - otherwise, it will be expired. We recommend confirming as soon as possible.";
                    
                    // Update exchange rate display
                    const sendRate = document.getElementById("send-exchange-rate");
                    const receiveRate = document.getElementById("receive-exchange-rate");
                    const ratePercentage = document.getElementById("exchange-rate-percentage");
                    const rateWarning = document.getElementById("exchange-rate-warning");
                    
                    // Calculate exchange rates
                    const amountInNum = parseFloat(quote.amountInFormatted);
                    const amountOutNum = parseFloat(quote.amountOutFormatted);
                    const tokenInRate = amountInNum > 0 ? amountOutNum / amountInNum : 0;
                    const tokenOutRate = amountOutNum > 0 ? amountInNum / amountOutNum : 0;
                    
                    sendRate.innerHTML = "1 " + selectedTokenIn.symbol + " ≈ " + 
                        tokenInRate.toFixed(6) + " " + tokenOut;
                    receiveRate.innerHTML = "1 " + tokenOut + " ≈ " + 
                        tokenOutRate.toFixed(6) + " " + selectedTokenIn.symbol;
                    
                    // Calculate price difference if we have market prices
                    if (selectedTokenIn.price && quote.amountInUsd && quote.amountOutUsd) {
                        const expectedUsdValue = amountInNum * selectedTokenIn.price;
                        const actualUsdValue = parseFloat(quote.amountOutUsd);
                        const priceDiff = expectedUsdValue > 0 ? 
                            ((actualUsdValue - expectedUsdValue) / expectedUsdValue * 100) : 0;
                        
                        ratePercentage.textContent = priceDiff.toFixed(2) + "%";
                        
                        // Show warning if price difference is significant
                        if (priceDiff < -1) {
                            rateWarning.style.display = "inline-block";
                            ratePercentage.classList.add("text-red");
                            ratePercentage.classList.remove("text-green");
                        } else if (priceDiff > 0) {
                            rateWarning.style.display = "none";
                            ratePercentage.classList.add("text-green");
                            ratePercentage.classList.remove("text-red");
                        } else {
                            rateWarning.style.display = "none";
                            ratePercentage.classList.remove("text-red", "text-green");
                        }
                    } else {
                        ratePercentage.textContent = "N/A";
                        rateWarning.style.display = "none";
                    }
                    
                    // Update details
                    document.getElementById("detail-time").textContent = 
                        (quote.timeEstimate || 10) + " minutes";
                    
                    if (quote.minAmountOut && quote.amountOut && quote.amountOutFormatted) {
                        const minReceived = Big(quote.minAmountOut)
                            .mul(Big(quote.amountOutFormatted))
                            .div(Big(quote.amountOut))
                            .toFixed(6);
                        document.getElementById("detail-min-received").textContent = 
                            minReceived + " " + tokenOut;
                    }
                    
                    if (quote.depositAddress) {
                        document.getElementById("detail-deposit").textContent = 
                            quote.depositAddress.substring(0, 20) + "...";
                        
                        // Update the info icon tooltip to include the full address
                        const depositInfoIcon = document.getElementById("deposit-address-info");
                        if (depositInfoIcon) {
                            const tooltipText = "Clicking 'Create Proposal' will create a DAO proposal to transfer tokens to this deposit address: " + 
                                quote.depositAddress + 
                                ". Once approved, the treasury will send tokens to this address to complete the exchange.";
                            depositInfoIcon.setAttribute("title", tooltipText);
                            depositInfoIcon.setAttribute("data-original-title", tooltipText);
                        }
                    }
                    
                    if (quote.deadline) {
                        document.getElementById("detail-expires").textContent = 
                            new Date(quote.deadline).toLocaleString();
                    }
                    
                    quoteContainer.style.display = "block";
                    
                    // Initialize tooltips for the newly added quote display elements
                    setTimeout(() => {
                        const tooltipElements = quoteContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
                        tooltipElements.forEach(el => {
                            if (!el._tooltip) {
                                new bootstrap.Tooltip(el, {
                                    html: true,
                                    delay: { show: 300, hide: 500 },
                                    customClass: 'custom-tooltip',
                                    trigger: 'hover focus'
                                });
                            }
                        });
                    }, 100);
                } else {
                    const amountOutInput = document.getElementById("amount-out");
                    const receiveValue = document.getElementById("receive-value");
                    if (amountOutInput) {
                        amountOutInput.value = "";
                        amountOutInput.placeholder = isLoadingQuote ? "Fetching..." : "0.00";
                    }
                    if (receiveValue) {
                        receiveValue.textContent = "$0.00";
                    }
                    quoteContainer.style.display = "none";
                }
                
                updateIframeHeight();
            }

            function getTimeRemaining(deadline) {
                if (!deadline) return null;
                
                const now = new Date();
                const expiryDate = new Date(deadline);
                const diffMs = expiryDate - now;
                
                if (diffMs <= 0) return "expired";
                
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                if (hours > 24) {
                    const days = Math.floor(hours / 24);
                    return days + " day" + (days > 1 ? "s" : "");
                } else if (hours > 0) {
                    return hours + " hour" + (hours > 1 ? "s" : "");
                } else {
                    return minutes + " minute" + (minutes > 1 ? "s" : "");
                }
            }

            function updateSubmitButton() {
                const getQuoteBtn = document.getElementById("get-quote-btn");
                const createProposalBtn = document.getElementById("create-proposal-btn");
                const hasRequiredFields = tokenIn && tokenOut && networkOut && amountIn && parseFloat(amountIn) > 0;
                
                if (isLoadingQuote) {
                    getQuoteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Fetching Quote...';
                    getQuoteBtn.disabled = true;
                    getQuoteBtn.style.display = "inline-block";
                    createProposalBtn.style.display = "none";
                } else if (realQuote) {
                    // Have real quote, show create proposal button
                    getQuoteBtn.style.display = "none";
                    createProposalBtn.style.display = "inline-block";
                    
                    if (isLoading) {
                        createProposalBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Proposal...';
                        createProposalBtn.disabled = true;
                    } else {
                        createProposalBtn.textContent = "Create Proposal";
                        createProposalBtn.disabled = !realQuote.quote || !realQuote.quote.deadline;
                    }
                } else {
                    // No real quote yet, show Get Quote button
                    getQuoteBtn.style.display = "inline-block";
                    getQuoteBtn.textContent = "Get Quote";
                    // Only enable Get Quote when we have all fields AND a preview
                    const hasPreview = previewData !== null && !isLoadingPreview;
                    getQuoteBtn.disabled = !hasRequiredFields || !hasPreview;
                    createProposalBtn.style.display = "none";
                }
            }

            function handleGetQuote() {
                // Fetch the real quote from backend
                if (!tokenIn || !tokenOut || !networkOut || !amountIn || parseFloat(amountIn) <= 0) {
                    showError("Please fill in all fields");
                    return;
                }
                
                fetchRealQuote();
            }
            
            function handleCreateProposal() {
                // Create the proposal with the real quote
                if (!realQuote || !realQuote.quote || !realQuote.quote.deadline) {
                    console.error("No real quote available for proposal creation");
                    return;
                }
                
                // Prevent duplicate submissions
                if (isLoading) {
                    console.log("Already processing proposal creation");
                    return;
                }
                
                // Simply send the real quote to parent for proposal creation
                isLoading = true;
                updateSubmitButton();
                clearError();
                
                console.log("Sending proposal to parent with quote:", realQuote);
                
                // The parent expects the full payload structure from backend
                window.parent.postMessage({
                    handler: "onSubmit",
                    args: {
                        ...realQuote,
                        // Ensure backward compatibility with parent component expectations
                        tokenInSymbol: realQuote.tokenInSymbol || tokenIn,
                        tokenOutSymbol: realQuote.tokenOutSymbol || tokenOut,
                        networkOut: realQuote.networkOut || networkOut,
                        slippage: slippageTolerance
                    }
                }, "*");
            }

            function lockFields() {
                // Lock all input fields and dropdowns after getting quote
                document.getElementById("amount-in").disabled = true;
                document.getElementById("slippage-input").disabled = true;
                document.getElementById("send-dropdown-toggle").disabled = true;
                document.getElementById("receive-dropdown-toggle").disabled = true;
                document.getElementById("network-dropdown-toggle").disabled = true;
            }
            
            function unlockFields() {
                // Unlock fields when resetting
                document.getElementById("amount-in").disabled = false;
                document.getElementById("slippage-input").disabled = false;
                document.getElementById("send-dropdown-toggle").disabled = false;
                document.getElementById("receive-dropdown-toggle").disabled = false;
                document.getElementById("network-dropdown-toggle").disabled = false;
            }
            
            function showError(message) {
                const container = document.getElementById("error-container");
                const messageEl = document.getElementById("error-message");
                messageEl.textContent = message;
                container.style.display = "block";
                updateIframeHeight();
            }

            function clearError() {
                document.getElementById("error-container").style.display = "none";
                updateIframeHeight();
            }

            function updateIframeHeight() {
                const height = document.documentElement.scrollHeight || document.body.scrollHeight;
                window.parent.postMessage(
                    { handler: "updateIframeHeight", height: height },
                    "*"
                );
            }

            // Listen for messages from parent (initial data and updates)
            window.addEventListener("message", function(event) {
                // Process the initial message data from BOS
                if (event.data.treasuryDaoID) {
                    treasuryDaoID = event.data.treasuryDaoID;
                }
                
                if (event.data.intentsTokens) {
                    intentsTokensIn = event.data.intentsTokens;
                    populateSendTokenList();
                    loadTokenIcons(); // Load icons for new tokens
                    fetchTokenPrices(); // Fetch prices for tokens
                }
                
                if (event.data.allTokensOut) {
                    allTokensOut = event.data.allTokensOut;
                    populateReceiveTokenList();
                    loadTokenIcons(); // Load icons for new tokens
                    fetchTokenPrices(); // Fetch prices for tokens
                }
                
                if (event.data.iconCache) {
                    iconCache = event.data.iconCache;
                    // Refresh dropdowns with new icons
                    populateSendTokenList();
                    populateReceiveTokenList();
                    updateAvailableNetworks();
                }
                
                if (event.data.error) {
                    showError(event.data.error);
                    isLoading = false;
                    updateSubmitButton();
                }
                
                if (event.data.success) {
                    // Handle success - parent will handle the actual submission
                    isLoading = false;
                    updateSubmitButton();
                }
                
                // Update iframe height after processing data
                updateIframeHeight();
            });
            </script>
        </body>
        </html>
`;

// Store tokens in state to pass to iframe
const [intentsTokens, setIntentsTokens] = useState([]);
const [allTokensOut, setAllTokensOut] = useState([]);

// Fetch intents tokens
useEffect(() => {
  if (typeof getIntentsBalances === "function" && treasuryDaoID) {
    getIntentsBalances(treasuryDaoID).then((balances) => {
      const formattedTokens = balances.map((token) => ({
        id: token.token_id, // Use the full token_id with prefix from common.jsx
        symbol: token.ft_meta.symbol,
        name: token.ft_meta.name,
        icon: token.ft_meta.icon,
        balance: Big(token.amount ?? "0")
          .div(Big(10).pow(token.ft_meta.decimals))
          .toFixed(2),
        decimals: token.ft_meta.decimals,
        blockchain: token.blockchain,
      }));

      setIntentsTokens(formattedTokens);

      // Also add intents tokens to icon fetch list
      const currentIconTokens = state.allTokensForIcons || [];
      const intentsIconTokens = formattedTokens.map((token) => ({
        symbol: token.symbol,
        token: token.symbol,
      }));

      State.update({
        allTokensForIcons: [...currentIconTokens, ...intentsIconTokens],
      });
    });
  }
}, [treasuryDaoID]);

// Fetch all tokens from API
useEffect(() => {
  asyncFetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "supportedTokensFetchAll",
      jsonrpc: "2.0",
      method: "supported_tokens",
      params: [{}],
    }),
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = res.body;
      if (data.error) {
        throw new Error(data.error.message || "Error fetching tokens.");
      }
      if (data.result && data.result.tokens) {
        const uniqueTokens = new Map();

        data.result.tokens.forEach((token) => {
          if (!token.defuse_asset_identifier || !token.asset_name) return;

          const parts = token.defuse_asset_identifier.split(":");
          let chainId =
            parts.length >= 2 ? parts.slice(0, 2).join(":") : parts[0];

          const key = `${token.asset_name}_${chainId}`;
          if (!uniqueTokens.has(key)) {
            uniqueTokens.set(key, {
              id: token.intents_token_id || token.defuse_asset_id,
              symbol: token.asset_name,
              network: chainId,
              nearTokenId: token.near_token_id,
            });
          }
        });

        const tokens = Array.from(uniqueTokens.values());
        setAllTokensOut(tokens);

        // Log what networks we're dealing with for debugging
        const uniqueNetworks = [...new Set(tokens.map((t) => t.network))];
        console.log("Unique networks from API:", uniqueNetworks);
      }
    })
    .catch((err) => {
      console.error("Failed to fetch tokens:", err);
      const iframe = document.querySelector("iframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            error: err.message || "Failed to fetch tokens.",
          },
          "*"
        );
      }
    });
}, []);

State.init({
  height: "800px",
});

// Add a loading state while data is being fetched
if (!treasuryDaoID) {
  return <div>Loading treasury configuration...</div>;
}

return (
  <>
    <iframe
      srcDoc={code}
      style={{ height: state.height, width: "100%" }}
      message={{
        treasuryDaoID: treasuryDaoID,
        intentsTokens: intentsTokens,
        allTokensOut: allTokensOut,
      }}
      onMessage={(e) => {
        switch (e.handler) {
          case "onCancel": {
            onCancel();
            break;
          }
          case "onSubmit": {
            // We already have the quote from the iframe, no need to fetch again
            const args = e.args;
            console.log("Received quote from iframe:", args);

            // Directly submit the proposal with the quote we already have
            try {
              onSubmit({
                ...args,
                tokenOutSymbol: args.tokenOutSymbol || args.tokenOut, // Ensure we have the symbol
              });
            } catch (err) {
              console.error("Failed to create proposal:", err);
              // Send error back to iframe
              const iframe = document.querySelector("iframe");
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                  {
                    error:
                      err.message ||
                      "Failed to create proposal. Please try again.",
                  },
                  "*"
                );
              }
            }
            break;
          }
          case "updateIframeHeight": {
            State.update({ height: e.height + "px" });
            break;
          }
        }
      }}
    />

    {/* Web3IconFetcher is now integrated directly in the iframe - no longer needed as separate widget */}
  </>
);
