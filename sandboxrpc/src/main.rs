use near_api;
use near_sdk::{serde_json::json, AccountId, NearToken};
use near_workspaces::{
    network::Custom, sandbox_with_version, types::NearToken as WorkspacesNearToken, Worker,
};
use tokio::io::{self, AsyncBufReadExt, BufReader};

const SESSION_VAULT_WASM_URL: &str =
    "https://github.com/NEAR-DevHub/intellex_vesting_contracts/raw/1642d8f12b76eb6e6265b436be7b1f01d9782f3a/releases/session_vault_release.wasm";

async fn download_session_vault_wasm() -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    println!("📥 Downloading session_vault.wasm from GitHub...");
    let response = reqwest::get(SESSION_VAULT_WASM_URL).await?;
    let bytes = response.bytes().await?;
    println!("✅ Downloaded {} bytes", bytes.len());
    Ok(bytes.to_vec())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let worker = sandbox_with_version("2.7.1").await?;
    let mainnet: Worker<Custom> =
        near_workspaces::custom("https://rpc.mainnet.fastnear.com").await?;

    println!("📥 Importing contracts from mainnet...");

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
    println!("✅ Imported sputnik-dao.near");

    worker
        .import_contract(&"lockup.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;
    println!("✅ Imported lockup.near");

    worker
        .import_contract(&"lockup-whitelist.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;
    println!("✅ Imported lockup-whitelist.near");

    worker
        .import_contract(&"poolv1.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;
    println!("✅ Imported poolv1.near");

    let itlx_2 = worker
        .import_contract(
            &"itlx_2.intellex_agents_owner_1.near".parse().unwrap(),
            &mainnet,
        )
        .initial_balance(WorkspacesNearToken::from_near(10000))
        .transact()
        .await?;
    println!("✅ Imported itlx_2.intellex_agents_owner_1.near");

    let socialdb = worker
        .import_contract(&"social.near".parse().unwrap(), &mainnet)
        .initial_balance(WorkspacesNearToken::from_near(10000))
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
    println!("✅ Imported social.near");

    let treasury_factory_contract = worker
        .import_contract(&"treasury-factory.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;
    let transfer_to_treasury_factory_result = worker
        .root_account()
        .unwrap()
        .transfer_near(
            treasury_factory_contract.as_account().id(),
            WorkspacesNearToken::from_near(5),
        )
        .await?;
    assert!(transfer_to_treasury_factory_result.is_success());
    println!("✅ Imported treasury-factory.near");

    let ft_lockup_factory_contract = worker
        .import_contract(&"ft-lockup.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;
    let init_ft_lockup_factory_result = ft_lockup_factory_contract
        .call("new")
        .max_gas()
        .transact()
        .await?;
    if init_ft_lockup_factory_result.is_failure() {
        panic!(
            "Error initializing FT lockup factory\n{:?}",
            String::from_utf8(init_ft_lockup_factory_result.raw_bytes().unwrap())
        );
    }
    assert!(init_ft_lockup_factory_result.is_success());
    println!("✅ Imported ft-lockup.near");

    let usdt_ft_contract = worker
        .import_contract(&"usdt.tether-token.near".parse().unwrap(), &mainnet)
        .transact()
        .await?;
    let init_usdt_ft_result = usdt_ft_contract
        .call("new")
        .args_json(json!({
            "owner_id": usdt_ft_contract.as_account().id().to_string(),
            "total_supply": "1000000000000000000000000000",
            "metadata": {
                "spec": "ft-1.0.0",
                "name": "USDT",
                "symbol": "USDT",
                "decimals": 6,
                "icon": "https://example.com/usdt-icon.png"
            }
        }))
        .gas(near_sdk::Gas::from_tgas(100))
        .transact()
        .await?;
    if init_usdt_ft_result.is_failure() {
        panic!(
            "Error initializing USDT FT contract\n{:?}",
            String::from_utf8(init_usdt_ft_result.raw_bytes().unwrap())
        );
    }
    assert!(init_usdt_ft_result.is_success());
    println!("✅ Imported usdt.tether-token.near");

    let dev_account = worker.dev_create_account().await?;

    // Register dev account with USDT contract
    let storage_deposit_result = usdt_ft_contract
        .call("storage_deposit")
        .args_json(json!({
            "account_id": dev_account.id().to_string(),
            "registration_only": true
        }))
        .deposit(WorkspacesNearToken::from_millinear(12))
        .transact()
        .await?;
    assert!(storage_deposit_result.is_success());
    println!("✅ Registered dev account with USDT contract");

    // Transfer 200 USDT to dev account
    let transfer_result = usdt_ft_contract
        .call("ft_transfer")
        .args_json(json!({
            "receiver_id": dev_account.id().to_string(),
            "amount": "200000000"  // 200 USDT (6 decimals)
        }))
        .deposit(WorkspacesNearToken::from_yoctonear(1))
        .transact()
        .await?;
    assert!(transfer_result.is_success());
    println!("✅ Transferred 200 USDT to dev account");

    let _ = treasury_factory_contract
        .as_account()
        .create_subaccount("bootstrap")
        .keys(dev_account.secret_key().clone())
        .initial_balance(WorkspacesNearToken::from_near(10))
        .transact()
        .await?;

    let _ft_new_result = itlx_2
        .call("new_default_meta")
        .args_json(json!({
            "owner_id": dev_account.id().to_string(),
            "total_supply": "10000000000000000000000000000"
        }))
        .transact()
        .await?;

    println!(" Deploying global contract...");
    let session_vault_code = download_session_vault_wasm().await?;
    println!(
        "📊 Session vault code size: {} bytes",
        session_vault_code.len()
    );

    let network_config = near_api::NetworkConfig {
        network_name: "sandbox".to_string(),
        rpc_endpoints: vec![near_api::RPCEndpoint::new(
            worker.rpc_addr().parse().unwrap(),
        )],
        linkdrop_account_id: None,
        ..near_api::NetworkConfig::testnet()
    };

    let dev_account_id: AccountId = dev_account.id().clone();
    let root_account = worker.root_account().unwrap();
    let root_signer = near_api::Signer::new(near_api::Signer::from_secret_key(
        root_account.secret_key().to_string().parse().unwrap(),
    ))
    .unwrap();
    let dev_signer = near_api::Signer::new(near_api::Signer::from_secret_key(
        dev_account.secret_key().to_string().parse().unwrap(),
    ))
    .unwrap();

    near_api::Contract::deploy_global_contract_code(session_vault_code)
        .as_hash()
        .with_signer(root_account.id().clone(), root_signer.clone())
        .send_to(&network_config)
        .await
        .unwrap()
        .assert_success();

    println!("✅ Global contract deployed successfully!");

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    let create_instance_result =
        near_api::Contract(ft_lockup_factory_contract.as_account().id().clone())
            .call_function(
                "create_instance",
                json!({
                    "name": "test-lockup-instance",
                    "token_id": usdt_ft_contract.as_account().id().to_string()
                }),
            )
            .unwrap()
            .transaction()
            .deposit(NearToken::from_millinear(1))
            .gas(near_sdk::Gas::from_tgas(50))
            .with_signer(dev_account_id.clone(), dev_signer.clone())
            .send_to(&network_config)
            .await
            .unwrap();

    println!(
        "Instance creation result: {:?}",
        create_instance_result.status
    );

    println!(
        "{{\"account_id\": \"{}\", \"secret_key\": \"{}\", \"rpc_url\": \"{}\"}}",
        dev_account.id(),
        dev_account.secret_key(),
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
