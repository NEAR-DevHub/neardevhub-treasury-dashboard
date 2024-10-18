// Find all our documentation at https://docs.near.org
mod web4;
use near_sdk::near;
use web4::types::{Web4Request, Web4Response};

// Define the contract structure
#[near(contract_state)]
#[derive(Default)]
pub struct Contract {}

// Implement the contract structure
#[near]
impl Contract {
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
