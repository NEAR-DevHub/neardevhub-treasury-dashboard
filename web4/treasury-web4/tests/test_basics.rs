use std::str::FromStr;

use near_sdk::base64::prelude::BASE64_STANDARD;
use near_sdk::base64::{engine::general_purpose, Engine as _};
use near_sdk::NearToken;
use serde_json::{json, Value};
mod web4_utils;
use web4_utils::{create_preload_result, Web4Response};

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
    assert_eq!(metadata["name"], "NEAR Treasury");
    assert_eq!(
        metadata["description"],
        format!("NEAR Treasury / {}", contract.id().as_str())
    );
    assert_eq!(
        metadata["image"]["ipfs_cid"],
        "bafkreiefdkigadpkpccreqfnhut2li2nmf3alhz7c3wadveconelisnksu"
    );

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
        .import_contract(&"webassemblymusic-treasury.near".parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(5))
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

    instance_account
        .call(instance_account.id(), "update_widgets")
        .args_json(json!({
            "widget_reference_account_id": WIDGET_REFERENCE_ACCOUNT_ID,
            "social_db_account_id": SOCIALDB_ACCOUNT
        }))
        .deposit(NearToken::from_near(2))
        .max_gas()
        .transact()
        .await?
        .into_result()
        .unwrap();

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

