// Find all our documentation at https://docs.near.org
use near_sdk::ext_contract;

pub const NO_DEPOSIT: u128 = 0;
pub const XCC_SUCCESS: u64 = 1;

// Validator interface, for cross-contract calls
#[ext_contract(sputnik_dao)]
trait SputnikDao {
    fn create(&self, name: String, args: String);
}
