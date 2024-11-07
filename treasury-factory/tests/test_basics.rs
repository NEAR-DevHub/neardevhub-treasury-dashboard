use near_sdk::base64::{engine::general_purpose, Engine as _};
use near_sdk::serde::Deserialize;
use serde_json::json;

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


