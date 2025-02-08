// Find all our documentation at https://docs.near.org
mod web4;
use near_sdk::base64::engine::general_purpose;
use near_sdk::{base64::prelude::*, env};
use near_sdk::{near, serde_json, Gas, NearToken, Promise, PromiseResult};
use web4::types::{Web4Request, Web4Response};

// Define the contract structure
#[near(contract_state)]
#[derive(Default)]
pub struct Contract {}

// Implement the contract structure
#[near]
impl Contract {
    #[payable]
    pub fn update_widgets(
        &mut self,
        widget_reference_account_id: String,
        social_db_account_id: String,
    ) -> Promise {
        let args =
            "{\"keys\": [\"".to_string() + widget_reference_account_id.as_str() + "/widget/**\"]}";
        Promise::new(social_db_account_id.parse().unwrap())
            .function_call(
                "get".to_string(),
                args.into_bytes(),
                NearToken::from_near(0),
                Gas::from_tgas(10),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_attached_deposit(env::attached_deposit())
                    .update_widgets_callback(widget_reference_account_id, social_db_account_id),
            )
    }

    #[payable]
    pub fn update_widgets_callback(
        &mut self,
        widget_reference_account_id: String,
        social_db_account_id: String,
    ) -> Promise {
        if env::predecessor_account_id() != env::current_account_id() {
            env::panic_str("Should not be called directly");
        }
        match env::promise_result(0) {
            PromiseResult::Successful(result) => {
                let reference_widget = String::from_utf8(result).unwrap();
                let new_widget = reference_widget.replace(
                    &widget_reference_account_id,
                    env::current_account_id().as_str(),
                );
                let args = "{\"data\": ".to_string() + new_widget.as_str() + "}";

                Promise::new(social_db_account_id.parse().unwrap()).function_call(
                    "set".to_string(),
                    args.into_bytes(),
                    env::attached_deposit(),
                    Gas::from_tgas(10),
                )
            }
            _ => env::panic_str("Failed to get reference widget data"),
        }
    }

