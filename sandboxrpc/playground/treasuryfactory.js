import { KeyPairEd25519 } from "near-api-js/lib/utils/key_pair.js";
import { SandboxRPC } from "../../playwright-tests/util/sandboxrpc.js";
import { parseNearAmount } from "near-api-js/lib/utils/format.js";
import fs from "fs";
import path from "path";
import globPkg from "glob";
import { promisify } from "util";

const { glob } = globPkg;
const readFile = promisify(fs.readFile);

const testBootstrapAccount = "test-bootstrap.treasury-factory.near";

// https://github.com/bos-cli-rs/bos-cli-rs/blob/main/src/common.rs#L68
async function getLocalComponents() {
  const components = new Map(); // Equivalent to Rust's HashMap

  try {
    // Use glob to find all .jsx files in the ./src directory
    const files = glob.sync(`../../build/${testBootstrapAccount}/src/**/*.jsx`);

    for (const componentFilePath of files) {
      // Strip "src" prefix and file extension, then join with `.`
      const componentName = path
        .relative(`../../build/${testBootstrapAccount}/src`, componentFilePath)
        .replace(/\.jsx$/, "")
        .split(path.sep)
        .join(".");

      // Read the component code
      const code = await readFile(componentFilePath, "utf-8");

      // Look for a metadata file with the same base name
      const metadataFilePath = componentFilePath.replace(
        /\.jsx$/,
        ".metadata.json",
      );
      let metadata = null;

      if (fs.existsSync(metadataFilePath)) {
        const metadataJson = await readFile(metadataFilePath, "utf-8");
        metadata = JSON.parse(metadataJson);
      }

      // Store the component's code and metadata
      components.set(componentName, { code, metadata });
    }

    return components;
  } catch (error) {
    console.error("Error reading components:", error);
    throw error;
  }
}

function transformComponents(components) {
  const result = {};

  // Iterate over the Map entries (which are [key, value] pairs)
  components.forEach(({ code }, key) => {
    const parts = key.split(".");

    // Get the root domain
    const root = parts.slice(0, 3).join(".");

    // Get the subpath (everything after the first three parts)
    const subpath = parts
      .slice(3)
      .join(".")
      .replace(/\.src\./, ".")
      .replace(/\./g, "/");

    // Nested object creation
    const subkeys = subpath.split("/");

    let current = result[root] || (result[root] = {});

    // Handle case when subpath is empty (code is directly assigned to the root)
    if (subkeys.length === 1 && subkeys[0] === "") {
      current[""] = code;
    } else {
      // Handle regular case with subkeys
      subkeys.forEach((subkey, index) => {
        if (index === subkeys.length - 1) {
          // The last subkey stores the code directly
          current[subkey] = { "": code };
        } else {
          current = current[subkey] || (current[subkey] = {});
        }
      });
    }
  });

  return result;
}

const sandbox = new SandboxRPC();
await sandbox.init();

const treasuryFactoryContractId = "treasury-factory.near";
const instance_name = "test-treasury-instance";

const reference_widget_account_id = "treasury-testing.near";

const widgetReferenceAccountKeyPair = KeyPairEd25519.fromRandom();
await sandbox.keyStore.setKey(
  "sandbox",
  reference_widget_account_id,
  widgetReferenceAccountKeyPair,
);

await sandbox.account.functionCall({
  contractId: "near",
  methodName: "create_account",
  args: {
    new_account_id: reference_widget_account_id,
    new_public_key: widgetReferenceAccountKeyPair.getPublicKey().toString(),
  },
  gas: 300000000000000,
  attachedDeposit: parseNearAmount("2"),
});

const reference_widget_account = await sandbox.near.account(
  reference_widget_account_id,
);

const components = await getLocalComponents();
const transformed = transformComponents(components);

await reference_widget_account.functionCall({
  contractId: "social.near",
  methodName: "set",
  args: {
    data: {
      [reference_widget_account_id]: {
        widget: transformed,
      },
    },
  },
  attachedDeposit: parseNearAmount("1"),
});

const create_dao_args = {
  config: {
    name: instance_name,
    purpose: "creating dao treasury",
    metadata: "",
  },
  policy: {
    roles: [
      {
        kind: {
          Group: ["acc3.near", "acc2.near", "acc1.near"],
        },
        name: "Create Requests",
        permissions: [
          "call:AddProposal",
          "transfer:AddProposal",
          "config:Finalize",
        ],
        vote_policy: {},
      },
      {
        kind: {
          Group: ["acc1.near"],
        },
        name: "Manage Members",
        permissions: [
          "config:*",
          "policy:*",
          "add_member_to_role:*",
          "remove_member_from_role:*",
        ],
        vote_policy: {},
      },
      {
        kind: {
          Group: ["acc1.near", "acc2.near"],
        },
        name: "Vote",
        permissions: ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
        vote_policy: {},
      },
    ],
    default_vote_policy: {
      weight_kind: "RoleWeight",
      quorum: "0",
      threshold: [1, 2],
    },
    proposal_bond: "100000000000000000000000",
    proposal_period: "604800000000000",
    bounty_bond: "100000000000000000000000",
    bounty_forgiveness_period: "604800000000000",
  },
};

const createInstanceResult = await sandbox.account.functionCall({
  contractId: treasuryFactoryContractId,
  methodName: "create_instance",
  args: {
    sputnik_dao_factory_account_id: "sputnik-dao.near",
    social_db_account_id: "social.near",
    widget_reference_account_id: reference_widget_account_id,
    name: instance_name,
    create_dao_args: Buffer.from(JSON.stringify(create_dao_args)).toString(
      "base64",
    ),
  },
  gas: 300000000000000,
  attachedDeposit: parseNearAmount("9"),
});

console.log(
  "All receipts should have a successvalue. The list below of failed receipts should be empty",
);
console.log(
  createInstanceResult.receipts_outcome
    .filter((receipt_outcome) => receipt_outcome.outcome.status.Failure)
    .map((receipt_outcome) => JSON.stringify(receipt_outcome)),
);

console.log(
  `Calling the web4_get of the new instance account ${instance_name}.near. You should see the web page html contents`,
);

const web4GetResult = await sandbox.account.viewFunction({
  contractId: `${instance_name}.near`,
  methodName: "web4_get",
  args: { request: { path: "/" } },
});
console.log(
  Buffer.from(web4GetResult.body, "base64").toString().substring(0, 200) +
    ".... and there is more, but too long to show here",
);

console.log(
  `Calling get_policy of the newly created dao ${instance_name}.sputnik-dao.near. You should see the policy`,
);
const daoGetPolicyResult = await sandbox.account.viewFunction({
  contractId: `${instance_name}.sputnik-dao.near`,
  methodName: "get_policy",
  args: {},
});
console.log(daoGetPolicyResult);

console.log(
  `Calling socialdb get to see the deployed widgets for the newly created instance. You should see the same contents of the reference widget.`,
);
const socialGetResult = await sandbox.account.viewFunction({
  contractId: "social.near",
  methodName: "get",
  args: {
    keys: [`${instance_name}.near/widget/**`],
  },
});
console.log(socialGetResult);

await sandbox.quitSandbox();
