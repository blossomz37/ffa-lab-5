/**
 * Data Transformation and Validation
 * 
 * Transforms raw Excel data into clean, validated rows according to data contract.
 * Handles type coercion, field mapping, and validation using data-contract rules.
 */

import { 
  RawExcelRow, 
  CleanRow, 
  ValidationResult, 
  FilenameInfo,
  validateRow 
} from '../lib/data-contract.js';

/**
 * Result of transforming a batch of raw rows
 */
export interface TransformResult {
  /** Successfully validated and cleaned rows */
  validRows: CleanRow[];
  
  /** Rows that failed validation with reasons */
  rejectedRows: RejectedRow[];
  
  /** Summary statistics */
  stats: TransformStats;
}

/**
 * Information about a rejected row
 */
export interface RejectedRow {
  /** Original row number (1-based, including header) */
  lineNumber: number;
  
  /** Raw data that failed validation */
  rawData: RawExcelRow;
  
  /** List of validation errors */
  errors: string[];
}

/**
 * Statistics from transformation process
 */
export interface TransformStats {
  /** Total rows processed */
  totalProcessed: number;
  
  /** Number of valid rows */
  validCount: number;
  
  /** Number of rejected rows */
  rejectedCount: number;
  
  /** Success rate as percentage */
  successRate: number;
}

/**
 * Transforms an array of raw Excel rows into validated clean rows
 * @param rawRows - Raw rows from Excel file
 * @param fileInfo - Parsed filename information (date, genre)
 * @returns Transform result with valid/rejected rows and stats
 */
export function transformRows(
  rawRows: RawExcelRow[], 
  fileInfo: FilenameInfo
): TransformResult {
  const validRows: CleanRow[] = [];
  const rejectedRows: RejectedRow[] = [];
  
  // Process each row with validation
  rawRows.forEach((rawRow, index) => {
    const lineNumber = index + 2; // +2 because: 0-based index + skip header row
    
    try {
      // Validate and transform the row using data contract
      const validationResult: ValidationResult = validateRow(rawRow, fileInfo);
      
      if (validationResult.ok && validationResult.row) {
        validRows.push(validationResult.row);
      } else {
        // Collect validation errors
        const errors = validationResult.errors || ['Unknown validation error'];
        rejectedRows.push({
          lineNumber,
          rawData: rawRow,
          errors,
        });
      }
    } catch (error) {
      // Handle unexpected errors during validation
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unexpected error during validation';
      
      rejectedRows.push({
        lineNumber,
        rawData: rawRow,
        errors: [errorMessage],
      });
    }
  });
  
  // Calculate statistics
  const totalProcessed = rawRows.length;
  const validCount = validRows.length;
  const rejectedCount = rejectedRows.length;
  const successRate = totalProcessed > 0 
    ? Math.round((validCount / totalProcessed) * 100) 
    : 0;
  
  const stats: TransformStats = {
    totalProcessed,
    validCount,
    rejectedCount,
    successRate,
  };
  
  return {
    validRows,
    rejectedRows,
    stats,
  };
}

/**
 * Filters and deduplicates clean rows based on unique key (date + genre + ASIN)
 * @param rows - Array of clean rows to deduplicate
 * @returns Deduplicated rows with duplicate information
 */
export function deduplicateRows(rows: CleanRow[]): {
  uniqueRows: CleanRow[];
  duplicates: Array<{ row: CleanRow; originalKey: string }>;
} {
  const seenKeys = new Set<string>();
  const uniqueRows: CleanRow[] = [];
  const duplicates: Array<{ row: CleanRow; originalKey: string }> = [];
  
  for (const row of rows) {
    // Create unique key from date + genre + ASIN
    const uniqueKey = `${row.ingested_date}|${row.genre}|${row.asin}`;
    
    if (seenKeys.has(uniqueKey)) {
      duplicates.push({ row, originalKey: uniqueKey });
    } else {
      seenKeys.add(uniqueKey);
      uniqueRows.push(row);
    }
  }
  
  return { uniqueRows, duplicates };
}

/**
 * Applies additional business rules and data enrichment
 * @param rows - Array of validated clean rows
 * @returns Enhanced rows with additional computed fields
 */
export function enrichRows(rows: CleanRow[]): CleanRow[] {
  return rows.map(row => {
    const enrichedRow = { ...row };
    
    // Normalize price display (ensure 2 decimal places for display)
    if (enrichedRow.price !== undefined) {
      enrichedRow.price = Math.round(enrichedRow.price * 100) / 100;
    }
    
    // Normalize rating (ensure max 1 decimal place)
    if (enrichedRow.rating !== undefined) {
      enrichedRow.rating = Math.round(enrichedRow.rating * 10) / 10;
    }
    
    // Ensure review count is integer
    if (enrichedRow.review_count !== undefined) {
      enrichedRow.review_count = Math.floor(enrichedRow.review_count);
    }
    
    // Clean up text fields (remove extra whitespace, normalize unicode)
    if (enrichedRow.title) {
      enrichedRow.title = normalizeText(enrichedRow.title);
    }
    
    if (enrichedRow.author) {
      enrichedRow.author = normalizeText(enrichedRow.author);
    }
    
    if (enrichedRow.series) {
      enrichedRow.series = normalizeText(enrichedRow.series);
    }
    
    if (enrichedRow.publisher) {
      enrichedRow.publisher = normalizeText(enrichedRow.publisher);
    }
    
    // Truncate very long text fields to reasonable limits
    if (enrichedRow.blurb_text && enrichedRow.blurb_text.length > 5000) {
      enrichedRow.blurb_text = enrichedRow.blurb_text.substring(0, 5000) + '...';
    }
    
    return enrichedRow;
  });
}

/**
 * Normalizes text by removing extra whitespace and normalizing unicode
 * @param text - Text to normalize
 * @returns Normalized text
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .normalize('NFC');    // Normalize unicode to canonical form
}

/**
 * Creates a human-readable summary of transformation results
 * @param result - Transform result to summarize
 * @param filename - Original filename for context
 * @returns Summary string for logging
 */
export function createTransformSummary(
  result: TransformResult, 
  filename: string
): string {
  const { stats, rejectedRows } = result;
  
  let summary = `Transform Summary for ${filename}:\n`;
  summary += `  Total rows processed: ${stats.totalProcessed}\n`;
  summary += `  Valid rows: ${stats.validCount}\n`;
  summary += `  Rejected rows: ${stats.rejectedCount}\n`;
  summary += `  Success rate: ${stats.successRate}%\n`;
  
  if (rejectedRows.length > 0) {
    summary += `\nRejected rows:\n`;
    rejectedRows.forEach(rejected => {
      summary += `  Line ${rejected.lineNumber}: ${rejected.errors.join(', ')}\n`;
    });
  }
  
  return summary;
}
