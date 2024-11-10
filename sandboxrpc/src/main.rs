use near_workspaces::{mainnet, network::Mainnet, sandbox, types::SecretKey, Worker};
use tokio::signal;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mainnet: Worker<Mainnet> = mainnet().await?;
    let worker = sandbox().await?;
    
    let sputnik_dao_contract = worker.import_contract(&"sputnik-dao.near".parse().unwrap(), &mainnet).transact().await?;
    let sputnik_dao_init_result = sputnik_dao_contract.call("new").max_gas().transact().await?;
    assert!(sputnik_dao_init_result.is_success());
    
    let dev_account = worker.dev_create_account().await?;
    println!("{{\"account_id\": {:?}, \"secret_key\": {:?}, \"rpc_url\": {:?}}}", dev_account.id().to_string(), dev_account.secret_key().to_string(), worker.rpc_addr());
    signal::ctrl_c().await?;
    println!("Received termination signal, shutting down.");
    Ok(())
}
