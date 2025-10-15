use cargo_near_build::BuildOpts;
use near_sdk::base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use near_sdk::serde::Deserialize;
use near_sdk::{AccountId, NearToken};
use near_workspaces::types::AccessKeyPermission;
use near_workspaces::types::PublicKey;
use serde_json::{json, Value};
use std::fs;
use std::str::FromStr;

const TREASURY_FACTORY_CONTRACT_ACCOUNT: &str = "treasury-factory.near";
const SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT: &str = "sputnik-dao.near";
const SOCIALDB_ACCOUNT: &str = "social.near";
const WIDGET_REFERENCE_ACCOUNT_ID: &str = "treasury-testing.near";

fn build_project_once() -> Vec<u8> {
    let wasm_path = "./target/near/treasury_factory.wasm";
    if std::path::Path::new(wasm_path).exists() {
        fs::read(wasm_path).expect("Unable to read existing contract wasm")
    } else {
        let build_opts = BuildOpts::builder().build();
        let build_artifact = cargo_near_build::build(build_opts).expect("Failed to build contract");
        fs::read(build_artifact.path).expect("Unable to read contract wasm")
    }
}

fn load_sputnikdao_factory_wasm() -> Vec<u8> {
    let wasm_path = "../../sputnik-dao-contract/target/near/sputnikdao_factory2/sputnikdao_factory2.wasm";
    fs::read(wasm_path).expect("Unable to read sputnikdao-factory2 wasm. Make sure to build it first.")
}

fn create_preload_result(
    account_id: String,
    title: String,
    description: String,
) -> serde_json::Value {
    let preload_url = format!(
        "/web4/contract/social.near/get?keys.json=%5B%22{}/widget/app/metadata/**%22%5D",
        account_id
    );
    let body_string = serde_json::json!({account_id:{"widget":{"app":{"metadata":{
        "description":description,
        "image":{"ipfs_cid":"bafkreido4srg4aj7l7yg2tz22nbu3ytdidjczdvottfr5ek6gqorwg6v74"},
        "name":title,
        "tags": {"devhub":"","communities":"","developer-governance":"","app":""}}}}}})
    .to_string();

    let body_base64 = BASE64_STANDARD.encode(body_string);
    serde_json::json!({
        preload_url: {
            "contentType": "application/json",
            "body": body_base64
        }
    })
}

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Web4Response {
    #[serde(rename = "contentType")]
    content_type: String,
    body: String,
}

fn normalize_json(value: &mut Value) {
    match value {
        Value::Array(arr) => {
            for elem in arr.iter_mut() {
                normalize_json(elem);
            }
            arr.sort_by(|a, b| {
                serde_json::to_string(a)
                    .unwrap()
                    .cmp(&serde_json::to_string(b).unwrap())
            });
        }
        Value::Object(map) => {
            for val in map.values_mut() {
                normalize_json(val);
            }
        }
        _ => {}
    }
}

