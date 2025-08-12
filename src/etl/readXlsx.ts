/**
 * Excel File Reader
 * 
 * Reads and normalizes Excel files from /data_raw/ directory.
 * Handles hyperlink extraction and cell type coercion.
 */

import * as XLSX from 'xlsx';
import { RawExcelRow, EXCEL_COLUMNS_TO_EXTRACT } from '../lib/data-contract.js';

/**
 * Result of reading an Excel file
 */
export interface ExcelReadResult {
  /** Raw rows extracted from the Excel file */
  rows: RawExcelRow[];
  
  /** Total number of rows found (including header) */
  totalRows: number;
  
  /** Headers found in the Excel file */
  headers: string[];
  
  /** Any warnings during reading */
  warnings: string[];
}

/**
 * Reads a single Excel file and extracts data according to data contract
 * @param filePath - Absolute path to the Excel file
 * @returns Promise resolving to extracted data and metadata
 */
export async function readExcelFile(filePath: string): Promise<ExcelReadResult> {
  const warnings: string[] = [];
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath, {
      type: 'file',
      cellText: false,  // Get raw values
      cellDates: false, // Handle dates manually
      cellHTML: false,  // Don't convert to HTML
      cellNF: false,    // Don't format numbers
      cellStyles: true, // Keep styles for hyperlink detection
      sheetStubs: false, // Skip empty cells
    });
    
    // Get the first worksheet (assuming data is in the first sheet)
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      throw new Error('No worksheets found in Excel file');
    }
    
    const firstSheetName = sheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    if (sheetNames.length > 1) {
      warnings.push(`Multiple sheets found, using first sheet: ${firstSheetName}`);
    }
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use first row as headers
      raw: false, // Convert all values to strings initially
      defval: '',  // Default value for empty cells
    }) as string[][];
    
    if (jsonData.length === 0) {
      throw new Error('No data found in Excel worksheet');
    }
    
    // Extract headers from first row
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    // Find column indices for the fields we want to extract
    const columnMapping = mapColumnsToIndices(headers);
    
    // Check for missing required columns
    const missingColumns = EXCEL_COLUMNS_TO_EXTRACT.filter(
      col => !(col in columnMapping)
    );
    
    if (missingColumns.length > 0) {
      warnings.push(`Missing expected columns: ${missingColumns.join(', ')}`);
    }
    
    // Extract hyperlinks from cells (for Author field)
    const hyperlinks = extractHyperlinks(worksheet);
    
    // Process each data row
    const rows: RawExcelRow[] = dataRows.map((row, rowIndex) => {
      const processedRow: RawExcelRow = {};
      
      // Extract each field we care about
      for (const [columnName, columnIndex] of Object.entries(columnMapping)) {
        const cellValue = row[columnIndex] || '';
        let processedValue: any = cellValue;
        
        // Special handling for Author field - check for hyperlinks
        if (columnName === 'Author' && cellValue) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
          const hyperlink = hyperlinks[cellAddress];
          
          if (hyperlink) {
            // Format as markdown-style link
            processedValue = `[${cellValue}](${hyperlink})`;
          } else {
            processedValue = cellValue;
          }
        }
        
        // Clean and normalize the value
        if (typeof processedValue === 'string') {
          processedValue = processedValue.trim();
          // Convert empty strings to undefined for optional fields
          if (processedValue === '') {
            processedValue = undefined;
          }
        }
        
        processedRow[columnName as keyof RawExcelRow] = processedValue;
      }
      
      return processedRow;
    });
    
    return {
      rows,
      totalRows: jsonData.length,
      headers,
      warnings,
    };
    
  } catch (error) {
    throw new Error(`Failed to read Excel file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Maps Excel column headers to their indices
 * @param headers - Array of column headers from Excel
 * @returns Object mapping column names to their indices
 */
function mapColumnsToIndices(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  for (const columnName of EXCEL_COLUMNS_TO_EXTRACT) {
    // Find the index of this column (case-insensitive)
    const index = headers.findIndex(
      header => header.toLowerCase().trim() === columnName.toLowerCase()
    );
    
    if (index !== -1) {
      mapping[columnName] = index;
    }
  }
  
  return mapping;
}

/**
 * Extracts hyperlink information from Excel worksheet
 * @param worksheet - XLSX worksheet object
 * @returns Object mapping cell addresses to hyperlink URLs
 */
function extractHyperlinks(worksheet: XLSX.WorkSheet): Record<string, string> {
  const hyperlinks: Record<string, string> = {};
  
  // Check worksheet's hyperlink information
  if (worksheet['!links']) {
    for (const [cellAddress, linkInfo] of Object.entries(worksheet['!links'])) {
      if (typeof linkInfo === 'object' && linkInfo && 'Target' in linkInfo) {
        hyperlinks[cellAddress] = (linkInfo as any).Target;
      }
    }
  }
  
  // Also check individual cells for hyperlink information
  for (const cellAddress of Object.keys(worksheet)) {
    if (cellAddress.startsWith('!')) continue; // Skip metadata
    
    const cell = worksheet[cellAddress];
    if (cell && typeof cell === 'object' && 'l' in cell) {
      // 'l' property contains link information
      const linkInfo = (cell as any).l;
      if (linkInfo && linkInfo.Target) {
        hyperlinks[cellAddress] = linkInfo.Target;
      }
    }
  }
  
  return hyperlinks;
}

/**
 * Validates that a file exists and is an Excel file
 * @param filePath - Path to check
 * @returns True if file exists and appears to be Excel format
 */
export function isValidExcelFile(filePath: string): boolean {
  try {
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    // Check file extension
    const validExtensions = ['.xlsx', '.xls', '.xlsm'];
    const hasValidExtension = validExtensions.some(ext => 
      filePath.toLowerCase().endsWith(ext)
    );
    
    return hasValidExtension;
  } catch {
    return false;
  }
}
