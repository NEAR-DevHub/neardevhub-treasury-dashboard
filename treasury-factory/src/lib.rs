// Find all our documentation at https://docs.near.org
mod web4;
use near_sdk::{env, near, AccountId, NearToken};
use web4::types::{Web4Request, Web4Response};
pub mod external;
pub use crate::external::*;

// Define the contract structure
#[near(contract_state)]
#[derive(Default)]
pub struct Contract {}

// Implement the contract structure
#[near]
impl Contract {
    #[allow(unused_variables)]
    pub fn web4_get(&self, request: Web4Request) -> Web4Response {
        Web4Response::Body {
            content_type: "text/html; charset=UTF-8".to_owned(),
            body: include_str!("../index.html.base64.txt").to_string(),
        }
    }

    pub fn create_instance(name: String, create_dao_args: String) {
        const SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT: &str = "sputnik-dao.near";

        sputnik_dao::ext(SPUTNIKDAO_FACTORY_CONTRACT_ACCOUNT.parse().unwrap())
            .with_attached_deposit(NearToken::from_near(6))
            .with_unused_gas_weight(1)
            .create(name, create_dao_args);
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
