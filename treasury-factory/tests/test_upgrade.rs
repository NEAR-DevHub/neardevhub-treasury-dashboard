use std::fs;

use cargo_near_build::BuildOpts;
use near_workspaces;

#[tokio::test]
async fn test_get_web4_contract_bytes() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let build_opts = BuildOpts::builder().build();
    let build_artifact = cargo_near_build::build(build_opts).expect("Failed to build contract");

    let contract_wasm = fs::read(build_artifact.path).expect("Unable to read contract wasm");

    let contract = sandbox.dev_deploy(&contract_wasm).await?;
    let web4_contract_bytes = contract.view("get_web4_contract_bytes").await?.result;
    assert_eq!(web4_contract_bytes, include_bytes!("../../web4/treasury-web4/target/near/treasury_web4.wasm"));

    Ok(())
}