import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGOS_DIR = path.join(__dirname, 'logos');
const TOKENS_API = 'https://api-mng-console.chaindefuser.com/api/tokens';

async function fetchTokens() {
  const res = await fetch(TOKENS_API);
  if (!res.ok) throw new Error('Failed to fetch tokens');
  return res.json();
}

async function fetchFtMetadata(contractId) {
  // NEAR RPC endpoint (mainnet)
  const rpcUrl = 'https://rpc.mainnet.fastnear.com';
  const body = {
    jsonrpc: '2.0',
    id: 'dontcare',
    method: 'query',
    params: {
      request_type: 'call_function',
      account_id: contractId,
      method_name: 'ft_metadata',
      args_base64: '',
      finality: 'final',
    },
  };
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to fetch ft_metadata for ${contractId}`);
  const data = await res.json();
  if (!data.result || !data.result.result) throw new Error(`No result for ${contractId}`);
  const buf = Buffer.from(data.result.result);
  return JSON.parse(buf.toString());
}

async function saveIcon(symbol, icon) {
  if (!icon || !icon.startsWith('data:image/svg+xml;base64,')) return;
  const svgBase64 = icon.replace('data:image/svg+xml;base64,', '');
  const svg = Buffer.from(svgBase64, 'base64').toString('utf-8');
  const filePath = path.join(LOGOS_DIR, `${symbol}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`Saved: ${filePath}`);
}

async function main() {
  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR);
  const response = await fetchTokens();
  const tokens = response.items;
  for (const token of tokens) {
    if (!token.defuse_asset_id || !token.defuse_asset_id.startsWith('nep141:')) continue;
    const contractId = token.defuse_asset_id.replace('nep141:', '');
    if (!contractId) continue;
    try {
      const metadata = await fetchFtMetadata(contractId);
      if (!metadata.symbol) throw new Error('No symbol in metadata');
      await saveIcon(metadata.symbol, metadata.icon);
    } catch (e) {
      console.warn(`Skip ${contractId}: ${e.message}`);
    }
  }
}

main();