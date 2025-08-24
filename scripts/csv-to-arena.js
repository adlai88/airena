#!/usr/bin/env node

/**
 * CSV to Are.na Channel Importer
 * 
 * Reads a CSV file and creates Are.na blocks in a specified channel.
 * Designed for importing reading lists, bookmarks, etc.
 * 
 * Usage:
 *   node scripts/csv-to-arena.js --csv path/to/file.csv --channel my-channel-slug [--dry-run]
 * 
 * Required environment variable:
 *   ARENA_ACCESS_TOKEN - Your Are.na API access token
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const ARENA_API_BASE = 'https://api.are.na/v2';
const RATE_LIMIT_MS = 1000; // 1 second between requests to be respectful

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && i + 1 < args.length) {
      parsed.csvPath = args[i + 1];
      i++;
    } else if (args[i] === '--channel' && i + 1 < args.length) {
      parsed.channelSlug = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      parsed.dryRun = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      parsed.help = true;
    }
  }
  
  return parsed;
}

// Show usage information
function showHelp() {
  console.log(`
CSV to Are.na Channel Importer

Usage:
  node scripts/csv-to-arena.js --csv <path> --channel <slug> [options]

Arguments:
  --csv <path>        Path to CSV file to import
  --channel <slug>    Are.na channel slug to add blocks to
  --dry-run          Show what would be imported without making changes
  --help, -h         Show this help message

Environment Variables:
  ARENA_ACCESS_TOKEN  Your Are.na API access token (required)

CSV Format:
  Expected columns: Title, Link, Author, Date, Recommend
  Only rows with valid URLs in the Link column will be imported.

Examples:
  # Dry run to preview what will be imported
  node scripts/csv-to-arena.js --csv data.csv --channel my-reading-list --dry-run
  
  # Actually import the data
  node scripts/csv-to-arena.js --csv data.csv --channel my-reading-list
`);
}

// Parse CSV content (simple CSV parser for our specific format)
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Only include rows with valid links
    if (row.Link && row.Link.startsWith('http')) {
      rows.push(row);
    }
  }
  
  return rows;
}

// Create Are.na API client
function createArenaClient(accessToken) {
  const client = axios.create({
    baseURL: ARENA_API_BASE,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    async createBlock(channelSlug, blockData) {
      const response = await client.post(`/channels/${channelSlug}/blocks`, blockData);
      return response.data;
    },
    
    async getChannel(channelSlug) {
      try {
        const response = await client.get(`/channels/${channelSlug}`);
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    }
  };
}

// Convert CSV row to Are.na block data
function csvRowToBlockData(row) {
  let description = '';
  
  if (row.Author) {
    description += `By: ${row.Author}`;
  }
  
  if (row.Date) {
    if (description) description += ' | ';
    description += `Date: ${row.Date}`;
  }
  
  if (row.Recommend && row.Recommend.includes('⭐')) {
    if (description) description += ' | ';
    description += `Rating: ${row.Recommend}`;
  }
  
  return {
    source: row.Link,
    title: row.Title || undefined,
    description: description || undefined
  };
}

// Sleep utility for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main import function
async function importCSVToArena(options) {
  const { csvPath, channelSlug, dryRun, accessToken } = options;
  
  console.log(`📊 CSV to Are.na Importer`);
  console.log(`📁 CSV File: ${csvPath}`);
  console.log(`📂 Channel: ${channelSlug}`);
  console.log(`🧪 Mode: ${dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`);
  console.log('');
  
  // Read and parse CSV
  console.log('📖 Reading CSV file...');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  
  console.log(`✅ Parsed ${rows.length} valid rows from CSV`);
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - Preview of what would be imported:');
    console.log('━'.repeat(80));
    
    rows.forEach((row, index) => {
      const blockData = csvRowToBlockData(row);
      console.log(`${index + 1}. ${blockData.title || 'Untitled'}`);
      console.log(`   URL: ${blockData.source}`);
      if (blockData.description) {
        console.log(`   Info: ${blockData.description}`);
      }
      console.log('');
    });
    
    console.log(`📊 Summary: ${rows.length} blocks would be created`);
    console.log('');
    console.log('To actually import, run the same command without --dry-run');
    return;
  }
  
  // Create Are.na client
  const arena = createArenaClient(accessToken);
  
  // Check if channel exists
  console.log('\n🔍 Checking channel...');
  const channel = await arena.getChannel(channelSlug);
  
  if (!channel) {
    console.log(`❌ Channel "${channelSlug}" not found.`);
    console.log('Please create the channel first on are.na or use an existing channel slug.');
    process.exit(1);
  }
  
  console.log(`✅ Found channel: "${channel.title}" (${channel.length} existing blocks)`);
  
  // Import blocks
  console.log(`\n🚀 Starting import of ${rows.length} blocks...`);
  console.log('━'.repeat(80));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const blockData = csvRowToBlockData(row);
    
    try {
      console.log(`[${i + 1}/${rows.length}] Creating: ${blockData.title || 'Untitled'}`);
      
      const createdBlock = await arena.createBlock(channelSlug, blockData);
      console.log(`  ✅ Success - Block ID: ${createdBlock.id}`);
      successCount++;
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      if (error.response?.data) {
        console.log(`     API Error: ${JSON.stringify(error.response.data)}`);
      }
      errorCount++;
    }
    
    // Rate limiting - wait between requests
    if (i < rows.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }
  
  console.log('━'.repeat(80));
  console.log('\n📊 Import Complete!');
  console.log(`✅ Successfully created: ${successCount} blocks`);
  if (errorCount > 0) {
    console.log(`❌ Errors encountered: ${errorCount} blocks`);
  }
  console.log(`\n🔗 View your channel: https://www.are.na/${channelSlug}`);
}

// Main execution
async function main() {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  
  // Validate arguments
  if (!args.csvPath) {
    console.error('❌ Error: --csv argument is required');
    showHelp();
    process.exit(1);
  }
  
  if (!args.channelSlug) {
    console.error('❌ Error: --channel argument is required');
    showHelp();
    process.exit(1);
  }
  
  const accessToken = process.env.ARENA_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ Error: ARENA_ACCESS_TOKEN environment variable is required');
    console.error('Get your token from: https://dev.are.na/oauth/applications');
    process.exit(1);
  }
  
  try {
    await importCSVToArena({
      csvPath: args.csvPath,
      channelSlug: args.channelSlug,
      dryRun: args.dryRun || false,
      accessToken
    });
  } catch (error) {
    console.error(`\n❌ Import failed: ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { importCSVToArena, parseCSV, csvRowToBlockData };