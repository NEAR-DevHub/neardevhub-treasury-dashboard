// Import HOT from version 1.0.3 which properly exports it
import { HOT } from "https://ga.jspm.io/npm:@hot-wallet/sdk@1.0.3/build/index.js";

// Re-export everything from the latest version (1.0.8)
export * from "https://ga.jspm.io/npm:@hot-wallet/sdk@1.0.8/build/index.js";

// Re-export HOT as a named export (overriding any existing HOT export)
export { HOT };
