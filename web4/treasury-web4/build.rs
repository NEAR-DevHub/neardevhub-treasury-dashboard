use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    println!("cargo:rerun-if-changed=./src/web4/index.html");
    println!("cargo:rerun-if-changed=./src/web4/service-worker.js");

    // Get current timestamp for cache busting
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_millis();

    // Change working directory to the directory of the script (similar to process.chdir)
    let current_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../public_html");

    // Read the index.html file
    let index_path = current_dir.join("index.html");
    let mut index_html = fs::read_to_string(index_path).expect("Failed to read index.html");

    // Replace placeholders with environment variables
    if let Ok(posthog_api_key) = env::var("POSTHOG_API_KEY") {
        index_html = index_html.replace("POSTHOG_API_KEY", &posthog_api_key);
    }

    if let Ok(pikespeak_api_key) = env::var("PIKESPEAK_API_KEY") {
        index_html = index_html.replace("PIKESPEAK_API_KEY", &pikespeak_api_key);
    }

    let output_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/web4/index.html");
    let mut output_file = fs::File::create(output_path).expect("Failed to create output file");

    output_file
        .write_all(index_html.as_bytes())
        .expect("Failed to write to output file");

    // Process service worker with timestamp
    let service_worker_src = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/web4/service-worker.js");
    let mut service_worker_content = fs::read_to_string(&service_worker_src)
        .expect("Failed to read service-worker.js");
    
    // Replace BUILD_TIMESTAMP placeholder with actual timestamp
    service_worker_content = service_worker_content.replace("__BUILD_TIMESTAMP__", &timestamp.to_string());
    
    // Write back the updated service worker
    fs::write(&service_worker_src, service_worker_content)
        .expect("Failed to write updated service-worker.js");
}
