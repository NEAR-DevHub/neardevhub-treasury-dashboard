import { readFile, writeFile } from "fs/promises";

process.chdir(new URL(".", import.meta.url).pathname);
let indexHtml = (await readFile(new URL("public_html/index.html", import.meta.url))).toString();
indexHtml = indexHtml.replace(
    "POSTHOG_API_KEY",
    process.env.POSTHOG_API_KEY
);

indexHtml = indexHtml.replace(
    "PIKESPEAK_API_KEY",
    process.env.PIKESPEAK_API_KEY
);

await writeFile(new URL("rust_contract/treasury-web4/src/index.html.base64.txt", import.meta.url), Buffer.from(indexHtml).toString('base64'));
