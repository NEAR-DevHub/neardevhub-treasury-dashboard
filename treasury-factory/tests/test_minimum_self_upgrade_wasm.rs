use near_sdk::base64::{self, engine::general_purpose, Engine};
use near_workspaces;

#[tokio::test]
async fn test_minimum_self_upgrade_wasm() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;

    let minimum_self_upgrade_contract_wasm_base64 =
        include_str!("../min_self_upgrade_contract.wasm.base64.txt");
    let minimum_self_upgrade_contract_wasm = general_purpose::STANDARD
        .decode(minimum_self_upgrade_contract_wasm_base64)
        .unwrap();

    let contract = sandbox
        .dev_deploy(&minimum_self_upgrade_contract_wasm)
        .await?;

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

    let upgrade_result = contract
        .call("upgrade")
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
