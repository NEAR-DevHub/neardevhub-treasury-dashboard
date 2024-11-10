use cargo_near_build::{build, BuildOpts};
use lazy_static::lazy_static;
use near_sdk::base64::{engine::general_purpose, Engine as _};
use near_sdk::serde::Deserialize;
use near_sdk::{AccountId, NearToken};
use serde_json::{json, Value};
use std::fs;
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

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Web4Response {
    #[serde(rename = "contentType")]
    content_type: String,
    body: String,
}

fn build_wasm() {}

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
    const SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT: &str = "sputnik-dao.near";
    const SOCIALDB_ACCOUNT: &str = "social.near";

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
        .import_contract(&"treasury-testing.near".parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(20))
        .transact()
        .await?;

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

    let reference_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", reference_widget_contract.id().as_str())]
        }))
        .view()
        .await?;
    let reference_widgets_json_string = String::from_utf8(reference_widgets.result).unwrap();

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

    let instance_name = "test-treasury-instance";
    let instance_account_id = format!("{}.{}", instance_name, treasury_factory_contract.id());

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
                "config:Finalize",
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
                "policy:*",
                "add_member_to_role:*",
                "remove_member_from_role:*",
            ],
            "vote_policy": {},
            },
            {
            "kind": {
                "Group": ["acc1.near", "acc2.near"],
            },
            "name": "Vote",
            "permissions": ["*:VoteReject", "*:VoteApprove", "*:VoteRemove"],
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

    let create_treasury_instance_result = treasury_factory_contract
        .call("create_instance")
        .args_json(json!(
            {
                "name": instance_name,
                "create_dao_args": general_purpose::STANDARD.encode(create_dao_args.to_string())
            }
        ))
        .max_gas()
        .deposit(NearToken::from_near(10))
        .transact()
        .await?;

    if create_treasury_instance_result.is_failure() {
        panic!(
            "Error creating treasury instance {:?}",
            String::from_utf8(create_treasury_instance_result.raw_bytes().unwrap())
        );
    }

    assert!(create_treasury_instance_result.is_success());

    println!(
        "Total tgas burnt {:?}",
        create_treasury_instance_result.total_gas_burnt.as_tgas()
    );

    let result = treasury_factory_contract
        .as_account()
        .view(&instance_account_id.parse().unwrap(), "web4_get")
        .args_json(json!({"request": {"path": "/"}}))
        .await?;

    let response = result.json::<Web4Response>().unwrap();
    assert_eq!("text/html; charset=UTF-8", response.content_type);

    let body_string =
        String::from_utf8(general_purpose::STANDARD.decode(response.body).unwrap()).unwrap();
    assert!(body_string.contains("near-social-viewer"));

    let get_config_result = worker
        .view(
            &format!("{}.sputnik-dao.near", instance_name)
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
    assert_eq!(create_dao_args["policy"], policy);

    let deployed_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", instance_account_id)]
        }))
        .view()
        .await?;
    let deployed_widgets_json_string = String::from_utf8(deployed_widgets.result).unwrap();

    assert_eq!(
        reference_widgets_json_string.replace(
            reference_widget_contract.id().as_str(),
            instance_account_id.as_str()
        ),
        deployed_widgets_json_string
    );
    Ok(())
}
