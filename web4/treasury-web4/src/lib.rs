// Find all our documentation at https://docs.near.org
mod web4;
use near_sdk::base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use near_sdk::{env, near, serde_json, Gas, NearToken, Promise, PromiseResult};
use web4::types::{Web4Request, Web4Response};

const TREASURY_FACTORY_ACCOUNT_ID: &near_sdk::AccountIdRef =
    near_sdk::AccountIdRef::new_or_panic("treasury-factory.near");
const NEAR_SOCIAL_ACCOUNT_ID: &near_sdk::AccountIdRef =
    near_sdk::AccountIdRef::new_or_panic("social.near");

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
        widget_reference_account_id: near_sdk::AccountId,
        social_db_account_id: near_sdk::AccountId,
        set_social_metadata_defaults: Option<bool>,
    ) -> Promise {
        let current_account_id = env::current_account_id();
        if !(env::predecessor_account_id() == TREASURY_FACTORY_ACCOUNT_ID
            || env::predecessor_account_id() == current_account_id)
        {
            env::panic_str(&format!(
                "Should only be called by {} or {}. Was called by {}",
                TREASURY_FACTORY_ACCOUNT_ID, current_account_id, env::predecessor_account_id()
            ));
        }
        let mut promise = Promise::new(social_db_account_id.clone())
            .function_call(
                "get".to_string(),
                serde_json::json!({
                    "keys": [format!("{}/widget/**", widget_reference_account_id)]
                })
                .to_string()
                .into_bytes(),
                NearToken::from_near(0),
                Gas::from_tgas(10),
            )
            .then(
                Self::ext(current_account_id)
                    .update_widgets_callback(
                        widget_reference_account_id,
                        social_db_account_id.clone(),
                        env::attached_deposit()
                    ),
            );

        if set_social_metadata_defaults.unwrap_or(false) {
            promise = promise.then(self.internal_set_social_metadata(
                Some(social_db_account_id),
                None,
                None,
                None,
            ));
        }
        promise
    }

    #[private]
    pub fn update_widgets_callback(
        &mut self,
        widget_reference_account_id: near_sdk::AccountId,
        social_db_account_id: near_sdk::AccountId,
        deposit_amount: NearToken
    ) -> Promise {
        match env::promise_result(0) {
            PromiseResult::Successful(result) => {
                let reference_widget = String::from_utf8(result).unwrap();
                let new_widget = reference_widget.replace(
                    widget_reference_account_id.as_str(),
                    env::current_account_id().as_str(),
                );
                let args = "{\"data\": ".to_string() + new_widget.as_str() + "}";

                Promise::new(social_db_account_id).function_call(
                    "set".to_string(),
                    args.into_bytes(),
                    deposit_amount,
                    Gas::from_tgas(10),
                )
            }
            _ => env::panic_str("Failed to get reference widget data"),
        }
    }

    #[private]
    pub fn set_social_metadata(
        &mut self,
        social_db_account_id: Option<near_sdk::AccountId>,
        name: Option<String>,
        description: Option<String>,
        ipfs_cid: Option<String>,
    ) -> Promise {
        self.internal_set_social_metadata(social_db_account_id, name, description, ipfs_cid)
    }

    fn internal_set_social_metadata(
        &mut self,
        social_db_account_id: Option<near_sdk::AccountId>,
        name: Option<String>,
        description: Option<String>,
        ipfs_cid: Option<String>,
    ) -> Promise {
        let current_account_id = env::current_account_id();
        let social_db_account_id = social_db_account_id
            .as_deref()
            .unwrap_or(NEAR_SOCIAL_ACCOUNT_ID);
        let name = name.as_deref().unwrap_or("NEAR Treasury");
        let description =
            description.unwrap_or_else(|| format!("NEAR Treasury / {}", current_account_id));
        let ipfs_cid = ipfs_cid
            .as_deref()
            .unwrap_or("bafkreiefdkigadpkpccreqfnhut2li2nmf3alhz7c3wadveconelisnksu");

        let args = serde_json::json!({
            "data": {
                current_account_id: {
                    "widget": {
                        "app": {
                            "metadata": {
                                "name": name,
                                "description": description,
                                "image": {
                                    "ipfs_cid": ipfs_cid
                                },
                                "tags": {
                                    "app": "",
                                    "neartreasury": ""
                                }
                            }
                        }
                    }
                }
            }
        });

        Promise::new(social_db_account_id.to_owned()).function_call(
            "set".to_string(),
            args.to_string().into_bytes(),
            NearToken::from_near(0),
            Gas::from_tgas(10),
        )
    }

    pub fn web4_get(&self, request: Web4Request) -> Web4Response {
        let current_account_id = env::current_account_id();
        let metadata_preload_url = format!(
            "/web4/contract/social.near/get?keys.json=%5B%22{}/widget/app/metadata/**%22%5D",
            current_account_id
        );

        let Some(preloads) = request.preloads else {
            return Web4Response::PreloadUrls {
                preload_urls: vec![metadata_preload_url],
            };
        };

        let mut app_name = String::from("NEAR Treasury");
        let mut description = format!("NEAR Treasury / {}", current_account_id);
        let mut image_ipfs_cid =
            String::from("bafkreiefdkigadpkpccreqfnhut2li2nmf3alhz7c3wadveconelisnksu");

        if let Some(Web4Response::Body {
            content_type: _,
            body,
        }) = preloads.get(&metadata_preload_url)
        {
            let body_bytes = BASE64_STANDARD.decode(body).unwrap();
            if let Ok(body_value) = serde_json::from_slice::<serde_json::Value>(&body_bytes) {
                if let Some(metadata) = body_value
                    .get(current_account_id.as_str())
                    .and_then(|v| v.get("widget"))
                    .and_then(|v| v.get("app"))
                    .and_then(|v| v.get("metadata"))
                {
                    if let Some(app_name_str) = metadata.get("name").and_then(|v| v.as_str()) {
                        app_name = app_name_str.to_string();
                    }

                    if let Some(description_str) =
                        metadata.get("description").and_then(|v| v.as_str())
                    {
                        description = description_str.to_string();
                    }

                    if let Some(image_ipfs_cid_str) = metadata
                        .get("image")
                        .and_then(|v| v.get("ipfs_cid"))
                        .and_then(|v| v.as_str())
                    {
                        image_ipfs_cid = image_ipfs_cid_str.to_string();
                    }
                }
            }
        }

        let index_html = include_str!("web4/index.html");
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
            body: BASE64_STANDARD.encode(&index_html),
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::web4::types::Web4Response;
    use near_sdk::{test_utils::VMContextBuilder, testing_env, VMContext};

    fn view_test_env() -> VMContext {
        let contract = "not-only-devhub.near".parse().unwrap();
        let context = VMContextBuilder::new().current_account_id(contract).build();

        testing_env!(context.clone());
        return context;
    }

    const PRELOAD_URL: &str = "/web4/contract/social.near/get?keys.json=%5B%22not-only-devhub.near/widget/app/metadata/**%22%5D";

    fn create_preload_result(title: String, description: String) -> serde_json::Value {
        let body = serde_json::json!({
            "not-only-devhub.near": {
                "widget": {
                    "app": {
                        "metadata": {
                            "description": description,
                            "image": {"ipfs_cid": "bafkreido4srg4aj7l7yg2tz22nbu3ytdidjczdvottfr5ek6gqorwg6v74"},
                            "name": title,
                            "tags": {
                                "devhub": "",
                                "communities": "",
                                "developer-governance": "",
                                "app": ""
                            }
                        }
                    }
                }
            }
        });

        serde_json::json!({
            PRELOAD_URL: {
                "contentType": "application/json",
                "body": BASE64_STANDARD.encode(body.to_string())
            }
        })
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
                assert_eq!(preload_urls, vec![PRELOAD_URL]);
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
                "preloads": create_preload_result(
                    String::from("NotOnlyDevHub"),
                    String::from("A description of any devhub portal instance, not just devhub itself")
                ),
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
