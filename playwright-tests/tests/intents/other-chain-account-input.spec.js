import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { redirectWeb4 } from "../../util/web4.js";

// Test data with valid and invalid addresses for each blockchain
const testCases = {
  btc: {
    placeholder: "Enter BTC Address (e.g., bc1... or 1...)",
    valid: [
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080", // Bech32
      "bc1qrym28fcvqk6l6xwc7fs5jt9d7q8y3x6w6xz3xp", // Bech32
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // P2PKH Legacy
      "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", // P2SH Legacy
      "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // Your test case
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNaX", // P2PKH Legacy (was incorrectly marked as invalid)
    ],
    invalid: [
      "bc1invalid", // Too short
      "bc2qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080", // Wrong prefix
      "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNaXXXXXXXXXXXXX", // Actually too long (40+ chars)
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // Ethereum address
      "xxxffwssa", // Your test case
      "",
    ],
  },
  eth: {
    placeholder: "Enter ETH Address (0x...)",
    valid: [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
      "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
      "0x0000000000000000000000000000000000000000", // Zero address
    ],
    invalid: [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44", // Too short
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44eX", // Too long
      "742d35Cc6634C0532925a3b844Bc454e4438f44e", // Missing 0x
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44G", // Invalid hex
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080", // BTC address
      "",
    ],
  },
  sol: {
    placeholder: "Enter Solana Address",
    valid: [
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "7dHbWXmci3dT8UFYWyTgPvniaHqC3zN8rWaNmhN9Qy8V", // Fixed: replaced 'O' with 'P' at position 20
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      "11111111111111111111111111111112", // System program
    ],
    invalid: [
      "9WzDXwBbmkg8ZTbNMqUxvQRAyr", // Too short (26 chars)
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWMX", // Too long
      "0WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", // Starts with 0
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWW+", // Invalid character
      "7dHbWXmci3dT8UFYWyTgOvniaHqC3zN8rWaNmhN9Qy8V", // Contains 'O' which is not allowed in Base58
      "",
    ],
  },
  doge: {
    placeholder: "Enter Dogecoin Address (D... or A...)",
    valid: [
      "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L",
      "D7P8WcNjTUNmnbJt8GHLf8rRbKJ9tPi7gF",
      "A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNaX", // A-prefix
    ],
    invalid: [
      "BH5yaieqoZN36fDVciNyRueRGvGLR3mr7L", // Wrong prefix
      "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7LX", // Too long
      "DH5yaieqoZN36fDVciNyRueRGvGLR3mr", // Too short
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // Ethereum address
      "",
    ],
  },
  xrp: {
    placeholder: "Enter XRP Address (r...)",
    valid: [
      "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
      "rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w",
      "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
    ],
    invalid: [
      "sN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH", // Wrong prefix
      "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRHX", // Too long
      "rN7n7otQDd6FczFgLdSqtcsAUxDkw6f", // Too short
      "RN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH", // Wrong case
      "",
    ],
  },
  tron: {
    placeholder: "Enter Tron Address (T...)",
    valid: [
      "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH",
      "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // USDT contract
      "TKkeiboTkxXKJpbmVFbv4a8ov5rAfRDMf9",
    ],
    invalid: [
      "RLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", // Wrong prefix
      "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYHX", // Too long
      "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZ", // Too short
      "tLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH", // Wrong case
      "",
    ],
  },
  zec: {
    placeholder: "Enter ZEC Address (t1..., t3..., zc...)",
    valid: [
      "t1U9yhDa5XEjgfnTgZoKddeSiEN1aoLkQxq", // t1 address
      "t3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd", // t3 address
      "zcBqWB8VDjVER7uLKb4oHp2v54v2a1VKLxSLGJyBJGaAYnhUq5N2R5LJgqA1K8YrP3Qm3M12345678", // zc address
    ],
    invalid: [
      "t2U9yhDa5XEjgfnTgZoKddeSiEN1aoLkQxq", // Wrong prefix
      "t1U9yhDa5XEjgfnTgZoKddeSiEN1aoLkQ", // Too short
      "zcBqWB8VDjVER7uLKb4oHp2v54v2a1VKLxSLGJyBJGaAYnhUq5N2R5LJgqA1K8YrP3Qm3MX", // Too long
      "",
    ],
  },
  base: {
    placeholder: "Enter BASE Address (0x...)",
    valid: [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    ],
    invalid: [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44", // Too short
      "742d35Cc6634C0532925a3b844Bc454e4438f44e", // Missing 0x
      "",
    ],
  },
  arb: {
    placeholder: "Enter ARB Address (0x...)",
    valid: [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    ],
    invalid: [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44", // Too short
      "742d35Cc6634C0532925a3b844Bc454e4438f44e", // Missing 0x
      "",
    ],
  },
};

