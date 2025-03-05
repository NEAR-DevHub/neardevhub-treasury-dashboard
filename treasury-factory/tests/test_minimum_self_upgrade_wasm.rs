use near_sdk::base64::{self, engine::general_purpose, Engine};
use near_workspaces;

#[tokio::test]
async fn test_minimum_self_upgrade_wasm() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;

    let account = sandbox.dev_create_account().await?;

    let minimum_self_upgrade_contract_wasm_base64 =
        include_str!("../min_self_upgrade_contract.wasm.base64.txt");

    let allowed_account_bytes = account.id().as_bytes();

    // Encode length (8 bytes) + account ID (padded to 64 bytes)
    let mut encoded_data = vec![0u8; 8 + 64];
    encoded_data[..8].copy_from_slice(&(allowed_account_bytes.len() as u64).to_le_bytes()); // Store length (8 bytes)
    encoded_data[8..8 + allowed_account_bytes.len()].copy_from_slice(allowed_account_bytes); // Store account ID

    let encoded_account_base64 = general_purpose::STANDARD.encode(&encoded_data);

    // Final Base64 string
    let final_wasm_base64 = format!(
        "{}{}",
        minimum_self_upgrade_contract_wasm_base64, encoded_account_base64
    );

    let minimum_self_upgrade_contract_wasm =
        general_purpose::STANDARD.decode(final_wasm_base64).unwrap();

    let contract = account
        .deploy(&minimum_self_upgrade_contract_wasm)
        .await?
        .result;

    let new_contract_wasm = wabt::wat2wasm(
        "
(module
  (import \"env\" \"value_return\" (func $value_return (param i64 i64)))
  (func (export \"hello\")
    i64.const 7
    i64.const 0
    call $value_return
  )
  (memory 1)
  (data (i32.const 0) \"\\\"hello\\\"\")
)
    ",
    )
    .unwrap();

    let other_account = sandbox.dev_create_account().await?;
    let upgrade_result = other_account
        .call(contract.id(), "upgrade")
        .args(new_contract_wasm.clone())
        .max_gas()
        .transact()
        .await?;
    assert!(
        upgrade_result.is_failure(),
        "Another account should not be able to upgrade the contract"
    );

    let upgrade_result = account
        .call(contract.id(), "upgrade")
        .args(new_contract_wasm)
        .max_gas()
        .transact()
        .await?;
    assert!(
        upgrade_result.is_success(),
        "{:?}",
        upgrade_result.failures()
    );

    let upgraded_contract_view_result = contract.view("hello").await?.result;
    assert_eq!(
        "\"hello\"".to_string(),
        String::from_utf8(upgraded_contract_view_result).unwrap()
    );
    Ok(())
}
