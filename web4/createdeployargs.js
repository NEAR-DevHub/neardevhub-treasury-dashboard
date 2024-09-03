import { rollup } from "rollup";
import { readFile, writeFile } from "fs/promises";

export async function createDeployArgs() {
  process.chdir(new URL(".", import.meta.url).pathname);
  const indexHtml = `export default ${JSON.stringify(
    (
      await readFile(new URL("public_html/index.html", import.meta.url))
    ).toString(),
  )};`;
  await writeFile(new URL("index.html.js", import.meta.url), indexHtml);

  const bundle = await rollup({
    input: "contract.js",
  });

  await bundle.write({
    file: "contract-bundle.js",
    format: "es",
  });

  // Optionally, close the bundle
  await bundle.close();

  let scriptFileContent = (await readFile("./contract-bundle.js")).toString();
  scriptFileContent = scriptFileContent.replace(
    "POSTHOG_API_KEY",
    process.env.POSTHOG_API_KEY,
  );

  scriptFileContent = scriptFileContent.replace(
    "PIKESPEAK_API_KEY",
    process.env.PIKESPEAK_API_KEY,
  );

  const args = { javascript: scriptFileContent };
  return args;
}

await writeFile("args.json", JSON.stringify(await createDeployArgs()));
