/**
 * CSV Writer
 * 
 * Writes cleaned data to CSV files in /data_cleaned/ directory.
 * Handles UTF-8 encoding and proper escaping of fields.
 */

import { promises as fs } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import { CleanRow } from '../lib/data-contract.js';

/**
 * CSV writing configuration
 */
export interface CsvWriteConfig {
  /** Output directory for CSV files (default: /data_cleaned) */
  outputDir?: string;
  
  /** Whether to include header row (default: true) */
  includeHeader?: boolean;
  
  /** File encoding (default: utf8) */
  encoding?: BufferEncoding;
}

/**
 * Result of writing CSV file
 */
export interface CsvWriteResult {
  /** Path to the written CSV file */
  filePath: string;
  
  /** Number of rows written */
  rowsWritten: number;
  
  /** File size in bytes */
  fileSize: number;
}

/**
 * CSV column definition matching CleanRow schema
 */
const CSV_COLUMNS = [
  { id: 'ingested_date', title: 'ingested_date' },
  { id: 'genre', title: 'genre' },
  { id: 'asin', title: 'asin' },
  { id: 'title', title: 'title' },
  { id: 'author', title: 'author' },
  { id: 'author_url', title: 'author_url' },
  { id: 'series', title: 'series' },
  { id: 'price', title: 'price' },
  { id: 'rating', title: 'rating' },
  { id: 'review_count', title: 'review_count' },
  { id: 'rank_overall', title: 'rank_overall' },
  { id: 'release_date', title: 'release_date' },
  { id: 'publisher', title: 'publisher' },
  { id: 'blurb_text', title: 'blurb_text' },
  { id: 'cover_url', title: 'cover_url' },
  { id: 'product_url', title: 'product_url' },
  { id: 'topic_tags', title: 'topic_tags' },
  { id: 'subcategories', title: 'subcategories' },
  { id: 'blurb_keyphrases', title: 'blurb_keyphrases' },
  { id: 'estimated_pov', title: 'estimated_pov' },
  { id: 'has_supernatural', title: 'has_supernatural' },
  { id: 'has_romance', title: 'has_romance' },
  { id: 'cover_ok', title: 'cover_ok' },
];

/**
 * Writes clean rows to a CSV file
 * @param rows - Array of clean rows to write
 * @param filename - Base filename (e.g., "20250811_fantasy")
 * @param config - CSV writing configuration
 * @returns Promise resolving to write result
 */
export async function writeCsvFile(
  rows: CleanRow[],
  filename: string,
  config: CsvWriteConfig = {}
): Promise<CsvWriteResult> {
  const {
    outputDir = '/data_cleaned',
    includeHeader = true,
    encoding = 'utf8',
  } = config;
  
  // Ensure output directory exists
  await ensureDirectoryExists(outputDir);
  
  // Construct full file path
  const csvFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const filePath = path.join(outputDir, csvFilename);
  
  // Prepare rows for CSV writing (convert undefined to empty string)
  const csvRows = rows.map(row => sanitizeRowForCsv(row));
  
  // Create CSV writer with proper configuration
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: CSV_COLUMNS,
    encoding: encoding,
    // Ensure proper escaping of special characters
    fieldDelimiter: ',',
    recordDelimiter: '\n',
    headerIdDelimiter: undefined,
    alwaysQuote: false, // Only quote when necessary
  });
  
  // Write the data
  try {
    if (includeHeader) {
      await csvWriter.writeRecords(csvRows);
    } else {
      // Write without header by creating a temporary writer
      const noHeaderWriter = createObjectCsvWriter({
        path: filePath,
        header: CSV_COLUMNS.map(col => ({ id: col.id, title: col.id })),
        encoding: encoding,
        // Write data rows only (no header)
      });
      
      // Manually write rows without header
      const csvContent = csvRows.map(row => 
        CSV_COLUMNS.map(col => {
          const value = row[col.id as keyof CleanRow];
          return formatCsvValue(value);
        }).join(',')
      ).join('\n');
      
      await fs.writeFile(filePath, csvContent, encoding);
    }
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    return {
      filePath,
      rowsWritten: csvRows.length,
      fileSize: stats.size,
    };
    
  } catch (error) {
    throw new Error(`Failed to write CSV file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sanitizes a row for CSV output by handling undefined values and special characters
 * @param row - Clean row to sanitize
 * @returns Sanitized row suitable for CSV writing
 */
function sanitizeRowForCsv(row: CleanRow): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const column of CSV_COLUMNS) {
    const key = column.id as keyof CleanRow;
    let value = row[key];
    
    // Convert undefined to empty string
    if (value === undefined || value === null) {
      value = '';
    }
    
    // Convert boolean to string
    if (typeof value === 'boolean') {
      value = value.toString();
    }
    
    // Ensure numbers are properly formatted
    if (typeof value === 'number') {
      // Format with appropriate precision
      if (key === 'price' || key === 'rating') {
        value = value.toFixed(2);
      } else {
        value = value.toString();
      }
    }
    
    // Clean text fields
    if (typeof value === 'string') {
      // Remove or escape problematic characters
      value = value
        .replace(/\r\n/g, ' ')  // Replace line breaks with spaces
        .replace(/\n/g, ' ')    // Replace newlines with spaces
        .replace(/\r/g, ' ')    // Replace carriage returns with spaces
        .trim();
    }
    
    sanitized[key] = value;
  }
  
  return sanitized;
}

/**
 * Formats a single value for CSV output
 * @param value - Value to format
 * @returns Formatted string suitable for CSV
 */
function formatCsvValue(value: any): string {
  if (value === undefined || value === null) {
    return '';
  }
  
  const str = String(value);
  
  // Quote if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // Escape quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return str;
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath - Directory path to ensure exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Validates that a CSV file was written correctly
 * @param filePath - Path to CSV file to validate
 * @param expectedRows - Expected number of data rows
 * @returns Promise resolving to validation result
 */
export async function validateCsvFile(
  filePath: string, 
  expectedRows: number
): Promise<{ isValid: boolean; actualRows: number; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Check if file exists
    await fs.access(filePath);
    
    // Read file content
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    // Check header row
    if (lines.length === 0) {
      errors.push('CSV file is empty');
      return { isValid: false, actualRows: 0, errors };
    }
    
    const headerLine = lines[0];
    const expectedHeaders = CSV_COLUMNS.map(col => col.title);
    const actualHeaders = headerLine.split(',').map(h => h.replace(/"/g, '').trim());
    
    // Validate headers
    for (const expectedHeader of expectedHeaders) {
      if (!actualHeaders.includes(expectedHeader)) {
        errors.push(`Missing header: ${expectedHeader}`);
      }
    }
    
    // Check row count (subtract 1 for header)
    const actualRows = lines.length - 1;
    if (actualRows !== expectedRows) {
      errors.push(`Expected ${expectedRows} data rows, found ${actualRows}`);
    }
    
    return {
      isValid: errors.length === 0,
      actualRows,
      errors,
    };
    
  } catch (error) {
    errors.push(`Failed to validate CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, actualRows: 0, errors };
  }
}
