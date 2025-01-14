use base64::{engine::general_purpose, Engine as _};
use cargo_near_build::BuildOpts;
use cargo_near_build::{bon, camino, extended};
use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::str::FromStr;

struct ChildContract {
    workdir: &'static str,
    manifest: camino::Utf8PathBuf,
    nep330_contract_path: &'static str,
}

impl ChildContract {
    fn get() -> Self {
        // unix path to target sub-contract's crate from root of the repo
        let nep330_contract_path = "web4/treasury-web4";
        let workdir = "../web4/treasury-web4";
        let manifest = camino::Utf8PathBuf::from_str(workdir)
            .expect("pathbuf from str")
            .join("Cargo.toml");

        Self {
            workdir,
            nep330_contract_path,
            manifest,
        }
    }

    // returns absolute path, relative to parent contract 
    fn sub_build_target_dir() -> String {
        let path = Path::new("./target/build-rs-treasury-web4-for-treasury-factory");

        std::fs::create_dir_all(&path).unwrap_or_else(|err| panic!(
            "create sub-build target dir {}: {:#?}", path.to_string_lossy(), err
        ));

        let path = path.canonicalize()
            .unwrap_or_else(|err| panic!("canonicalize() path: {:#?}", err));

        path.to_str()
            .unwrap_or_else(|| panic!("valid unicode path expected {}", path.to_string_lossy()))
            .to_owned()
    }

    // by the way, BASE64("") = ""
    const STUB_PATH: &str = "./target/treasury-web4-stub.bin";

    fn intermediate_result_env_key() -> &'static str {
        "BUILD_RS_SUB_BUILD_ARTIFACT_RAW_WASM"
    }

    const ENCODED_RESULT_PATH: &str = "./target/treasury_web4.wasm.base64.txt";
    fn final_result_env_key() -> &'static str {
        "BUILD_RS_SUB_BUILD_ARTIFACT_BASE64_ENCODED_WASM"
    }
}

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

    let child_contract = ChildContract::get();
    let build_artifact = {
        let build_opts = BuildOpts::builder()
            .manifest_path(child_contract.manifest)
            .override_nep330_contract_path(child_contract.nep330_contract_path)
            .override_cargo_target_dir(ChildContract::sub_build_target_dir())
            .build();
        let build_script_opts = extended::BuildScriptOpts::builder()
            .rerun_if_changed_list(bon::vec![child_contract.workdir])
            .build_skipped_when_env_is(vec![
                // shorter build for `cargo check`
                ("PROFILE", "debug"),
                (cargo_near_build::env_keys::BUILD_RS_ABI_STEP_HINT, "true"),
            ])
            .stub_path(ChildContract::STUB_PATH)
            .result_env_key(ChildContract::intermediate_result_env_key())
            .build();

        let build_opts_extended = extended::BuildOptsExtended::builder()
            .build_opts(build_opts)
            .build_script_opts(build_script_opts)
            .build();

        extended::build(build_opts_extended).unwrap_or_else(|err| {
            panic!(
                "Building `{}` contract failed: {:#?}",
                child_contract.workdir, err
            )
        })
    };

    let web4_wasm_base64_path = base64_encode_wasm(&build_artifact);

    export_result(web4_wasm_base64_path);
}

fn base64_encode_wasm(build_artifact: &cargo_near_build::BuildArtifact) -> std::path::PathBuf {
    let web4_wasm_base64 = {
        let web4_wasm = fs::read(&build_artifact.path)
            .unwrap_or_else(|err| panic!("Failed to read {:?}: {:#?}", build_artifact.path, err));
        general_purpose::STANDARD.encode(&web4_wasm)
    };

    let web4_wasm_base64_path = Path::new(ChildContract::ENCODED_RESULT_PATH);

    let mut output_file =
        fs::File::create(web4_wasm_base64_path).unwrap_or_else(|err| {
            panic!(
                "Failed to create output file {:?}, {:#?}",
                web4_wasm_base64_path, err
            )
        });

    output_file
        .write_all(web4_wasm_base64.as_bytes())
        .unwrap_or_else(|err| {
            panic!(
                "Failed to write to output file {:?}, {:#?}",
                web4_wasm_base64_path, err
            )
        });
    web4_wasm_base64_path
        .canonicalize()
        .unwrap_or_else(|err| panic!("canonicalize() path: {:#?}", err))
}

fn export_result(web4_wasm_base64_path: std::path::PathBuf) {
    let _result_env_key = {
        let result_env_key = ChildContract::final_result_env_key();

        let path = web4_wasm_base64_path.to_str().unwrap_or_else(|| {
            panic!(
                "valid unicode path expected {}",
                web4_wasm_base64_path.to_string_lossy()
            )
        });
        println!(
            "cargo::warning={}",
            format!("Path to base64 encoded artifact: {}", path,)
        );
        println!(
            "cargo::warning={}",
            format!(
                "Path to base64-encoded wasm artifact is exported to `{}`",
                result_env_key,
            )
        );
        println!("cargo::rustc-env={}={}", result_env_key, path);
    };
}
