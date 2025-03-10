use near_sdk::NearToken;
mod web4_utils;

use web4_utils::call_web4_get_with_preload_result;

#[tokio::test]

async fn test_upgrade() -> Result<(), Box<dyn std::error::Error>> {
    let mainnet = near_workspaces::mainnet().await?;
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let treasury_factory_contract = sandbox
        .import_contract(&"treasury-factory.near".parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(20))
        .transact()
        .await?;

    let mut wasm_bytes =
        include_bytes!("../../../treasury-factory/target/near/treasury_factory.wasm").to_vec();
    let original_string = b"DOCTYPE";
    let new_string = b"UPGRADE"; // Ensure the new string is the same length as the original

    // Replace the original string with the new string in the byte array
    if let Some(pos) = wasm_bytes
        .windows(original_string.len())
        .position(|window| window == original_string)
    {
        wasm_bytes[pos..pos + new_string.len()].copy_from_slice(new_string);
    }
    let treasury_factory_deployment_result = treasury_factory_contract
        .as_account()
        .deploy(&wasm_bytes)
        .await?;
    assert!(treasury_factory_deployment_result.is_success());

    let contract = sandbox.dev_deploy(&contract_wasm).await?;

    let body_string = &call_web4_get_with_preload_result(contract.clone())
        .await
        .unwrap()[..15];
    assert_eq!(body_string, "<!DOCTYPE html>");

    let self_upgrade_result = contract
        .clone()
        .call("self_upgrade")
        .max_gas()
        .transact()
        .await?;
    assert!(self_upgrade_result.is_success());
    assert_eq!(
        self_upgrade_result.receipt_failures().len(),
        0,
        "Total tgas burnt {:?}, Receipt failures: {:?}",
        self_upgrade_result.total_gas_burnt.as_tgas(),
        self_upgrade_result.receipt_failures()
    );

    let body_string = &call_web4_get_with_preload_result(contract).await.unwrap()[..15];
    assert_eq!(body_string, "<!UPGRADE html>");

    Ok(())
}