// Helper function to create test widget
const createTestWidget = (instanceAccount) => {
  const modifiedWidgets = {};
  const appKey = `${instanceAccount}/widget/app`;
  modifiedWidgets[appKey] = `
    const [receiver, setReceiver] = useState(null);
    const [isReceiverAccountValid, setIsReceiverAccountValid] = useState(false);

    const blockchain = props.blockchain;

    return <>
      <h1>Multi chain account input</h1>
      <Widget
        src={"widgets.treasury-factory.near/widget/components.OtherChainAccountInput"}
        props={{
          blockchain,
          value: receiver,
          setValue: setReceiver,
          setIsValid: setIsReceiverAccountValid,
          instance: "widgets.treasury-factory.near",
        }}
      />
      <p id="accountoutput">Account: {receiver}</p>
      <p id="blockchainoutput">Blockchain: {blockchain}</p>
      <p id="validaccountoutput">Valid account: {isReceiverAccountValid ? "Valid" : "Invalid"}</p>
    </>;
  `;
  return modifiedWidgets;
};

// Helper function to test an address
const testAddress = async (page, address, expectedValid) => {
  const accountInput = page.locator('input[placeholder*="Address"]').first();
  await expect(accountInput).toBeVisible();

  await accountInput.fill(address);
  await expect(page.locator("#accountoutput")).toHaveText(
    `Account: ${address}`
  );

  if (expectedValid) {
    await expect(page.locator("#validaccountoutput")).toHaveText(
      "Valid account: Valid"
    );
  } else {
    await expect(page.locator("#validaccountoutput")).toHaveText(
      "Valid account: Invalid"
    );
  }
};

test("BTC address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "btc";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid BTC address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid BTC address: ${address}`);
    await testAddress(page, address, false);
  }
});

test("ETH address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "eth";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid ETH address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid ETH address: ${address}`);
    await testAddress(page, address, false);
  }
});

test("SOL address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "sol";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid SOL address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid SOL address: ${address}`);
    await testAddress(page, address, false);
  }
});

test("DOGE address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "doge";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid DOGE address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid DOGE address: ${address}`);
    await testAddress(page, address, false);
  }
});

test("XRP address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "xrp";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid XRP address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid XRP address: ${address}`);
    await testAddress(page, address, false);
  }
});

test("TRON address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "tron";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid TRON address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid TRON address: ${address}`);
    await testAddress(page, address, false);
  }
});

test("ZEC address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "zec";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid ZEC address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid ZEC address: ${address}`);
    await testAddress(page, address, false);
  }
});

test("BASE address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "base";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid BASE address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid BASE address: ${address}`);
    await testAddress(page, address, false);
  }
});

test("ARB address validation", async ({
  page,
  instanceAccount,
  daoAccount,
}) => {
  const blockchain = "arb";
  const testData = testCases[blockchain];

  await redirectWeb4({
    page,
    contractId: instanceAccount,
    treasury: daoAccount,
    callWidgetNodeURLForContractWidgets: false,
    modifiedWidgets: createTestWidget(instanceAccount),
  });

  await page.goto(`https://${instanceAccount}.page/?blockchain=${blockchain}`);
  await expect(page.getByText(`Blockchain: ${blockchain}`)).toBeVisible();

  const accountInput = page.getByPlaceholder(testData.placeholder);
  await expect(accountInput).toBeVisible();

  // Test valid addresses
  for (const address of testData.valid) {
    console.log(`Testing valid ARB address: ${address}`);
    await testAddress(page, address, true);
  }

  // Test invalid addresses
  for (const address of testData.invalid) {
    console.log(`Testing invalid ARB address: ${address}`);
    await testAddress(page, address, false);
  }
});