    pub fn web4_get(&self, request: Web4Request) -> Web4Response {
        let current_account_id = env::current_account_id().to_string();
        let metadata_preload_url = format!(
            "/web4/contract/social.near/get?keys.json=%5B%22{}/widget/app/metadata/**%22%5D",
            &current_account_id
        );

        let mut app_name = String::from("NEAR Treasury Dashboard");
        let mut description = String::from("Treasury management for NEAR DAOs");
        let mut image_ipfs_cid =
            String::from("bafkreiboarigt5w26y5jyxyl4au7r2dl76o5lrm2jqjgqpooakck5xsojq");

        let Some(preloads) = request.preloads else {
            return Web4Response::PreloadUrls {
                preload_urls: [metadata_preload_url.clone()].to_vec(),
            };
        };

        if let Some(Web4Response::Body {
            content_type: _,
            body,
        }) = preloads.get(&metadata_preload_url)
        {
            let body_bytes = BASE64_STANDARD.decode(body).unwrap();
            if let Ok(body_value) = serde_json::from_slice::<serde_json::Value>(&body_bytes) {
                if let Some(app_name_str) =
                    body_value[&current_account_id]["widget"]["app"]["metadata"]["name"].as_str()
                {
                    app_name = app_name_str.to_string();
                }

                if let Some(description_str) = body_value[&current_account_id]["widget"]["app"]
                    ["metadata"]["description"]
                    .as_str()
                {
                    description = description_str.to_string();
                }

                if let Some(image_ipfs_cid_str) = body_value[&current_account_id]["widget"]["app"]
                    ["metadata"]["image"]["ipfs_cid"]
                    .as_str()
                {
                    image_ipfs_cid = image_ipfs_cid_str.to_string();
                }
            }
        }

        let index_html = include_str!("web4/index.html").to_string();
        let index_html = index_html
            .replace(
                "SOCIAL_METADATA_URL",
                format!("https://{}.page", current_account_id).as_str(),
            )
            .replace(
                "SOCIAL_METADATA_TITLE",
                &html_escape::encode_double_quoted_attribute(&app_name),
            )
            .replace(
                "SOCIAL_METADATA_DESCRIPTION",
                &html_escape::encode_double_quoted_attribute(&description),
            )
            .replace("SOCIAL_IMAGE_IPFS_CID", &image_ipfs_cid);
        Web4Response::Body {
            content_type: "text/html; charset=UTF-8".to_owned(),
            body: general_purpose::STANDARD.encode(&index_html),
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::web4::types::Web4Response;
    use near_sdk::{test_utils::VMContextBuilder, testing_env, VMContext};

    fn view_test_env() -> VMContext {
        let contract: String = "not-only-devhub.near".to_string();
        let context = VMContextBuilder::new()
            .current_account_id(contract.try_into().unwrap())
            .build();

        testing_env!(context.clone());
        return context;
    }

    const PRELOAD_URL: &str = "/web4/contract/social.near/get?keys.json=%5B%22not-only-devhub.near/widget/app/metadata/**%22%5D";

    fn create_preload_result(title: String, description: String) -> serde_json::Value {
        let body_string = serde_json::json!({"not-only-devhub.near":{"widget":{"app":{"metadata":{
            "description":description,
            "image":{"ipfs_cid":"bafkreido4srg4aj7l7yg2tz22nbu3ytdidjczdvottfr5ek6gqorwg6v74"},
            "name":title,
            "tags": {"devhub":"","communities":"","developer-governance":"","app":""}}}}}})
        .to_string();

        let body_base64 = BASE64_STANDARD.encode(body_string);
        return serde_json::json!({
                String::from(PRELOAD_URL): {
                    "contentType": "application/json",
                    "body": body_base64
                }
        });
    }

    #[test]
    fn test_web4_get_without_metadata_preload_result() {
        view_test_env();
        let contract = Contract::default();

        let response = contract.web4_get(
            serde_json::from_value(serde_json::json!({
                "path": "/",
                "preloads": serde_json::Value::Null,
            }))
            .unwrap(),
        );

        match response {
            Web4Response::PreloadUrls { preload_urls } => {
                assert_eq!(preload_urls, vec![PRELOAD_URL.to_string()]);
            }
            _ => {
                panic!("Should return Web4Response::PreloadUrls");
            }
        }
    }

    #[test]
    fn test_web4_get_with_metadata_preload_result() {
        view_test_env();
        let contract = Contract::default();

        let response = contract.web4_get(
            serde_json::from_value(serde_json::json!({
                "path": "/",
                "preloads": create_preload_result(String::from("NotOnlyDevHub"),String::from("A description of any devhub portal instance, not just devhub itself")),
            }))
            .unwrap(),
        );
        match response {
            Web4Response::Body { content_type, body } => {
                assert_eq!("text/html; charset=UTF-8", content_type);

                let body_string = String::from_utf8(BASE64_STANDARD.decode(body).unwrap()).unwrap();

                assert!(body_string.contains(
                    "<meta property=\"og:url\" content=\"https://not-only-devhub.near.page\" />"
                ));
                assert!(body_string.contains(
                    "<meta property=\"og:description\" content=\"A description of any devhub portal instance, not just devhub itself\" />"
                ));
                assert!(body_string.contains(
                    "<meta name=\"twitter:description\" content=\"A description of any devhub portal instance, not just devhub itself\" />"
                ));
                assert!(body_string
                    .contains("<meta property=\"og:title\" content=\"NotOnlyDevHub\" />"));
                assert!(body_string
                    .contains("<meta name=\"twitter:title\" content=\"NotOnlyDevHub\" />"));
                assert!(body_string
                    .contains("<meta property=\"og:image\" content=\"https://ipfs.near.social/ipfs/bafkreido4srg4aj7l7yg2tz22nbu3ytdidjczdvottfr5ek6gqorwg6v74\" />"));
                assert!(body_string
                    .contains("<meta name=\"twitter:image\" content=\"https://ipfs.near.social/ipfs/bafkreido4srg4aj7l7yg2tz22nbu3ytdidjczdvottfr5ek6gqorwg6v74\" />"));
            }
            _ => {
                panic!("Should return Web4Response::Body");
            }
        }
    }
}