#[tokio::test]
async fn test_update_widgets_and_set_social_metadata_defaults(
) -> Result<(), Box<dyn std::error::Error>> {
    const SOCIALDB_ACCOUNT: &str = "social.near";
    const WIDGET_REFERENCE_ACCOUNT_ID: &str = "treasury-testing.near";

    let mainnet = near_workspaces::mainnet().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let instance_contract = sandbox
        .import_contract(&"webassemblymusic-treasury.near".parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(5))
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

    instance_account
        .call(instance_account.id(), "update_widgets")
        .args_json(json!({
            "widget_reference_account_id": WIDGET_REFERENCE_ACCOUNT_ID,
            "social_db_account_id": SOCIALDB_ACCOUNT,
            "set_social_metadata_defaults": true
        }))
        .deposit(NearToken::from_near(2))
        .max_gas()
        .transact()
        .await?
        .into_result()
        .unwrap();

    let deployed_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", instance_account.id())]
        }))
        .view()
        .await?;
    let deployed_widgets_json =
        Value::from_str(String::from_utf8(deployed_widgets.result).unwrap().as_str()).unwrap();

    assert_eq!(
        deployed_widgets_json[instance_account.id().as_str()]["widget"]["app"][""],
        reference_widget_data[reference_widget_contract.id().as_str()]["widget"]["app"]
    );
    assert_eq!(
        deployed_widgets_json[instance_account.id().as_str()]["widget"]["config"],
        reference_widget_data[reference_widget_contract.id().as_str()]["widget"]["config"]
    );

    let social_metadata = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/app/metadata/**", instance_contract.id().as_str())]
        }))
        .view()
        .await?;
    let social_metadata_json: Value = Value::from_str(
        String::from_utf8(social_metadata.result.clone())
            .unwrap()
            .as_str(),
    )
    .unwrap();
    let metadata =
        &social_metadata_json[instance_contract.id().as_str()]["widget"]["app"]["metadata"];
    assert_eq!(metadata["name"], "NEAR Treasury");
    assert_eq!(
        metadata["description"],
        format!("NEAR Treasury / {}", instance_contract.id())
    );
    assert_eq!(
        metadata["image"]["ipfs_cid"],
        "bafkreiefdkigadpkpccreqfnhut2li2nmf3alhz7c3wadveconelisnksu"
    );

    let preload_url = format!(
        "/web4/contract/social.near/get?keys.json=%5B%22{}/widget/app/metadata/**%22%5D",
        instance_contract.id()
    );

    let body_base64 = BASE64_STANDARD.encode(social_metadata.result);

    let result = instance_contract
        .view("web4_get")
        .args_json(json!({"request": {"path": "/", "preloads": {
                preload_url: {
                    "contentType": "application/json",
                    "body": body_base64
                }
        }}}))
        .await?;
    let response = result.json::<Web4Response>().unwrap();
    assert_eq!("text/html; charset=UTF-8", response.content_type);

    let body_string =
        String::from_utf8(general_purpose::STANDARD.decode(response.body).unwrap()).unwrap();
    assert!(body_string.contains("near-social-viewer"));

    assert!(body_string.contains(
        format!(
            "<meta property=\"og:url\" content=\"https://{}.page\" />",
            instance_contract.id()
        )
        .as_str()
    ));
    assert!(body_string.contains(
        format!(
            "<meta property=\"og:description\" content=\"NEAR Treasury / {}\" />",
            instance_contract.id()
        )
        .as_str()
    ));
    assert!(body_string.contains(
        format!(
            "<meta name=\"twitter:description\" content=\"NEAR Treasury / {}\" />",
            instance_contract.id()
        )
        .as_str()
    ));
    assert!(body_string.contains("<meta property=\"og:title\" content=\"NEAR Treasury\" />"));
    assert!(body_string.contains("<meta name=\"twitter:title\" content=\"NEAR Treasury\" />"));
    assert!(body_string
        .contains("<meta property=\"og:image\" content=\"https://ipfs.near.social/ipfs/bafkreiefdkigadpkpccreqfnhut2li2nmf3alhz7c3wadveconelisnksu\" />"));
    assert!(body_string
        .contains("<meta name=\"twitter:image\" content=\"https://ipfs.near.social/ipfs/bafkreiefdkigadpkpccreqfnhut2li2nmf3alhz7c3wadveconelisnksu\" />"));

    Ok(())
}

#[tokio::test]
async fn test_update_app_widget() -> Result<(), Box<dyn std::error::Error>> {
    const SOCIALDB_ACCOUNT: &str = "social.near";
    const WIDGET_REFERENCE_ACCOUNT_ID: &str = "bootstrap.treasury-factory.near";

    let mainnet = near_workspaces::mainnet().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let instance_contract = sandbox
        .import_contract(&"webassemblymusic-treasury.near".parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(5))
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

    instance_account
        .call(instance_account.id(), "update_widgets")
        .args_json(json!({
            "widget_reference_account_id": WIDGET_REFERENCE_ACCOUNT_ID,
            "social_db_account_id": SOCIALDB_ACCOUNT,
            "set_social_metadata_defaults": true
        }))
        .deposit(NearToken::from_near(2))
        .max_gas()
        .transact()
        .await?
        .into_result()
        .unwrap();

    let deployed_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", instance_account.id())]
        }))
        .view()
        .await?;
    let deployed_widgets_json =
        Value::from_str(String::from_utf8(deployed_widgets.result).unwrap().as_str()).unwrap();

    assert_eq!(
        deployed_widgets_json[instance_account.id().as_str()]["widget"]["app"][""],
        reference_widget_data[reference_widget_contract.id().as_str()]["widget"]["app"]
    );
    assert_eq!(
        deployed_widgets_json[instance_account.id().as_str()]["widget"]["config"],
        reference_widget_data[reference_widget_contract.id().as_str()]["widget"]["config"]
    );

    let changed_reference_widget_data = json!({
        reference_widget_contract.id().as_str(): {
            "widget": {
                "app": "Hello changed",
                "config": "Goodbye changed"
            }
        }
    });

    let social_set_result = reference_widget_contract
        .as_account()
        .call(socialdb.id(), "set")
        .args_json(json!({
            "data": changed_reference_widget_data
        }))
        .deposit(NearToken::from_near(2))
        .transact()
        .await?;
    assert!(social_set_result.is_success());

    let update_app_widget_result = instance_account
        .call(instance_account.id(), "update_app_widget")
        .max_gas()
        .transact()
        .await?
        .into_result()
        .unwrap();

    assert!(
        update_app_widget_result.failures().len() == 0,
        "Failures: {:?}",
        update_app_widget_result.failures()
    );

    let deployed_widgets = socialdb
        .call("get")
        .args_json(json!({
            "keys": [format!("{}/widget/**", instance_account.id())]
        }))
        .view()
        .await?;
    let deployed_widgets_json =
        Value::from_str(String::from_utf8(deployed_widgets.result).unwrap().as_str()).unwrap();

    assert_eq!(
        deployed_widgets_json[instance_account.id().as_str()]["widget"]["app"][""],
        changed_reference_widget_data[reference_widget_contract.id().as_str()]["widget"]["app"]
    );
    assert_eq!(
        deployed_widgets_json[instance_account.id().as_str()]["widget"]["config"],
        reference_widget_data[reference_widget_contract.id().as_str()]["widget"]["config"]
    );

    Ok(())
}

#[tokio::test]
async fn test_service_worker() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let result = contract
        .view("web4_get")
        .args_json(json!({"request": {"path": "/service-worker.js"}}))
        .await?;
    let response = result.json::<Web4Response>().unwrap();
    assert_eq!("application/javascript", response.content_type);

    let body_string =
        String::from_utf8(general_purpose::STANDARD.decode(response.body).unwrap()).unwrap();

    // Verify it contains our service worker code
    assert!(body_string.contains("Minimal Service Worker for Treasury Dashboard"));
    assert!(body_string.contains("addEventListener('install'"));
    assert!(body_string.contains("addEventListener('fetch'"));

    Ok(())
}
