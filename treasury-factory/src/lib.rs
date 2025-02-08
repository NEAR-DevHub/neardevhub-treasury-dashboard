// Find all our documentation at https://docs.near.org
mod web4;
use near_sdk::{
    env, near, serde_json::json, AccountId, Gas, NearToken, Promise, PromiseResult, PublicKey,
};
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

    #[payable]
    pub fn create_instance(
        &mut self,
        name: String,
        sputnik_dao_factory_account_id: String,
        social_db_account_id: String,
        widget_reference_account_id: String,
        create_dao_args: String,
    ) -> Promise {
        if env::attached_deposit() != NearToken::from_near(9) {
            env::panic_str("Must attach 9 NEAR to create treasury instance");
        }
        let new_instance_contract_id: AccountId = format!("{}.near", name).parse().unwrap();
        let admin_full_access_public_key: PublicKey =
            "ed25519:DuAFUPhxv3zBDbZP8oCwC1KQPVzaUY88s5tECv8JDPMg"
                .parse()
                .unwrap();

        Promise::new("near".parse().unwrap())
            .function_call(
                "create_account_advanced".to_string(),
                json!({
                    "new_account_id": new_instance_contract_id.clone(),
                    "options": {
                        "full_access_keys": [env::signer_account_pk(),admin_full_access_public_key],
                        "contract_bytes_base64": include_str!("../treasury_web4.wasm.base64.txt")
                    }
                })
                .to_string()
                .as_bytes()
                .to_vec(),
                NearToken::from_near(2),
                Gas::from_tgas(80),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_attached_deposit(env::attached_deposit())
                    .create_account_callback(
                        env::predecessor_account_id(),
                        env::attached_deposit(),
                        name,
                        new_instance_contract_id,
                        sputnik_dao_factory_account_id,
                        social_db_account_id,
                        widget_reference_account_id,
                        create_dao_args,
                    ),
            )
    }

    pub fn create_account_callback(
        &self,
        refund_on_failure_account: AccountId,
        refund_on_failure_amount: NearToken,
        name: String,
        new_instance_contract_id: AccountId,
        sputnik_dao_factory_account_id: String,
        social_db_account_id: String,
        widget_reference_account_id: String,
        create_dao_args: String,
    ) -> Promise {
        let create_account_result = env::promise_result(env::promise_results_count() - 1);
        let create_account_result: bool = match create_account_result {
            PromiseResult::Successful(result) => {
                near_sdk::serde_json::from_slice::<bool>(&result).unwrap_or(false)
            }
            _ => false,
        };

        if create_account_result {
            Promise::new(new_instance_contract_id.clone())
                .then(
                    instance_contract::ext(new_instance_contract_id.clone())
                        .with_attached_deposit(NearToken::from_near(1))
                        .update_widgets(widget_reference_account_id, social_db_account_id),
                )
                .then(
                    sputnik_dao::ext(sputnik_dao_factory_account_id.parse().unwrap())
                        .with_attached_deposit(NearToken::from_near(6))
                        .with_static_gas(Gas::from_tgas(100))
                        .create(name.to_string(), create_dao_args),
                )
        } else {
            Promise::new(refund_on_failure_account).transfer(refund_on_failure_amount)
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
