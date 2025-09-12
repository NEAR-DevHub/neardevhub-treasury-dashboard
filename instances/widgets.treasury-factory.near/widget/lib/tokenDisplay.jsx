function formatTokenAmount(amount, tokenPrice, minUsdValue) {
  minUsdValue = minUsdValue || 0.01;
  if (!amount || !tokenPrice || tokenPrice === 0) {
    return "0";
  }

  const numAmount = Big(amount);
  const numPrice = Big(tokenPrice);

  if (numAmount.eq(0)) {
    return "0";
  }

  const usdValue = numAmount.mul(numPrice);

  if (usdValue.lt(minUsdValue)) {
    return numAmount.toExponential(2);
  }

  // Calculate decimals needed so the smallest unit is worth <= $0.01
  const targetPrecision = Big(0.01);
  const requiredDecimals = Math.max(
    0,
    Math.ceil(-Math.log10(targetPrecision.div(numPrice).toNumber()))
  );

  const decimals = Math.min(requiredDecimals, 8);
  const formatted = numAmount.toFixed(decimals);

  // Remove trailing zeros and decimal point if no fractional part remains
  // Only remove zeros that are actually trailing (not part of other digits)
  let trimmed = formatted;
  if (formatted.includes(".")) {
    // Remove trailing zeros but keep at least one digit after decimal if there are non-zero digits
    // This regex captures everything up to the last non-zero digit
    trimmed = formatted.replace(/(\.\d*[1-9])?0+$/, "$1");
    trimmed = trimmed.replace(/\.$/, ""); // Remove decimal if alone
  }

  const parts = trimmed.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return parts.join(".");
}

function getOptimalDecimals(tokenPrice, targetUsdPrecision) {
  targetUsdPrecision = targetUsdPrecision || 0.01;
  if (!tokenPrice || tokenPrice === 0) {
    return 8;
  }

  const numPrice = Big(tokenPrice);
  const precision = Big(targetUsdPrecision);

  const decimals = Math.max(
    0,
    Math.ceil(-Math.log10(precision.div(numPrice).toNumber()))
  );

  return Math.min(decimals, 8);
}

function formatTokenWithSymbol(amount, tokenPrice, symbol, minUsdValue) {
  minUsdValue = minUsdValue || 0.01;
  const formattedAmount = formatTokenAmount(amount, tokenPrice, minUsdValue);
  return `${formattedAmount} ${symbol}`;
}

function formatUsdValue(amount, tokenPrice) {
  if (!amount || !tokenPrice) {
    return "$0.00";
  }

  const usdValue = Big(amount).mul(Big(tokenPrice));

  if (usdValue.lt(0.01)) {
    return "< $0.01";
  }

  const formatted = usdValue.toFixed(2);
  const parts = formatted.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `$${parts.join(".")}`;
}

function parseTokenAmount(displayAmount, decimals) {
  if (!displayAmount || !decimals) {
    return "0";
  }

  const cleanAmount = displayAmount.toString().replace(/,/g, "");

  const amount = Big(cleanAmount).mul(Big(10).pow(decimals));

  return amount.toFixed(0);
}

function formatTokenFromContract(rawAmount, decimals, tokenPrice) {
  if (!rawAmount || !decimals) {
    return "0";
  }

  const amount = Big(rawAmount).div(Big(10).pow(decimals));

  return formatTokenAmount(amount.toFixed(), tokenPrice);
}

function getTokenDisplayData(tokens) {
  if (!tokens || !Array.isArray(tokens)) {
    return [];
  }

  return tokens.map((token) => {
    const decimals = token.ft_meta?.decimals || 0;
    const price = token.ft_meta?.price || 0;
    const symbol = token.ft_meta?.symbol || "";
    const rawAmount = token.amount || "0";

    const displayAmount = formatTokenFromContract(rawAmount, decimals, price);
    const usdValue = formatUsdValue(
      Big(rawAmount).div(Big(10).pow(decimals)).toFixed(),
      price
    );

    return {
      contractId: token.contract_id,
      tokenId: token.token_id,
      symbol,
      displayAmount,
      usdValue,
      rawAmount,
      decimals,
      price,
      formattedWithSymbol: formatTokenWithSymbol(
        Big(rawAmount).div(Big(10).pow(decimals)).toFixed(),
        price,
        symbol
      ),
    };
  });
}

function sortTokensByValue(tokens) {
  if (!tokens || !Array.isArray(tokens)) {
    return [];
  }

  return tokens.sort((a, b) => {
    const aValue = Big(a.amount || 0)
      .div(Big(10).pow(a.ft_meta?.decimals || 0))
      .mul(Big(a.ft_meta?.price || 0));
    const bValue = Big(b.amount || 0)
      .div(Big(10).pow(b.ft_meta?.decimals || 0))
      .mul(Big(b.ft_meta?.price || 0));

    return bValue.cmp(aValue);
  });
}

function getTotalPortfolioValue(tokens) {
  if (!tokens || !Array.isArray(tokens)) {
    return "$0.00";
  }

  const total = tokens.reduce((sum, token) => {
    const decimals = token.ft_meta?.decimals || 0;
    const price = token.ft_meta?.price || 0;
    const amount = token.amount || "0";

    const value = Big(amount).div(Big(10).pow(decimals)).mul(Big(price));

    return sum.add(value);
  }, Big(0));

  const formatted = total.toFixed(2);
  const parts = formatted.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `$${parts.join(".")}`;
}

function validateTokenInput(input, decimals, maxAmount) {
  if (!input || input === "") {
    return { isValid: false, error: "Amount is required" };
  }

  const cleanInput = input.replace(/,/g, "");

  if (!/^\d*\.?\d*$/.test(cleanInput)) {
    return { isValid: false, error: "Invalid number format" };
  }

  const inputBig = Big(cleanInput || 0);

  if (inputBig.lte(0)) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  if (maxAmount) {
    const maxBig = Big(maxAmount).div(Big(10).pow(decimals));
    if (inputBig.gt(maxBig)) {
      return {
        isValid: false,
        error: `Amount exceeds maximum of ${formatTokenAmount(
          maxBig.toFixed(),
          1
        )}`,
      };
    }
  }

  const decimalPlaces = (cleanInput.split(".")[1] || "").length;
  if (decimalPlaces > decimals) {
    return {
      isValid: false,
      error: `Maximum ${decimals} decimal places allowed`,
    };
  }

  return { isValid: true, error: null };
}

function formatCompactNumber(amount, tokenPrice) {
  if (!amount || amount === "0") {
    return "0";
  }

  const num = Big(amount);
  const usdValue = tokenPrice ? num.mul(Big(tokenPrice)) : num;

  if (usdValue.gte(1e9)) {
    return `${num.div(1e9).toFixed(2)}B`;
  } else if (usdValue.gte(1e6)) {
    return `${num.div(1e6).toFixed(2)}M`;
  } else if (usdValue.gte(1e3)) {
    return `${num.div(1e3).toFixed(2)}K`;
  }

  return formatTokenAmount(amount, tokenPrice || 1);
}

return {
  formatTokenAmount,
  getOptimalDecimals,
  formatTokenWithSymbol,
  formatUsdValue,
  parseTokenAmount,
  formatTokenFromContract,
  getTokenDisplayData,
  sortTokensByValue,
  getTotalPortfolioValue,
  validateTokenInput,
  formatCompactNumber,
};
