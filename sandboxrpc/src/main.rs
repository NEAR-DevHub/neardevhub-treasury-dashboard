use near_workspaces::{mainnet, network::Mainnet, sandbox, types::NearToken, AccountId, Worker};
use serde_json::json;
use tokio::io::{self, AsyncBufReadExt, BufReader};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    const SOCIALDB_ACCOUNT: &str = "social.near";
    let socialdb_contract_id: AccountId = SOCIALDB_ACCOUNT.parse()?;

    let mainnet: Worker<Mainnet> = mainnet().await?;
    let worker = sandbox().await?;

    let sputnik_dao_contract = worker
        .import_contract(&"sputnik-dao.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;
    let sputnik_dao_init_result = sputnik_dao_contract
        .call("new")
        .max_gas()
        .transact()
        .await?;
    assert!(sputnik_dao_init_result.is_success());

    worker
        .import_contract(&"lockup.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;

    worker
        .import_contract(&"lockup-whitelist.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;

    worker
        .import_contract(&"poolv1.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;

    let itlx_2 = worker
        .import_contract(
            &"itlx_2.intellex_agents_owner_1.near".parse().unwrap(),
            &mainnet,
        )
        .initial_balance(NearToken::from_near(10000))
        .transact()
        .await?;

    let socialdb = worker
        .import_contract(&socialdb_contract_id, &mainnet)
        .initial_balance(NearToken::from_near(10000))
        .transact()
        .await?;

    let init_socialdb_result = socialdb.call("new").max_gas().transact().await?;
    if init_socialdb_result.is_failure() {
        panic!(
            "Error initializing socialDB\n{:?}",
            String::from_utf8(init_socialdb_result.raw_bytes().unwrap())
        );
    }
    assert!(init_socialdb_result.is_success());

    let set_socialdb_status_result = socialdb
        .call("set_status")
        .args_json(json!({"status": "Live"}))
        .max_gas()
        .transact()
        .await?;
    assert!(set_socialdb_status_result.is_success());

    let treasury_factory_contract = worker
        .import_contract(&"treasury-factory.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;

    let transfer_to_treasury_factory_result = worker
        .root_account()
        .unwrap()
        .transfer_near(
            treasury_factory_contract.as_account().id(),
            NearToken::from_near(5),
        )
        .await?;
    assert!(transfer_to_treasury_factory_result.is_success());

    let near_contract = worker
        .import_contract(&"near".parse().unwrap(), &mainnet)
        .initial_balance(NearToken::from_near(100_000_000))
        .transact()
        .await?;

    let init_near_result = near_contract.call("new").max_gas().transact().await?;
    if init_near_result.is_failure() {
        panic!(
            "Error initializing NEAR\n{:?}",
            String::from_utf8(init_near_result.raw_bytes().unwrap())
        );
    }

    let dev_account = worker.dev_create_account().await?;

    let _ = treasury_factory_contract
        .as_account()
        .create_subaccount("bootstrap")
        .keys(dev_account.secret_key().clone())
        .initial_balance(NearToken::from_near(10))
        .transact()
        .await?;

    let ft_new_result = itlx_2
        .call("new_default_meta")
        .args_json(json!({
            "owner_id": dev_account.id().to_string(),
            "total_supply": "10000000000000000000000000000"
        }))
        .transact()
        .await?;

    println!(
        "{{\"account_id\": {:?}, \"secret_key\": {:?}, \"rpc_url\": {:?}}}",
        dev_account.id().to_string(),
        dev_account.secret_key().to_string(),
        worker.rpc_addr()
    );

    println!("Type 'fast_forward(55)' to time travel 55 blocks forward in time.");
    println!("Type 'quit' to exit.");

    // Read user commands from stdin in a loop
    let stdin = io::stdin();
    let mut reader = BufReader::new(stdin).lines();

    while let Some(line) = reader.next_line().await? {
        if let Some(value) = parse_fast_forward_command(&line) {
            println!("Fast-forwarding by {} blocks...", value);
            worker.fast_forward(value).await?;
            println!("Fast-forwarded by {} blocks.", value);
        } else if line.trim() == "quit" {
            println!("Quitting sandbox");
            break;
        } else {
            println!("Unknown command: {}", line);
        }
    }

    Ok(())
}

// Parse the "fast_forward(value)" command and extract the value
fn parse_fast_forward_command(input: &str) -> Option<u64> {
    let input = input.trim();
    if let Some(stripped) = input
        .strip_prefix("fast_forward(")
        .and_then(|s| s.strip_suffix(")"))
    {
        stripped.parse::<u64>().ok()
    } else {
        None
    }
}
