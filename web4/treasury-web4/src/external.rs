// Find all our documentation at https://docs.near.org
use near_sdk::ext_contract;
use near_sdk::serde_json::Value;

#[ext_contract(socialdb)]
trait SocialDB {
    fn set(&self, data: Value);
    fn get(&self, keys: Vec<String>);
}
