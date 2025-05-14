import { expect } from "@playwright/test";
import { test } from "../../util/test.js";
import { Worker, parseNEAR } from "near-workspaces";
import { redirectWeb4 } from "../../util/web4.js";

// Use the near-workspaces sandbox to deploy omft and intents contracts, make deposits, and test dashboard UI

test("show intents balance in dashboard (sandbox)", async ({ page }) => {
  test.setTimeout(120_000); // Increased timeout to 120 seconds
  // --- SANDBOX SETUP ---
  const worker = await Worker.init();
  const root = worker.rootAccount;

  // Import omft (ETH) and wNEAR contracts
  const omft = await worker.rootAccount.importContract({ mainnetContract: "omft.near" });
  const wnear = await worker.rootAccount.importContract({ mainnetContract: "wrap.near" });

  // Import intents contract
  const intents = await worker.rootAccount.importContract({ mainnetContract: "intents.near" });

  // Import treasury contract (dashboard instance)
  const treasury = await worker.rootAccount.importContract({ mainnetContract: "treasury-testing.near" });

  // Initialize omft contract
  await omft.call(omft.accountId, "new", {
    super_admins: ["omft.near"],
    admins: {},
    grantees: {
      DAO: ["omft.near"],
      TokenDeployer: ["omft.near"],
      TokenDepositer: ["omft.near"],
    },
  });

  // Deploy ETH token
  await omft.call(omft.accountId, "deploy_token", {
    token: "eth",
    metadata: {
      spec: "ft-1.0.0",
      name: "Ethereum",
      symbol: "ETH",
      icon: "",
      reference: null,
      reference_hash: null,
      decimals: 18,
    },
  }, { attachedDeposit: parseNEAR("3"), gas: "300000000000000" });

  // Initialize intents contract
  await intents.call(intents.accountId, "new", {
    config: {
      wnear_id: "wrap.near",
      fees: { fee: 100, fee_collector: "intents.near" },
      roles: { super_admins: ["intents.near"], admins: {}, grantees: {} },
    },
  });

  // Initialize wNEAR contract
  await wnear.call(wnear.accountId, "new", {
    owner_id: wnear.accountId,
    total_supply: "1000000000000000000000000000",
    metadata: {
      spec: "ft-1.0.0",
      name: "Wrapped NEAR",
      symbol: "WNEAR",
      decimals: 24,
    },
  });

  // Register storage for treasury and intents
  await omft.call("eth.omft.near", "storage_deposit", {
    account_id: treasury.accountId,
    registration_only: true,
  }, { attachedDeposit: "1250000000000000000000" });

  await omft.call("eth.omft.near", "storage_deposit", {
    account_id: intents.accountId,
    registration_only: true,
  }, { attachedDeposit: "1250000000000000000000" });

  await wnear.call(wnear.accountId, "storage_deposit", {
    account_id: treasury.accountId,
    registration_only: true,
  }, { attachedDeposit: "1250000000000000000000" });

  await wnear.call(wnear.accountId, "storage_deposit", {
    account_id: intents.accountId,
    registration_only: true,
  }, { attachedDeposit: "1250000000000000000000" });

  // Register storage for wnear on itself (for ft_transfer_call)
  await wnear.call(wnear.accountId, "storage_deposit", {
    account_id: wnear.accountId,
    registration_only: true,
  }, { attachedDeposit: "1250000000000000000000" });

  // Register root account on wNEAR to be able to deposit and transfer
  await wnear.call(wnear.accountId, "storage_deposit", {
    account_id: worker.rootAccount.accountId,
    registration_only: true,
  }, { attachedDeposit: "1250000000000000000000" });

  // Mint wNEAR to root account by depositing NEAR
  await worker.rootAccount.call(wnear.accountId, "near_deposit", {}, {
    attachedDeposit: parseNEAR("1.1"), // Deposit 1.1 NEAR to get >1 wNEAR
  });

  // Transfer wNEAR from root account to wnear.accountId so it has balance to send
  await worker.rootAccount.call(wnear.accountId, "ft_transfer", {
    receiver_id: wnear.accountId,
    amount: "1050000000000000000000000", // 1.05 wNEAR
  }, { attachedDeposit: "1" });

  // Deposit ETH token to treasury via intents using ft_deposit (simulating bridge)
  await omft.call(omft.accountId, "ft_deposit", {
    owner_id: intents.accountId,
    token: "eth",
    amount: "1000000000000000000", // 1 ETH (minimal units)
    msg: JSON.stringify({ receiver_id: treasury.accountId }),
    memo: `BRIDGED_FROM:${JSON.stringify({
      networkType: "eth",
      chainId: "1",
      txHash: "0xc6b7ecd5c7517a8f56ac7ec9befed7d26a459fc97c7d5cd7598d4e19b5a806b7",
    })}`,
  }, {
    attachedDeposit: parseNEAR("0.00125"),
    gas: "300000000000000",
  });

  // Deposit NEAR (wNEAR) to treasury via intents using ft_transfer_call
  await wnear.call(wnear.accountId, "ft_transfer_call", {
    receiver_id: intents.accountId,
    amount: "1000000000000000000000000", // 1 NEAR (yocto)
    msg: JSON.stringify({ receiver_id: treasury.accountId }),
  }, { attachedDeposit: "1", gas: "300000000000000" });

  // --- CONTRACT BALANCE CHECKS ---
  const ethTokenId = "nep141:eth.omft.near";
  const wnearTokenId = "nep141:wrap.near"; // Assuming wrap.near is the accountId for wNEAR

  // Check ETH balance on intents contract for the treasury
  const ethBalance = await intents.view("mt_balance_of", {
    account_id: treasury.accountId,
    token_id: ethTokenId,
  });
  expect(ethBalance).toEqual("1000000000000000000");

  // Check wNEAR balance on intents contract for the treasury
  const wnearBalance = await intents.view("mt_balance_of", {
    account_id: treasury.accountId,
    token_id: wnearTokenId,
  });
  expect(wnearBalance).toEqual("1000000000000000000000000");

  // --- UI TEST ---
  await redirectWeb4({ page, contractId: treasury.accountId });
  await page.goto(`https://${treasury.accountId}.page`);

  await expect(page.getByText("Near Intents")).toBeVisible();
  await expect(page.getByText("ETH")).toBeVisible();
  await expect(page.getByText("WNEAR")).toBeVisible();
  await expect(page.getByText("1.00")).toBeVisible(); // 1 ETH
  await expect(page.getByText("1.00")).toBeVisible(); // 1 NEAR (WNEAR)

  await worker.tearDown();
});