#[tokio::test]
async fn test_factory_global_contract() -> Result<(), Box<dyn std::error::Error>> {
    let mainnet = near_workspaces::custom("https://rpc.mainnet.fastnear.com").await?;
    let sputnikdao_factory_contract_id: AccountId = SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT.parse()?;
    let socialdb_contract_id: AccountId = SOCIALDB_ACCOUNT.parse()?;
    let treasury_factory_contract_id: AccountId = TREASURY_FACTORY_CONTRACT_ACCOUNT.parse()?;

    let worker = near_workspaces::sandbox_with_version("2.8.0").await?;

    let treasury_factory_contract: near_workspaces::Contract = worker
        .import_contract(&treasury_factory_contract_id, &mainnet)
        .initial_balance(NearToken::from_near(1000))
        .transact()
        .await?;

    let sputnik_dao_factory = worker
        .import_contract(&sputnikdao_factory_contract_id, &mainnet)
        .initial_balance(NearToken::from_near(1000))
        .transact()
        .await?;
    let socialdb = worker
        .import_contract(&socialdb_contract_id, &mainnet)
        .initial_balance(NearToken::from_near(10000))
        .transact()
        .await?;
    let reference_widget_contract = worker
        .import_contract(&WIDGET_REFERENCE_ACCOUNT_ID.parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(20))
        .transact()
        .await?;
    let near_contract = worker
        .import_contract(&"near".parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(100_000_000))
        .transact()
        .await?;

    let init_near_result = near_contract.call("new").max_gas().transact().await?;
    if init_near_result.is_failure() {
        panic!(
            "Error initializing NEAR\n{:?}",
            String::from_utf8(init_near_result.raw_bytes().unwrap())
        );
    }

    let init_socialdb_result = socialdb.call("new").max_gas().transact().await?;
    if init_socialdb_result.is_failure() {
        panic!(
            "Error initializing socialDB\n{:?}",
            String::from_utf8(init_socialdb_result.raw_bytes().unwrap())
        );
    }
    assert!(init_socialdb_result.is_success());

    let set_socialdb_status_result = socialdb
        .call("set_status")
        .args_json(json!({"status": "Live"}))
        .max_gas()
        .transact()
        .await?;
    assert!(set_socialdb_status_result.is_success());

    let reference_widget_data = json!({
        reference_widget_contract.id().as_str(): {
            "widget": {
                "app": "Hello",
                "config": "Goodbye"
            }
        }
    });
    let social_set_result = reference_widget_contract
        .as_account()
        .call(socialdb.id(), "set")
        .args_json(json!({
            "data": reference_widget_data
        }))
        .deposit(NearToken::from_near(2))
        .transact()
        .await?;
    assert!(social_set_result.is_success());

    let treasury_factory_contract_wasm = build_project_once();
    let treasury_factory_contract = treasury_factory_contract
        .as_account()
        .deploy(&treasury_factory_contract_wasm)
        .await?
        .result;

    // Deploy web4 contract as a global contract to the factory account itself
    let deploy_global_result = treasury_factory_contract
        .call("deploy_web4_global_contract")
        .max_gas()
        .transact()
        .await?;
    assert!(
        deploy_global_result.is_success(),
        "Failed to deploy global web4 contract: {:?}",
        deploy_global_result.receipt_failures()
    );

    // Deploy updated sputnikdao-factory2 with global contract support
    let sputnikdao_factory_wasm = load_sputnikdao_factory_wasm();
    let sputnik_dao_factory = sputnik_dao_factory
        .as_account()
        .deploy(&sputnikdao_factory_wasm)
        .await?
        .result;

    let init_sputnik_dao_factory_result =
        sputnik_dao_factory.call("new").max_gas().transact().await?;
    if init_sputnik_dao_factory_result.is_failure() {
        panic!(
            "Error initializing sputnik-dao contract: {:?}",
            String::from_utf8(init_sputnik_dao_factory_result.raw_bytes().unwrap())
        );
    }
    assert!(init_sputnik_dao_factory_result.is_success());

    // Deploy DAO contract as a global contract to the sputnikdao-factory account
    let deploy_dao_global_result = sputnik_dao_factory
        .call("deploy_dao_global_contract")
        .max_gas()
        .transact()
        .await?;
    assert!(
        deploy_dao_global_result.is_success(),
        "Failed to deploy global DAO contract: {:?}",
        deploy_dao_global_result.receipt_failures()
    );

    let instance_name = "test-treasury-global";
    let instance_account_id = format!("{}.near", instance_name);

    let one_required_vote_policy = json!({
        "weight_kind": "RoleWeight",
        "quorum": "0",
        "threshold": "1"
    });

    let create_dao_args = json!({
        "config": {
            "name": instance_name,
            "purpose": "creating dao treasury with global contract",
            "metadata": ""
        },
        "policy": {
            "roles": [
                {
                    "kind": {
                        "Group": ["acc3.near", "acc2.near", "acc1.near"]
                    },
                    "name": "Requestor",
                    "permissions": [
                        "call:AddProposal",
                        "transfer:AddProposal",
                        "call:VoteRemove",
                        "transfer:VoteRemove"
                    ],
                    "vote_policy": {
                        "transfer": one_required_vote_policy,
                        "call": one_required_vote_policy
                    }
                },
                {
                    "kind": {
                        "Group": ["acc1.near"]
                    },
                    "name": "Admin",
                    "permissions": [
                        "config:*",
                        "policy_update_parameters:*",
                        "add_bounty:*",
                        "remove_member_from_role:*",
                        "upgrade_self:*",
                        "policy_remove_role:*",
                        "set_vote_token:*",
                        "upgrade_remote:*",
                        "bounty_done:*",
                        "add_member_to_role:*",
                        "factory_info_update:*",
                        "policy:*",
                        "policy_add_or_update_role:*",
                        "policy_update_default_vote_policy:*"
                    ],
                    "vote_policy": {
                        "config": one_required_vote_policy,
                        "policy": one_required_vote_policy,
                        "add_member_to_role": one_required_vote_policy,
                        "remove_member_from_role": one_required_vote_policy,
                        "upgrade_self": one_required_vote_policy,
                        "upgrade_remote": one_required_vote_policy,
                        "set_vote_token": one_required_vote_policy,
                        "add_bounty": one_required_vote_policy,
                        "bounty_done": one_required_vote_policy,
                        "factory_info_update": one_required_vote_policy,
                        "policy_add_or_update_role": one_required_vote_policy,
                        "policy_remove_role": one_required_vote_policy,
                        "policy_update_default_vote_policy": one_required_vote_policy,
                        "policy_update_parameters": one_required_vote_policy
                    }
                },
                {
                    "kind": {
                        "Group": ["acc1.near", "acc2.near"]
                    },
                    "name": "Approver",
                    "permissions": [
                        "call:VoteReject",
                        "call:VoteApprove",
                        "call:RemoveProposal",
                        "call:Finalize",
                        "transfer:VoteReject",
                        "transfer:VoteApprove",
                        "transfer:RemoveProposal",
                        "transfer:Finalize"
                    ],
                    "vote_policy": {
                        "transfer": one_required_vote_policy,
                        "call": one_required_vote_policy
                    }
                }
            ],
            "default_vote_policy": {
                "weight_kind": "RoleWeight",
                "quorum": "0",
                "threshold": [1, 2]
            },
            "proposal_bond": "100000000000000000000000",
            "proposal_period": "604800000000000",
            "bounty_bond": "100000000000000000000000",
            "bounty_forgiveness_period": "604800000000000"
        }
    });

    let user_account = worker.dev_create_account().await?;
    let treasury_factory_account_details_before = treasury_factory_contract.view_account().await?;
    let user_account_details_before = user_account.view_account().await?;

    // Call create_instance_global_contract with 2 NEAR deposit
    let create_treasury_instance_result = user_account
        .call(
            treasury_factory_contract.id(),
            "create_instance_global_contract",
        )
        .args_json(json!(
            {
                "sputnik_dao_factory_account_id": SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT,
                "social_db_account_id": SOCIALDB_ACCOUNT,
                "widget_reference_account_id": WIDGET_REFERENCE_ACCOUNT_ID,
                "name": instance_name,
                "create_dao_args": BASE64_STANDARD.encode(create_dao_args.to_string())
            }
        ))
        .max_gas()
        .deposit(NearToken::from_near(2))
        .transact()
        .await?;

    println!("logs: {:?}", create_treasury_instance_result.logs());
    let user_account_details_after = user_account.view_account().await?;
    let treasury_factory_account_details_after = treasury_factory_contract.view_account().await?;

    assert_eq!(
        create_treasury_instance_result.receipt_failures().len(),
        0,
        "Total tgas burnt {:?}, Receipt failures: {:?}",
        create_treasury_instance_result.total_gas_burnt.as_tgas(),
        create_treasury_instance_result.receipt_failures()
    );

    assert!(create_treasury_instance_result.is_success());

    // User should have spent at least 2 NEAR
    assert!(
        user_account_details_after.balance
            < (user_account_details_before
                .balance
                .saturating_sub(NearToken::from_near(2))),
        "User balance after ( {} mNEAR) should be at least 2 NEAR less than before creating instance ( {} mNEAR ). {:?}",
        user_account_details_after.balance.as_millinear(),
        user_account_details_before.balance.as_millinear(),
        create_treasury_instance_result.logs()
    );

    assert!(
        treasury_factory_account_details_after
            .balance
            .as_millinear()
            - treasury_factory_account_details_before
                .balance
                .as_millinear()
            < 10,
        "treasury factory balance after ({}) should be equal or slightly above balance before ({}). {:?}",
        treasury_factory_account_details_after
            .balance
            .as_millinear(),
        treasury_factory_account_details_before
            .balance
            .as_millinear(),
        create_treasury_instance_result.logs()
    );

    assert!(
        treasury_factory_account_details_after.balance
            > treasury_factory_account_details_before.balance
    );

    println!(
        "Total tgas burnt {:?}",
        create_treasury_instance_result.total_gas_burnt.as_tgas()
    );

    // Verify instance account uses global contract (should have 500 milliNEAR balance)
    let instance_account_details = worker
        .view_account(&instance_account_id.parse().unwrap())
        .await?;
    assert_eq!(
        instance_account_details.balance.as_millinear(),
        500,
        "Instance account should have 500 mNEAR when using global contract"
    );

    // Verify web4_get works
    let result = worker
        .view(&instance_account_id.parse().unwrap(), "web4_get")
        .args_json(json!({"request": {"path": "/", "preloads": create_preload_result(instance_account_id.clone(), String::from("test treasury title"), String::from("test description"))}}))
        .await?;

    let response = result.json::<Web4Response>().unwrap();
    assert_eq!("text/html; charset=UTF-8", response.content_type);

    let body_string = String::from_utf8(BASE64_STANDARD.decode(response.body).unwrap()).unwrap();

    assert!(body_string.contains("near-social-viewer"));
    assert!(body_string.contains("\"test treasury title\""));

    // Verify DAO was created
    let get_config_result = worker
        .view(
            &format!("{}.{}", instance_name, SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT)
                .parse()
                .unwrap(),
            "get_config",
        )
        .await?;

    let config: Value = get_config_result.json().unwrap();
    assert_eq!(create_dao_args["config"], config);

    let get_policy_result = worker
        .view(
            &format!("{}.sputnik-dao.near", instance_name)
                .parse()
                .unwrap(),
            "get_policy",
        )
        .await?;

    let policy: Value = get_policy_result.json().unwrap();
    let mut create_dao_policy = create_dao_args["policy"].clone();
    let mut expected_policy = policy.clone();

    normalize_json(&mut create_dao_policy);
    normalize_json(&mut expected_policy);

    assert_eq!(create_dao_policy, expected_policy);

    // Verify widgets were deployed
    let deployed_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", instance_account_id)]
        }))
        .view()
        .await?;

    let deployed_widgets_json =
        Value::from_str(String::from_utf8(deployed_widgets.result).unwrap().as_str()).unwrap();

    assert_eq!(
        deployed_widgets_json[instance_account_id.clone()]["widget"]["app"][""],
        reference_widget_data[reference_widget_contract.id().as_str()]["widget"]["app"]
    );
    assert_eq!(
        deployed_widgets_json[instance_account_id.clone()]["widget"]["config"],
        reference_widget_data[reference_widget_contract.id().as_str()]["widget"]["config"]
    );

    // Verify access keys
    let admin_full_access_public_key: PublicKey =
        "ed25519:DuAFUPhxv3zBDbZP8oCwC1KQPVzaUY88s5tECv8JDPMg"
            .parse()
            .unwrap();
    let admin_access_key = worker
        .view_access_key(
            &instance_account_id.parse().unwrap(),
            &admin_full_access_public_key,
        )
        .await?;
    assert!(
        matches!(admin_access_key.permission, AccessKeyPermission::FullAccess),
        "Expected FullAccess permission"
    );

    let user_full_access_public_key = user_account.secret_key().public_key();
    let user_access_key = worker
        .view_access_key(
            &instance_account_id.parse().unwrap(),
            &user_full_access_public_key,
        )
        .await?;
    assert!(
        matches!(user_access_key.permission, AccessKeyPermission::FullAccess),
        "Expected FullAccess permission"
    );

    // Verify social metadata
    let social_metadata = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/app/metadata/**", instance_account_id)]
        }))
        .view()
        .await?;

    let social_metadata_json: Value =
        Value::from_str(String::from_utf8(social_metadata.result).unwrap().as_str()).unwrap();
    let metadata = &social_metadata_json[instance_account_id.clone()]["widget"]["app"]["metadata"];
    assert_eq!(metadata["name"].as_str().unwrap(), "NEAR Treasury");
    assert_eq!(
        metadata["description"],
        format!("NEAR Treasury / {}", instance_account_id)
    );
    assert_eq!(
        metadata["image"]["ipfs_cid"],
        "bafkreiefdkigadpkpccreqfnhut2li2nmf3alhz7c3wadveconelisnksu"
    );

    // Test updating the global contract
    println!("\n=== Testing Global Contract Update ===");

    // Modify the factory wasm (which embeds the web4 contract)
    // Replace "near-social-viewer" -> "UPDATED-VIEWER-V2" (same length: 18 bytes)
    let original_string = b"<title></title>";
    let replacement_string = b"<totle></totle>";

    assert_eq!(
        original_string.len(),
        replacement_string.len(),
        "Strings must have equal length"
    );

    let mut updated_factory_wasm = treasury_factory_contract_wasm.clone();

    // Find and replace all occurrences in the binary data
    for i in 0..updated_factory_wasm
        .len()
        .saturating_sub(original_string.len())
    {
        if &updated_factory_wasm[i..i + original_string.len()] == original_string {
            updated_factory_wasm[i..i + replacement_string.len()]
                .copy_from_slice(replacement_string);
            println!("Found and replaced string at position {}", i);
        }
    }

    // Deploy the updated factory contract
    let deploy_updated_factory_result = treasury_factory_contract
        .as_account()
        .deploy(&updated_factory_wasm)
        .await?;
    assert!(
        deploy_updated_factory_result.is_success(),
        "Failed to deploy updated factory"
    );

    // Update the global contract
    let update_global_result = treasury_factory_contract
        .call("deploy_web4_global_contract")
        .max_gas()
        .transact()
        .await?;
    assert!(
        update_global_result.is_success(),
        "Failed to update global web4 contract: {:?}",
        update_global_result.receipt_failures()
    );

    println!("{:?}", update_global_result);

    worker.fast_forward(10).await?;

    // Verify the existing instance now uses the updated global contract
    let result_after_update = worker
        .view(&instance_account_id.parse().unwrap(), "web4_get")
        .args_json(json!({"request": {"path": "/", "preloads": create_preload_result(instance_account_id.clone(), String::from("test treasury title"), String::from("test description"))}}))
        .await?;

    let response_after_update = result_after_update.json::<Web4Response>().unwrap();
    let body_string_after_update =
        String::from_utf8(BASE64_STANDARD.decode(response_after_update.body).unwrap()).unwrap();

    assert!(
        !body_string_after_update.contains("<title></title>"),
        "Updated global contract should not contain the original string"
    );

    // Verify the updated string is present
    assert!(
        body_string_after_update.contains("<totle></totle>"),
        "Updated global contract should contain the replacement string"
    );

    println!("✅ Global contract update test passed!");

    Ok(())
}
