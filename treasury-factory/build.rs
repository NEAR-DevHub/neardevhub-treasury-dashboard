use base64::{engine::general_purpose, Engine as _};
use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::Command;

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
/*
    let web4_project_path = "../web4/treasury-web4"; // Change to the actual path of the other project

    // Run cargo build for the other project, targeting WASM
    let status = Command::new("cargo")
        .arg("near")
        .arg("build")
        .arg("--no-docker")
        .current_dir(web4_project_path)
        .status()
        .expect("Failed to build the other Rust project");

    if !status.success() {
        panic!(
            "Failed to build the other project: {:?}",
            status.code().unwrap()
        );
    }
     */
}
