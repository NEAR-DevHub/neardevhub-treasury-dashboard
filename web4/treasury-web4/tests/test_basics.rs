use std::str::FromStr;

use near_sdk::base64::prelude::BASE64_STANDARD;
use near_sdk::base64::{engine::general_purpose, Engine as _};
use near_sdk::serde::Deserialize;
use near_sdk::NearToken;
use serde_json::{json, Value};

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Web4Response {
    #[serde(rename = "contentType")]
    content_type: String,
    body: String,
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

#[tokio::test]
async fn test_web4() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let result = contract
        .view("web4_get")
        .args_json(json!({"request": {"path": "/", "preloads": create_preload_result(contract.as_account().id().to_string(), String::from("test title"), String::from("test & description. \"Cool stuff\" <script>should not work</script>"))}}))
        .await?;
    let response = result.json::<Web4Response>().unwrap();
    assert_eq!("text/html; charset=UTF-8", response.content_type);

    let body_string =
        String::from_utf8(general_purpose::STANDARD.decode(response.body).unwrap()).unwrap();
    assert!(body_string.contains("near-social-viewer"));

    assert!(body_string.contains("\"test title\""));
    assert!(body_string.contains("test &amp; description. &quot;Cool stuff&quot; &lt;script&gt;should not work&lt;/script&gt;"));

    Ok(())
}

#[tokio::test]
async fn test_social_metadata() -> Result<(), Box<dyn std::error::Error>> {
    const SOCIALDB_ACCOUNT: &str = "social.near";

    let mainnet = near_workspaces::mainnet().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let contract = sandbox.dev_deploy(&contract_wasm).await?;
    let socialdb = sandbox
        .import_contract(&SOCIALDB_ACCOUNT.parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(10000))
        .transact()
        .await?;

    let _ = socialdb.call("new").max_gas().transact().await?;
    let _ = socialdb
        .call("set_status")
        .args_json(json!({"status": "Live"}))
        .max_gas()
        .transact()
        .await?;

    let _ = contract
        .as_account()
        .call(socialdb.id(), "set")
        .args_json(json!({
            "data": {
                contract.id().as_str(): {
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

    let set_social_metadata_result = contract
        .call("set_social_metadata")
        .args_json(json!({}))
        .max_gas()
        .transact()
        .await?;

    println!("{:?}", set_social_metadata_result.logs());
    println!("{:?}", set_social_metadata_result.failures());
    assert!(set_social_metadata_result.is_success());
    let social_metadata = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/app/metadata/**", contract.id().as_str())]
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
    let metadata = &social_metadata_json[contract.id().as_str()]["widget"]["app"]["metadata"];
    assert_eq!(metadata["name"], "NEAR treasury");
    Ok(())
}

#[tokio::test]
async fn test_update_widgets() -> Result<(), Box<dyn std::error::Error>> {
    const SOCIALDB_ACCOUNT: &str = "social.near";
    const WIDGET_REFERENCE_ACCOUNT_ID: &str = "treasury-testing.near";

    let mainnet = near_workspaces::mainnet().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let instance_contract = sandbox
        .import_contract(&"petersalomonsen.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;
    let instance_account = instance_contract.as_account();
    let deploy_instance_contract_result = instance_account.deploy(&contract_wasm).await?;
    assert!(deploy_instance_contract_result.is_success());

    let reference_widget_contract = sandbox
        .import_contract(&WIDGET_REFERENCE_ACCOUNT_ID.parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(20))
        .transact()
        .await?;

    let socialdb = sandbox
        .import_contract(&SOCIALDB_ACCOUNT.parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(10000))
        .transact()
        .await?;

    let init_socialdb_result = socialdb.call("new").max_gas().transact().await?;
    assert!(init_socialdb_result.is_success());

    let init_socialdb_result = socialdb
        .call("set_status")
        .args_json(json!({"status": "Live"}))
        .max_gas()
        .transact()
        .await?;
    assert!(init_socialdb_result.is_success());

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

    let update_widget_result = instance_account
        .call(instance_account.id(), "update_widgets")
        .args_json(json!({
            "widget_reference_account_id": WIDGET_REFERENCE_ACCOUNT_ID,
            "social_db_account_id": SOCIALDB_ACCOUNT
        }))
        .deposit(NearToken::from_near(2))
        .max_gas()
        .transact()
        .await?;
    println!("update widget {}", update_widget_result.logs().join("\n"));
    if !update_widget_result.is_success() {
        panic!(
            "Failed updating widget: {:?}",
            String::from_utf8(update_widget_result.raw_bytes().unwrap())
        );
    }
    assert!(update_widget_result.is_success());

    let deployed_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", instance_account.id().as_str())]
        }))
        .view()
        .await?;
    let deployed_widgets_json_string = String::from_utf8(deployed_widgets.result).unwrap();

    assert_eq!(
        reference_widgets_json_string.replace(
            reference_widget_contract.id().as_str(),
            instance_account.id().as_str()
        ),
        deployed_widgets_json_string
    );
    Ok(())
}
