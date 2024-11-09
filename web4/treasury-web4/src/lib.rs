// Find all our documentation at https://docs.near.org
mod web4;
use near_sdk::serde_json::{json, Value};
use near_sdk::{env, near, Promise, PromiseResult};
use web4::types::{Web4Request, Web4Response};

// Define the contract structure
#[near(contract_state)]
#[derive(Default)]
pub struct Contract {}
pub mod external;
pub use crate::external::*;

const SOCIALDB_ACCOUNT_ID: &str = "social.near";
const WIDGET_REFERENCE_ACCOUNT_ID: &str = "treasury-testing.near";

// Implement the contract structure
#[near]
impl Contract {
    pub fn update_widgets(&mut self) {
        socialdb::ext(SOCIALDB_ACCOUNT_ID.parse().unwrap())
            .get([format!("{}/widget/**", WIDGET_REFERENCE_ACCOUNT_ID)].to_vec())
            .then(Self::ext(env::current_account_id()).update_widgets_callback());
    }

    pub fn update_widgets_callback(&mut self) {
        if env::predecessor_account_id() != env::current_account_id() {
            env::panic_str("Should not be called directly");
        }
        match env::promise_result(0) {
            PromiseResult::Successful(result) => {
                let mut widget: Value =
                    near_sdk::serde_json::from_slice(result.as_slice()).unwrap();
                widget[env::current_account_id().to_string()] =
                    widget[WIDGET_REFERENCE_ACCOUNT_ID].clone();

                socialdb::ext(SOCIALDB_ACCOUNT_ID.parse().unwrap()).set(json!({"data": widget}));
            }
            _ => env::panic_str("The first call failed"),
        }
    }

    #[allow(unused_variables)]
    pub fn web4_get(&self, request: Web4Request) -> Web4Response {
        Web4Response::Body {
            content_type: "text/html; charset=UTF-8".to_owned(),
            body: include_str!("../index.html.base64.txt").to_string(),
        }
    }
}

/*
 * The rest of this file holds the inline tests for the code above
 * Learn more about Rust tests: https://doc.rust-lang.org/book/ch11-01-writing-tests.html
 */
#[cfg(test)]
mod tests {
    use super::*;

    use near_sdk::base64::{engine::general_purpose, Engine as _};

    #[test]
    fn web4_get() {
        let contract = Contract::default();
        let response = contract.web4_get(
            serde_json::from_value(serde_json::json!({
                "path": "/"
            }))
            .unwrap(),
        );
        match response {
            Web4Response::Body { content_type, body } => {
                assert_eq!("text/html; charset=UTF-8", content_type);

                let body_string =
                    String::from_utf8(general_purpose::STANDARD.decode(body).unwrap()).unwrap();

                assert!(body_string.contains("near-social-viewer"));
            }
            _ => {
                panic!("Should return Web4Response::Body");
            }
        }
    }
}
