use cargo_near_build::BuildOpts;
use lazy_static::lazy_static;
use near_sdk::base64::prelude::BASE64_STANDARD;
use near_sdk::base64::{engine::general_purpose, Engine as _};
use near_sdk::serde::Deserialize;
use near_sdk::{AccountId, NearToken};
use near_workspaces::types::AccessKeyPermission;
use near_workspaces::types::PublicKey;
use serde_json::{json, Value};
use std::fs;
use std::str::FromStr;
use std::sync::{Mutex, Once};

// Ensure `build_project` only runs once
lazy_static! {
    static ref CONTRACT_WASM: Mutex<Vec<u8>> = Mutex::new(Vec::new());
}

static INIT: Once = Once::new();

fn build_project_once() -> Vec<u8> {
    INIT.call_once(|| {
        let build_opts = BuildOpts::builder().build();
        let build_artifact = cargo_near_build::build(build_opts).expect("Failed to build contract");

        println!("Building contract");
        let wasm = fs::read(build_artifact.path).expect("Unable to read contract wasm");
        let mut contract_wasm = CONTRACT_WASM.lock().unwrap();
        *contract_wasm = wasm;
    });

    CONTRACT_WASM.lock().unwrap().clone()
}

fn create_preload_result(
    account_id: String,
    title: String,
    description: String,
) -> serde_json::Value {
    let preload_url = format!(
        "/web4/contract/social.near/get?keys.json=%5B%22{}/widget/app/metadata/**%22%5D",
        account_id.as_str()
    );
    let body_string = serde_json::json!({account_id:{"widget":{"app":{"metadata":{
        "description":description,
        "image":{"ipfs_cid":"bafkreido4srg4aj7l7yg2tz22nbu3ytdidjczdvottfr5ek6gqorwg6v74"},
        "name":title,
        "tags": {"devhub":"","communities":"","developer-governance":"","app":""}}}}}})
    .to_string();

    let body_base64 = BASE64_STANDARD.encode(body_string);
    return serde_json::json!({
            String::from(preload_url): {
                "contentType": "application/json",
                "body": body_base64
            }
    });
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
                normalize_json(elem); // Recursively normalize elements
            }
            arr.sort_by(|a, b| {
                serde_json::to_string(a)
                    .unwrap()
                    .cmp(&serde_json::to_string(b).unwrap())
            }); // Sort array without moving it
        }
        Value::Object(map) => {
            for val in map.values_mut() {
                normalize_json(val); // Recursively normalize values
            }
        }
        _ => {} // Do nothing for other types
    }
}

#[tokio::test]
async fn test_web4() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = build_project_once();

    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let result = contract
        .view("web4_get")
        .args_json(json!({"request": {"path": "/"}}))
        .await?;
    let response = result.json::<Web4Response>().unwrap();
    assert_eq!("text/html; charset=UTF-8", response.content_type);

    let body_string =
        String::from_utf8(general_purpose::STANDARD.decode(response.body).unwrap()).unwrap();
    assert!(body_string.contains("near-social-viewer"));

    Ok(())
}

