use near_sdk::NearToken;

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
    let treasury_factory_deployment_result = treasury_factory_contract
        .as_account()
        .deploy(include_bytes!(
            "../../../treasury-factory/target/near/treasury_factory.wasm"
        ))
        .await?;
    assert!(treasury_factory_deployment_result.is_success());

    let contract = sandbox.dev_deploy(&contract_wasm).await?;
    let self_upgrade_result = contract.call("self_upgrade").max_gas().transact().await?;
    assert!(self_upgrade_result.is_success());
    assert_eq!(
        self_upgrade_result.receipt_failures().len(),
        0,
        "Total tgas burnt {:?}, Receipt failures: {:?}",
        self_upgrade_result.total_gas_burnt.as_tgas(),
        self_upgrade_result.receipt_failures()
    );

    Ok(())
}
