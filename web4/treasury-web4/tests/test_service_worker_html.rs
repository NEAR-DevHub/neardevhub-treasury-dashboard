use std::str::FromStr;

use near_sdk::base64::prelude::BASE64_STANDARD;
use near_sdk::base64::{engine::general_purpose, Engine as _};
use near_sdk::NearToken;
use serde_json::{json, Value};
mod web4_utils;
use web4_utils::{create_preload_result, Web4Response};

#[tokio::test]
async fn test_service_worker_html_contains_registration() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let result = contract
        .view("web4_get")
        .args_json(json!({"request": {"path": "/", "preloads": create_preload_result(contract.as_account().id().to_string(), String::from("test title"), String::from("test description"))}}))
        .await?;
    let response = result.json::<Web4Response>().unwrap();

    let body_string =
        String::from_utf8(general_purpose::STANDARD.decode(response.body).unwrap()).unwrap();
    
    println!("HTML BODY LENGTH: {}", body_string.len());
    
    // Check if service worker registration is in the HTML
    let has_service_worker = body_string.contains("serviceWorker' in navigator");
    let has_registration = body_string.contains("navigator.serviceWorker.register('/service-worker.js')");
    
    println!("Contains serviceWorker check: {}", has_service_worker);
    println!("Contains registration: {}", has_registration);
    
    if !has_service_worker {
        // Print the last 1000 characters to see what's at the end
        let len = body_string.len();
        let start = if len > 1000 { len - 1000 } else { 0 };
        println!("Last 1000 characters of HTML:");
        println!("{}", &body_string[start..]);
    }

    assert!(has_service_worker, "HTML should contain service worker registration");
    assert!(has_registration, "HTML should contain service worker registration call");

    Ok(())
}
