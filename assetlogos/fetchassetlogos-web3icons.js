// filepath: /Users/peter/git/neardevhub-treasury-dashboard/assetlogos/fetchassetlogos-web3icons.js

import * as web3Icons from '@web3icons/core';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_URL = 'https://api-mng-console.chaindefuser.com/api/tokens';
const LOGOS_DIR = join(__dirname, 'logos');
const OUTPUT_JSON = join(__dirname, 'token-icons.json');

// Ensure logos directory exists
async function ensureLogosDir() {
  try {
    await mkdir(LOGOS_DIR, { recursive: true });
    console.log(`✅ Logos directory ensured: ${LOGOS_DIR}`);
  } catch (error) {
    console.error('❌ Error creating logos directory:', error);
    throw error;
  }
}

// Fetch all tokens from the API
async function fetchTokens() {
  try {
    console.log('🔄 Fetching tokens from API...');
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Fetched ${data.items.length} tokens`);
    return data.items;
  } catch (error) {
    console.error('❌ Error fetching tokens:', error);
    throw error;
  }
}

// Get icon for a single token
async function getTokenIconData(token) {
  try {
    // Normalize the symbol for matching
    const symbol = token.symbol.toUpperCase();
    
    // Try different naming patterns for web3icons
    const possibleNames = [
      `TokenBranded${symbol}`,
      `TokenMono${symbol}`,
      `TokenBackground${symbol}`
    ];
    
    for (const exportName of possibleNames) {
      if (web3Icons[exportName]) {
        console.log(`✅ Found ${symbol} as ${exportName}`);
        return {
          svgContent: web3Icons[exportName].default || web3Icons[exportName],
          variant: exportName.includes('Branded') ? 'branded' : 
                   exportName.includes('Mono') ? 'mono' : 'background'
        };
      }
    }
    
    console.log(`❌ ${symbol}: No icon found in web3icons`);
    return null;
  } catch (error) {
    console.warn(`⚠️  Could not get icon for ${token.symbol}:`, error.message);
    return null;
  }
}

// Save SVG content to file
async function saveSvgIcon(svgContent, fileName) {
  try {
    const filePath = join(LOGOS_DIR, fileName);
    await writeFile(filePath, svgContent, 'utf8');
    return filePath;
  } catch (error) {
    console.error(`❌ Error saving SVG ${fileName}:`, error);
    return null;
  }
}

// Process all tokens and get their icons
async function processTokens() {
  const tokens = await fetchTokens();
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  console.log('\n🔄 Processing tokens for icons...');
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    console.log(`\n[${i + 1}/${tokens.length}] Processing ${token.symbol} (${token.blockchain})`);
    
    try {
      const iconData = await getTokenIconData(token);
      
      if (iconData) {
        const fileName = `${token.symbol.toLowerCase()}-${token.blockchain}-${iconData.variant}.svg`;
        const localPath = await saveSvgIcon(iconData.svgContent, fileName);
        
        const result = {
          defuse_asset_id: token.defuse_asset_id,
          symbol: token.symbol,
          blockchain: token.blockchain,
          contract_address: token.contract_address,
          variant: iconData.variant,
          local_path: localPath ? `./logos/${fileName}` : null,
          status: localPath ? 'success' : 'save_failed'
        };
        
        results.push(result);
        
        if (localPath) {
          console.log(`✅ ${token.symbol}: Saved ${iconData.variant} variant to ${fileName}`);
          successCount++;
        } else {
          console.log(`⚠️  ${token.symbol}: Found icon but save failed`);
          errorCount++;
        }
      } else {
        const result = {
          defuse_asset_id: token.defuse_asset_id,
          symbol: token.symbol,
          blockchain: token.blockchain,
          contract_address: token.contract_address,
          variant: null,
          local_path: null,
          status: 'not_found'
        };
        
        results.push(result);
        console.log(`❌ ${token.symbol}: No icon found`);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ ${token.symbol}: Error processing:`, error.message);
      
      const result = {
        defuse_asset_id: token.defuse_asset_id,
        symbol: token.symbol,
        blockchain: token.blockchain,
        contract_address: token.contract_address,
        variant: null,
        local_path: null,
        status: 'error',
        error: error.message
      };
      
      results.push(result);
      errorCount++;
    }
    
    // No need for delay since we're not making network requests
  }

  // Save results to JSON file
  await writeFile(OUTPUT_JSON, JSON.stringify(results, null, 2));
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Errors/Not found: ${errorCount}`);
  console.log(`📁 Results saved to: ${OUTPUT_JSON}`);
  console.log(`📁 Icons saved to: ${LOGOS_DIR}`);
  
  return results;
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting token icon fetching process...');
    await ensureLogosDir();
    await processTokens();
    console.log('🎉 Process completed!');
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}