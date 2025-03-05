use base64::{engine::general_purpose, Engine as _};
use cargo_near_build::extended::*;
use cargo_near_build::BuildOpts;
use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;
use wabt::wat2wasm;

fn main() {
    // Change working directory to the directory of the script (similar to process.chdir)
    let current_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("./public_html");

    // Read the index.html file
    let index_path = current_dir.join("index.html");
    let mut index_html = fs::read_to_string(index_path).expect("Failed to read index.html");

    // Replace placeholders with environment variables
    if let Ok(posthog_api_key) = env::var("POSTHOG_API_KEY") {
        index_html = index_html.replace("POSTHOG_API_KEY", &posthog_api_key);
    }

    // Convert the modified HTML content to base64 using near-sdk base64 engine
    let index_html_base64 = general_purpose::STANDARD.encode(&index_html);

    // Write the base64 string to the output file
    let output_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("index.html.base64.txt");
    let mut output_file = fs::File::create(output_path).expect("Failed to create output file");

    output_file
        .write_all(index_html_base64.as_bytes())
        .expect("Failed to write to output file");

    let min_self_upgrade_contract_wat_path = "./min_self_upgrade_contract.wat";

    let min_self_upgrade_contract_wat = fs::read(min_self_upgrade_contract_wat_path)
        .expect(format!("Failed to read {}", min_self_upgrade_contract_wat_path).as_str());
    let min_self_upgrade_contract_wasm = wat2wasm(min_self_upgrade_contract_wat).unwrap();

    let min_self_upgrade_contract_wasm_base64 =
        general_purpose::STANDARD.encode(&min_self_upgrade_contract_wasm);

    let target_contract_wasm_base64_path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("min_self_upgrade_contract.wasm.base64.txt");

    let mut output_file =
        fs::File::create(target_contract_wasm_base64_path).expect("Failed to create output file");

    output_file
        .write_all(min_self_upgrade_contract_wasm_base64.as_bytes())
        .expect("Failed to write to output file");

    let web4_wasm_path = "../web4/treasury-web4/target/near/treasury_web4.wasm";
    let _web4_wasm = match fs::exists(web4_wasm_path) {
        Ok(true) => fs::read(web4_wasm_path).unwrap(),
        Ok(false) => {
            let build_opts = BuildOpts::builder()
                .manifest_path("../web4/treasury-web4/Cargo.toml".into())
                .build();
            let build_script_opts = BuildScriptOpts::builder().build();
            let build_opts_extended = BuildOptsExtended::builder()
                .build_opts(build_opts)
                .build_script_opts(build_script_opts)
                .build();

            let build_artifact = build(build_opts_extended).expect("Building web4 contract failed");

            fs::read(build_artifact.path).unwrap()
        }
        Err(err) => panic!("Not able to build {}. Error: {}", web4_wasm_path, err),
    };
}
