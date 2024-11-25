use near_workspaces::{mainnet, network::Mainnet, sandbox, Worker};
use tokio::io::{self, AsyncBufReadExt, BufReader};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
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

    worker.import_contract(&"lockup-whitelist.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;

    worker.import_contract(&"poolv1.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;

    let dev_account = worker.dev_create_account().await?;
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
