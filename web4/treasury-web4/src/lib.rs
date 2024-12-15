// Find all our documentation at https://docs.near.org
mod web4;
use near_sdk::{env, near, Gas, NearToken, Promise, PromiseResult};
use web4::types::Web4Response;

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

    #[allow(unused_variables)]
    pub fn web4_get(&self) -> Web4Response {
        Web4Response::Body {
            content_type: "text/html; charset=UTF-8".to_owned(),
            body: include_str!("../index.html.base64.txt").to_string(),
        }
    }
}