#[tokio::test]
async fn test_factory() -> Result<(), Box<dyn std::error::Error>> {
    const TREASURY_FACTORY_CONTRACT_ACCOUNT: &str = "treasury-factory.near";
    const SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT: &str = "sputnik-dao.near";
    const SOCIALDB_ACCOUNT: &str = "social.near";
    const WIDGET_REFERENCE_ACCOUNT_ID: &str = "treasury-testing.near";

    let mainnet = near_workspaces::mainnet().await?;
    let sputnikdao_factory_contract_id: AccountId = SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT.parse()?;
    let socialdb_contract_id: AccountId = SOCIALDB_ACCOUNT.parse()?;
    let treasury_factory_contract_id: AccountId = TREASURY_FACTORY_CONTRACT_ACCOUNT.parse()?;

    let worker = near_workspaces::sandbox().await?;

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

    let init_sputnik_dao_factory_result =
        sputnik_dao_factory.call("new").max_gas().transact().await?;
    if init_sputnik_dao_factory_result.is_failure() {
        panic!(
            "Error initializing sputnik-dao contract: {:?}",
            String::from_utf8(init_sputnik_dao_factory_result.raw_bytes().unwrap())
        );
    }
    assert!(init_sputnik_dao_factory_result.is_success());

    let instance_name = "test-treasury-instance";
    let instance_account_id = format!("{}.near", instance_name);

    let create_dao_args = json!({
        "config": {
            "name": instance_name,
            "purpose": "creating dao treasury",
            "metadata": "",
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
                        "transfer": {
                            "weight_kind": "RoleWeight",
                            "quorum": "0",
                            "threshold": "1"
                        },
                        "call": {
                            "weight_kind": "RoleWeight",
                            "quorum": "0",
                            "threshold": "1"
                        }
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
                    "vote_policy": {}
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
                    "vote_policy": {}
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

    let create_treasury_instance_result = user_account
        .call(treasury_factory_contract.id(), "create_instance")
        .args_json(json!(
            {
                "sputnik_dao_factory_account_id": SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT,
                "social_db_account_id": SOCIALDB_ACCOUNT,
                "widget_reference_account_id": WIDGET_REFERENCE_ACCOUNT_ID,
                "name": instance_name,
                "create_dao_args": general_purpose::STANDARD.encode(create_dao_args.to_string())
            }
        ))
        .max_gas()
        .deposit(NearToken::from_near(9))
        .transact()
        .await?;

    if create_treasury_instance_result.is_failure() {
        panic!(
            "Error creating treasury instance {:?}",
            String::from_utf8(create_treasury_instance_result.raw_bytes().unwrap())
        );
    }

    let user_account_details_after = user_account.view_account().await?;
    let treasury_factory_account_details_after = treasury_factory_contract.view_account().await?;
    assert!(create_treasury_instance_result.is_success());

    assert_eq!(
        create_treasury_instance_result.receipt_failures().len(),
        0,
        "Should not be receipt failures: {:?}",
        create_treasury_instance_result.receipt_failures()
    );

    assert!(
        user_account_details_after.balance
            < (user_account_details_before
                .balance
                .saturating_sub(NearToken::from_near(9)))
    );

    assert!(
        treasury_factory_account_details_after
            .balance
            .as_millinear()
            - treasury_factory_account_details_before
                .balance
                .as_millinear()
            < 10,
        "treasury factory balance after ({}) should be equal or slightly above balance before ({})",
        treasury_factory_account_details_after
            .balance
            .as_millinear(),
        treasury_factory_account_details_before
            .balance
            .as_millinear()
    );

    assert!(
        treasury_factory_account_details_after.balance
            > treasury_factory_account_details_before.balance
    );

    println!(
        "Total tgas burnt {:?}",
        create_treasury_instance_result.total_gas_burnt.as_tgas()
    );

    let result = treasury_factory_contract
        .as_account()
        .view(&instance_account_id.parse().unwrap(), "web4_get")
        .args_json(json!({"request": {"path": "/", "preloads": create_preload_result(instance_account_id.clone(), String::from("test treasury title"), String::from("test description"))}}))
        .await?;

    let response = result.json::<Web4Response>().unwrap();
    assert_eq!("text/html; charset=UTF-8", response.content_type);

    let body_string =
        String::from_utf8(general_purpose::STANDARD.decode(response.body).unwrap()).unwrap();

    assert!(body_string.contains("near-social-viewer"));
    assert!(body_string.contains("\"test treasury title\""));

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

    let social_metadata = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/app/metadata/**", instance_account_id)]
        }))
        .view()
        .await?;
    println!(
        "{:?}",
        String::from_utf8(social_metadata.result.clone())
            .unwrap()
            .as_str()
    );

    let social_metadata_json: Value =
        Value::from_str(String::from_utf8(social_metadata.result).unwrap().as_str()).unwrap();
    let metadata = &social_metadata_json[instance_account_id.clone()]["widget"]["app"]["metadata"];
    assert_eq!(metadata["name"], "NEAR treasury");
    assert_eq!(
        metadata["description"],
        format!("NEAR treasury for {}", instance_account_id)
    );
    assert_eq!(
        metadata["image"]["ipfs_cid"],
        "bafkreiboarigt5w26y5jyxyl4au7r2dl76o5lrm2jqjgqpooakck5xsojq"
    );

    Ok(())
}

#[tokio::test]
async fn test_factory_should_refund_if_failing_because_of_existing_account(
) -> Result<(), Box<dyn std::error::Error>> {
    const SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT: &str = "sputnik-dao.near";
    const SOCIALDB_ACCOUNT: &str = "social.near";
    const WIDGET_REFERENCE_ACCOUNT_ID: &str = "treasury-testing.near";

    let mainnet = near_workspaces::mainnet().await?;
    let sputnikdao_factory_contract_id: AccountId = SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT.parse()?;
    let socialdb_contract_id: AccountId = SOCIALDB_ACCOUNT.parse()?;

    let worker = near_workspaces::sandbox().await?;

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

    let _ = worker
        .import_contract(&"intellex.near".parse().unwrap(), &mainnet)
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

    let social_set_result = reference_widget_contract
        .as_account()
        .call(socialdb.id(), "set")
        .args_json(json!({
            "data": {
                reference_widget_contract.id().as_str(): {
                    "widget": {
                        "app": "Hello",
                        "config": "Goodbye"
                    }
                }
            }
        }))
        .deposit(NearToken::from_near(2))
        .transact()
        .await?;
    assert!(social_set_result.is_success());

    let treasury_factory_contract_wasm = build_project_once();
    let treasury_factory_contract = worker.dev_deploy(&treasury_factory_contract_wasm).await?;

    let init_sputnik_dao_factory_result =
        sputnik_dao_factory.call("new").max_gas().transact().await?;
    if init_sputnik_dao_factory_result.is_failure() {
        panic!(
            "Error initializing sputnik-dao contract: {:?}",
            String::from_utf8(init_sputnik_dao_factory_result.raw_bytes().unwrap())
        );
    }
    assert!(init_sputnik_dao_factory_result.is_success());

    let instance_name = "intellex";

    let create_dao_args = json!({
        "config": {
        "name": instance_name,
        "purpose": "creating dao treasury",
        "metadata": "",
        },
        "policy": {
        "roles": [
            {
            "kind": {
                "Group": ["acc3.near", "acc2.near", "acc1.near"],
            },
            "name": "Create Requests",
            "permissions": [
                "call:AddProposal",
                "transfer:AddProposal",
            ],
            "vote_policy": {},
            },
            {
            "kind": {
                "Group": ["acc1.near"],
            },
            "name": "Manage Members",
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
            "vote_policy": {},
            },
            {
            "kind": {
                "Group": ["acc1.near", "acc2.near"],
            },
            "name": "Vote",
            "permissions": ["*:VoteReject", "*:VoteApprove", "*:VoteRemove", "*:RemoveProposal", "*:Finalize"],
            "vote_policy": {},
            },
        ],
        "default_vote_policy": {
            "weight_kind": "RoleWeight",
            "quorum": "0",
            "threshold": [1, 2],
        },
        "proposal_bond": "100000000000000000000000",
        "proposal_period": "604800000000000",
        "bounty_bond": "100000000000000000000000",
        "bounty_forgiveness_period": "604800000000000",
        },
    });

    let user_account = worker.dev_create_account().await?;
    let treasury_factory_account_details_before = treasury_factory_contract.view_account().await?;

    let user_account_details_before = user_account.view_account().await?;
    let create_treasury_instance_result = user_account
        .call(treasury_factory_contract.id(), "create_instance")
        .args_json(json!(
            {
                "sputnik_dao_factory_account_id": SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT,
                "social_db_account_id": SOCIALDB_ACCOUNT,
                "widget_reference_account_id": WIDGET_REFERENCE_ACCOUNT_ID,
                "name": instance_name,
                "create_dao_args": general_purpose::STANDARD.encode(create_dao_args.to_string())
            }
        ))
        .max_gas()
        .deposit(NearToken::from_near(9))
        .transact()
        .await?;

    let treasury_factory_account_details_after = treasury_factory_contract.view_account().await?;

    let failed_outcomes: Vec<_> = create_treasury_instance_result
        .receipt_outcomes()
        .iter()
        .filter(|outcome| outcome.is_failure())
        .collect();

    assert!(failed_outcomes.len() > 0);
    println!("{:?}", failed_outcomes);

    assert_eq!(
        "Failed creating treasury web4 account intellex.near",
        create_treasury_instance_result.logs().join("\n")
    );

    let user_account_details_after = user_account.view_account().await?;

    assert!(
        user_account_details_before.balance.as_millinear()
            - user_account_details_after.balance.as_millinear()
            < 10
    );

    assert!(
        treasury_factory_account_details_after.balance
            > treasury_factory_account_details_before.balance
    );

    Ok(())
}

#[tokio::test]
async fn test_factory_should_refund_if_failing_because_of_existing_dao(
) -> Result<(), Box<dyn std::error::Error>> {
    const SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT: &str = "sputnik-dao.near";
    const SOCIALDB_ACCOUNT: &str = "social.near";
    const WIDGET_REFERENCE_ACCOUNT_ID: &str = "treasury-testing.near";

    let mainnet = near_workspaces::mainnet().await?;
    let sputnikdao_factory_contract_id: AccountId = SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT.parse()?;
    let socialdb_contract_id: AccountId = SOCIALDB_ACCOUNT.parse()?;

    let worker = near_workspaces::sandbox().await?;

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

    let _ = worker
        .import_contract(&"intellex.sputnik-dao.near".parse().unwrap(), &mainnet)
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

    let social_set_result = reference_widget_contract
        .as_account()
        .call(socialdb.id(), "set")
        .args_json(json!({
            "data": {
                reference_widget_contract.id().as_str(): {
                    "widget": {
                        "app": "Hello",
                        "config": "Goodbye"
                    }
                }
            }
        }))
        .deposit(NearToken::from_near(2))
        .transact()
        .await?;
    assert!(social_set_result.is_success());

    let treasury_factory_contract_wasm = build_project_once();
    let treasury_factory_contract = worker.dev_deploy(&treasury_factory_contract_wasm).await?;

    let init_sputnik_dao_factory_result =
        sputnik_dao_factory.call("new").max_gas().transact().await?;
    if init_sputnik_dao_factory_result.is_failure() {
        panic!(
            "Error initializing sputnik-dao contract: {:?}",
            String::from_utf8(init_sputnik_dao_factory_result.raw_bytes().unwrap())
        );
    }
    assert!(init_sputnik_dao_factory_result.is_success());

    let instance_name = "intellex";

    let create_dao_args = json!({
        "config": {
        "name": instance_name,
        "purpose": "creating dao treasury",
        "metadata": "",
        },
        "policy": {
        "roles": [
            {
            "kind": {
                "Group": ["acc3.near", "acc2.near", "acc1.near"],
            },
            "name": "Create Requests",
            "permissions": [
                "call:AddProposal",
                "transfer:AddProposal",
            ],
            "vote_policy": {},
            },
            {
            "kind": {
                "Group": ["acc1.near"],
            },
            "name": "Manage Members",
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
            "vote_policy": {},
            },
            {
            "kind": {
                "Group": ["acc1.near", "acc2.near"],
            },
            "name": "Vote",
            "permissions": ["*:VoteReject", "*:VoteApprove", "*:VoteRemove", "*:RemoveProposal", "*:Finalize"],
            "vote_policy": {},
            },
        ],
        "default_vote_policy": {
            "weight_kind": "RoleWeight",
            "quorum": "0",
            "threshold": [1, 2],
        },
        "proposal_bond": "100000000000000000000000",
        "proposal_period": "604800000000000",
        "bounty_bond": "100000000000000000000000",
        "bounty_forgiveness_period": "604800000000000",
        },
    });

    let user_account = worker.dev_create_account().await?;
    let treasury_factory_account_details_before = treasury_factory_contract.view_account().await?;

    let user_account_details_before = user_account.view_account().await?;
    let create_treasury_instance_result = user_account
        .call(treasury_factory_contract.id(), "create_instance")
        .args_json(json!(
            {
                "sputnik_dao_factory_account_id": SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT,
                "social_db_account_id": SOCIALDB_ACCOUNT,
                "widget_reference_account_id": WIDGET_REFERENCE_ACCOUNT_ID,
                "name": instance_name,
                "create_dao_args": general_purpose::STANDARD.encode(create_dao_args.to_string())
            }
        ))
        .max_gas()
        .deposit(NearToken::from_near(9))
        .transact()
        .await?;

    let treasury_factory_account_details_after = treasury_factory_contract.view_account().await?;
    let failed_outcomes: Vec<_> = create_treasury_instance_result
        .receipt_outcomes()
        .iter()
        .filter(|outcome| outcome.is_failure())
        .collect();

    assert!(failed_outcomes.len() > 0);
    println!("{:?}", failed_outcomes);

    println!("{:?}", create_treasury_instance_result.logs());

    assert_eq!(
        "Succeeded creating and funding web4 account intellex.near, but failed creating treasury account intellex.sputnik-dao.near.",
        create_treasury_instance_result.logs().join("\n")
    );
    let user_account_details_after = user_account.view_account().await?;

    assert_eq!(
        user_account_details_before.balance.as_near() - 3,
        user_account_details_after.balance.as_near()
    );

    assert!(
        user_account_details_before.balance.as_millinear()
            - user_account_details_after.balance.as_millinear()
            < 2220
    );

    assert!(
        treasury_factory_account_details_after.balance
            > treasury_factory_account_details_before.balance
    );

    assert!(
        treasury_factory_account_details_after
            .balance
            .as_millinear()
            - treasury_factory_account_details_before
                .balance
                .as_millinear()
            < 100
    );

    let instance_account_details = worker
        .view_account(&format!("{}.near", instance_name).parse().unwrap())
        .await?;
    assert_eq!(instance_account_details.balance.as_millinear(), 2200);

    Ok(())
}
