use near_sdk::{
    base64::{engine::general_purpose, prelude::BASE64_STANDARD, Engine},
    serde::Deserialize,
};
use near_workspaces::Contract;
use serde_json::json;

#[derive(Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Web4Response {
    #[serde(rename = "contentType")]
    pub content_type: String,
    pub body: String,
}

pub fn create_preload_result(
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
    serde_json::json!({
            preload_url: {
                "contentType": "application/json",
                "body": body_base64
            }
    })
}

pub async fn call_web4_get_with_preload_result(
    contract: Contract,
) -> Result<String, Box<dyn std::error::Error>> {
    let result = contract
        .view("web4_get")
        .args_json(json!({"request": {"path": "/", "preloads": create_preload_result(contract.as_account().id().to_string(), String::from("test title"), String::from("test & description. \"Cool stuff\" <script>should not work</script>"))}}))
        .await?;
    let response = result.json::<Web4Response>().unwrap();
    assert_eq!("text/html; charset=UTF-8", response.content_type);

    let body_string =
        String::from_utf8(general_purpose::STANDARD.decode(response.body).unwrap()).unwrap();
    Ok(body_string)
}
