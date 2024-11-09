use near_sdk::base64::{self, engine};
use near_sdk::base64::{engine::general_purpose, Engine as _};
use near_sdk::serde::Deserialize;

use near_sdk::{AccountId, NearToken};
use serde_json::{json, Value};

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Web4Response {
    #[serde(rename = "contentType")]
    content_type: String,
    body: String,
}

#[tokio::test]
async fn test_contract_is_operational() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

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

async fn test_basics_on(contract_wasm: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract = sandbox.dev_deploy(contract_wasm).await?;

    let user_account = sandbox.dev_create_account().await?;

    let outcome = user_account
        .call(contract.id(), "set_greeting")
        .args_json(json!({"greeting": "Hello World!"}))
        .transact()
        .await?;
    assert!(outcome.is_success());

    let user_message_outcome = contract.view("get_greeting").args_json(json!({})).await?;
    assert_eq!(user_message_outcome.json::<String>()?, "Hello World!");

    Ok(())
}

#[tokio::test]
async fn test_factory() -> Result<(), Box<dyn std::error::Error>> {
    const SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT: &str = "sputnik-dao.near";
    let mainnet = near_workspaces::mainnet().await?;
    let sputnikdao_factory_contract_id: AccountId = SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT.parse()?;

    let worker = near_workspaces::sandbox().await?;
    let sputnik_dao_factory = worker
        .import_contract(&sputnikdao_factory_contract_id, &mainnet)
        .initial_balance(NearToken::from_near(1000))
        .transact()
        .await?;
    let treasury_factory_contract_wasm = near_workspaces::compile_project("./").await?;

    let treasury_factory_contract = worker.dev_deploy(&treasury_factory_contract_wasm).await?;


    let init_sputnik_dao_factory_result =
        sputnik_dao_factory.call("new").max_gas().transact().await?;
    if init_sputnik_dao_factory_result.is_failure() {
        panic!(
            "{:?}",
            String::from_utf8(init_sputnik_dao_factory_result.raw_bytes().unwrap())
        );
    }
    assert!(init_sputnik_dao_factory_result.is_success());

    let instance_name = "the-test-instance";

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

    let create_dao_result = treasury_factory_contract
        .call("create_instance")
        .args_json(json!(
            {
                "name": instance_name,
                "create_dao_args": general_purpose::STANDARD.encode(create_dao_args.to_string())
            }
        ))
        .max_gas()
        .deposit(NearToken::from_near(6))
        .transact()
        .await?;

    if create_dao_result.is_failure() {
        panic!(
            "{:?}",
            String::from_utf8(create_dao_result.raw_bytes().unwrap())
        );
    }

    assert!(create_dao_result.is_success());

    let get_config_result = worker
        .view(
            &format!("{}.sputnik-dao.near", instance_name)
                .parse()
                .unwrap(),
            "get_config",
        )
        .await?;

    let config: Value = get_config_result.json().unwrap();
    assert_eq!(create_dao_args["config"], config );

    let get_policy_result = worker
        .view(
            &format!("{}.sputnik-dao.near", instance_name)
                .parse()
                .unwrap(),
            "get_policy",
        )
        .await?;

    let policy: Value = get_policy_result.json().unwrap();
    assert_eq!(create_dao_args["policy"], policy );

    Ok(())
}
