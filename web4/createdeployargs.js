import { rollup } from 'rollup';
import { readFile, writeFile } from 'fs/promises';

const bundle = await rollup({
    input: 'contract.js'
});

await bundle.write({
    file: 'contract-bundle.js',
    format: 'es'
});

// Optionally, close the bundle
await bundle.close();

let scriptFileContent = (await readFile('./contract-bundle.js')).toString();
scriptFileContent = scriptFileContent.replace('POSTHOG_API_KEY', process.env.POSTHOG_API_KEY);

const args = { javascript: scriptFileContent };
await writeFile('args.json', JSON.stringify(args));
