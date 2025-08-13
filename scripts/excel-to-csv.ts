#!/usr/bin/env node

/**
 * Simple Excel to CSV converter
 * Bypasses database operations and just converts Excel files to CSV
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parseFilename } from '../src/lib/data-contract.js';
import { readExcelFile } from '../src/etl/readXlsx.js';
import { transformRows, deduplicateRows, enrichRows } from '../src/etl/transform.js';
import { writeCsvFile } from '../src/etl/writeCsv.js';

async function convertExcelToCSV() {
  const inputDir = './data_raw';
  const outputDir = './data_cleaned';
  
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Get all Excel files
    const files = await fs.readdir(inputDir);
    const excelFiles = files.filter(f => f.endsWith('_raw_data.xlsx'));
    
    console.log(`Found ${excelFiles.length} Excel files to process`);
    
    for (const file of excelFiles) {
      console.log(`\n📁 Processing ${file}...`);
      
      try {
        // Parse filename
        const fileInfo = parseFilename(file);
        
        // Read Excel file
        const filePath = path.join(inputDir, file);
        const excelResult = await readExcelFile(filePath);
        console.log(`  ✓ Read ${excelResult.rows.length} rows`);
        
        // Transform rows
        const transformResult = transformRows(excelResult.rows, fileInfo);
        console.log(`  ✓ Valid rows: ${transformResult.validRows.length}, Rejected: ${transformResult.rejectedRows.length}`);
        
        // Deduplicate and enrich
        const { uniqueRows } = deduplicateRows(transformResult.validRows);
        const enrichedRows = enrichRows(uniqueRows);
        console.log(`  ✓ Unique rows after deduplication: ${enrichedRows.length}`);
        
        // Write CSV
        const csvFilename = `${fileInfo.date.replace(/-/g, '')}_${fileInfo.genreKey}.csv`;
        const csvResult = await writeCsvFile(enrichedRows, csvFilename, { outputDir });
        console.log(`  ✓ Wrote CSV: ${csvResult.filePath}`);
        
      } catch (error) {
        console.error(`  ✗ Failed to process ${file}:`, error);
      }
    }
    
    console.log('\n✅ CSV conversion complete!');
    
  } catch (error) {
    console.error('Failed to convert files:', error);
    process.exit(1);
  }
}

// Run the converter
convertExcelToCSV();