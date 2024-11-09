use near_sdk::base64::{engine::general_purpose, Engine as _};
use near_sdk::serde::Deserialize;
use near_sdk::NearToken;
use serde_json::json;

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Web4Response {
    #[serde(rename = "contentType")]
    content_type: String,
    body: String,
}

#[tokio::test]
async fn test_web4() -> Result<(), Box<dyn std::error::Error>> {
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

#[tokio::test]
async fn test_update_widgets() -> Result<(), Box<dyn std::error::Error>> {
    const SOCIALDB_ACCOUNT: &str = "social.near";

    let mainnet = near_workspaces::mainnet().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let instance_contract = sandbox.import_contract(&"petersalomonsen.near".parse().unwrap(), &mainnet).transact().await?;
    let instance_account = instance_contract.as_account();
    let deploy_instance_contract_result = instance_account.deploy(&contract_wasm).await?;
    assert!(deploy_instance_contract_result.is_success());

    let reference_widget_contract = sandbox.import_contract(&"treasury-testing.near".parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(20)).transact().await?;

    let socialdb = sandbox
        .import_contract(&SOCIALDB_ACCOUNT.parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(10000))
        .transact()
        .await?;
    
    let init_socialdb_result = socialdb.call("new").max_gas().transact().await?;
    assert!(init_socialdb_result.is_success());
    
    let init_socialdb_result = socialdb.call("set_status").args_json(json!({"status": "Live"})).max_gas().transact().await?;
    assert!(init_socialdb_result.is_success());

    let social_set_result = reference_widget_contract.as_account().call(socialdb.id(), "set").args_json(json!({
        "data": {
            reference_widget_contract.id().as_str(): {
                "widget": {
                    "app": "Hello",
                    "config": "Goodbye"
                }
            }
        }
    })).deposit(NearToken::from_near(2)).transact().await?;
    assert!(social_set_result.is_success());

    let reference_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", reference_widget_contract.id().as_str())]
        }))
        .view()
        .await?;
    println!("reference widgets: {}", String::from_utf8(reference_widgets.result).unwrap());

    let update_widget_result = instance_account.call(instance_account.id(), "update_widgets")
        .deposit(NearToken::from_near(2))
        .max_gas()
        .transact().await?;
    println!("update widget {}", update_widget_result.logs().join("\n"));
    if !update_widget_result.is_success() {
        panic!("Failed updating widget: {:?}", String::from_utf8(update_widget_result.raw_bytes().unwrap()));
    }
    assert!(update_widget_result.is_success());

    let deployed_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", instance_account.id().as_str())]
        }))
        .view()
        .await?;
    println!("deployed widgets: {}", String::from_utf8(deployed_widgets.result).unwrap());
    //assert_eq!(reference_widgets, deployed_widgets);
    Ok(())
}
