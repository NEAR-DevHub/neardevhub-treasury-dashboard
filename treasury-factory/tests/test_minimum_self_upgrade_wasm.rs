use near_workspaces;
use near_sdk::base64::{self, engine::general_purpose, Engine};

#[tokio::test]
async fn test_minimum_self_upgrade_wasm() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;

    let minimum_self_upgrade_contract_wasm_base64 = include_str!("../min_self_upgrade_contract.wasm.base64.txt");
    let minimum_self_upgrade_contract_wasm = general_purpose::STANDARD.decode(minimum_self_upgrade_contract_wasm_base64).unwrap();

    let contract = sandbox.dev_deploy(&minimum_self_upgrade_contract_wasm).await?;
    let upgrade_result = contract.call("upgrade").max_gas().transact().await?;
    assert!(upgrade_result.is_success(), "{:?}", upgrade_result.failures());

    Ok(())
}
