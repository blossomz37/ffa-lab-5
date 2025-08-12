/**
 * ETL Pipeline Orchestrator
 * 
 * Coordinates the complete ETL process: Excel → CSV → DuckDB → MongoDB
 * Handles file discovery, logging, error handling, and CLI argument parsing.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parseFilename, FilenameInfo } from '../lib/data-contract.js';
import { readExcelFile, isValidExcelFile } from './readXlsx.js';
import { transformRows, deduplicateRows, enrichRows, createTransformSummary } from './transform.js';
import { writeCsvFile } from './writeCsv.js';
import { DuckDBManager } from './loadDuckDb.js';
import { MongoManager } from './upsertMongo.js';
import { validateCoverImages } from './imageValidation.js';

/**
 * ETL configuration options
 */
export interface ETLConfig {
  /** Input directory for Excel files */
  inputDir?: string;
  
  /** Output directory for CSV files */
  outputDir?: string;
  
  /** Log directory for ETL logs */
  logDir?: string;
  
  /** DuckDB database file path */
  duckDbPath?: string;
  
  /** MongoDB connection URL */
  mongoUrl?: string;
  
  /** MongoDB database name */
  mongoDbName?: string;
  
  /** Whether to skip MongoDB sync */
  skipMongo?: boolean;
  
  /** Whether to force reprocess all files */
  forceReprocess?: boolean;
  
  /** Specific files to process (if not provided, processes all) */
  specificFiles?: string[];
}

/**
 * Result of processing a single file
 */
export interface FileProcessResult {
  /** Source Excel file path */
  filePath: string;
  
  /** Parsed filename information */
  fileInfo: FilenameInfo;
  
  /** Whether processing was successful */
  success: boolean;
  
  /** Number of rows processed */
  rowsProcessed: number;
  
  /** Number of valid rows */
  validRows: number;
  
  /** Number of rejected rows */
  rejectedRows: number;
  
  /** CSV file path (if successful) */
  csvPath?: string;
  
  /** DuckDB load result */
  duckDbResult?: { inserted: number; updated: number };
  
  /** MongoDB upsert result */
  mongoResult?: { inserted: number; updated: number };
  
  /** Any errors that occurred */
  errors: string[];
  
  /** Processing duration in milliseconds */
  duration: number;
}

/**
 * Overall ETL run result
 */
export interface ETLRunResult {
  /** Results for each file processed */
  fileResults: FileProcessResult[];
  
  /** Overall statistics */
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalRowsProcessed: number;
    totalValidRows: number;
    totalRejectedRows: number;
    totalDuration: number;
  };
}

/**
 * Main ETL runner class
 */
export class ETLRunner {
  private config: Required<ETLConfig>;
  private duckDb: DuckDBManager;
  private mongo: MongoManager | null = null;
  
  constructor(config: ETLConfig = {}) {
    // Set default configuration
    this.config = {
      inputDir: config.inputDir || './data_raw',
      outputDir: config.outputDir || './data_cleaned',
      logDir: config.logDir || './logs',
      duckDbPath: config.duckDbPath || './books.duckdb',
      mongoUrl: config.mongoUrl || 'mongodb://127.0.0.1:27017',
      mongoDbName: config.mongoDbName || 'ffa',
      skipMongo: config.skipMongo || false,
      forceReprocess: config.forceReprocess || false,
      specificFiles: config.specificFiles || [],
    };
    
    // Initialize database managers
    this.duckDb = new DuckDBManager(this.config.duckDbPath);
    
    if (!this.config.skipMongo) {
      this.mongo = new MongoManager(this.config.mongoUrl, this.config.mongoDbName);
    }
  }
  
  /**
   * Runs the complete ETL process
   */
  async run(): Promise<ETLRunResult> {
    const startTime = Date.now();
    console.log('🚀 Starting ETL pipeline...');
    
    try {
      // Initialize database connections
      await this.initializeDatabases();
      
      // Discover Excel files to process
      const filesToProcess = await this.discoverFiles();
      console.log(`📁 Found ${filesToProcess.length} Excel files to process`);
      
      if (filesToProcess.length === 0) {
        console.log('⚠️  No Excel files found to process');
        return this.createEmptyResult();
      }
      
      // Ensure output directories exist
      await this.ensureDirectoriesExist();
      
      // Process each file
      const fileResults: FileProcessResult[] = [];
      for (const filePath of filesToProcess) {
        const result = await this.processFile(filePath);
        fileResults.push(result);
        
        // Log progress
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${path.basename(filePath)} - ${result.validRows}/${result.rowsProcessed} rows (${result.duration}ms)`);
      }
      
      // Create summary
      const summary = this.createSummary(fileResults, Date.now() - startTime);
      
      // Log final summary
      this.logSummary(summary);
      
      return { fileResults, summary };
      
    } catch (error) {
      console.error('💥 ETL pipeline failed:', error);
      throw error;
    } finally {
      // Clean up database connections
      await this.cleanup();
    }
  }
  
  /**
   * Initializes database connections
   */
  private async initializeDatabases(): Promise<void> {
    console.log('🔗 Initializing database connections...');
    
    try {
      await this.duckDb.initialize();
      console.log('✅ DuckDB initialized');
      
      if (this.mongo) {
        await this.mongo.initialize();
        console.log('✅ MongoDB initialized');
      }
    } catch (error) {
      throw new Error(`Failed to initialize databases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Discovers Excel files to process
   */
  private async discoverFiles(): Promise<string[]> {
    try {
      // If specific files are provided, use those
      if (this.config.specificFiles.length > 0) {
        return this.config.specificFiles.map(file => 
          path.isAbsolute(file) ? file : path.join(this.config.inputDir, file)
        );
      }
      
      // Otherwise, scan input directory
      const files = await fs.readdir(this.config.inputDir);
      const excelFiles = files
        .filter(file => file.includes('_raw_data.xlsx'))
        .map(file => path.join(this.config.inputDir, file))
        .filter(filePath => isValidExcelFile(filePath));
      
      return excelFiles.sort(); // Process in consistent order
      
    } catch (error) {
      throw new Error(`Failed to discover files in ${this.config.inputDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Processes a single Excel file through the complete ETL pipeline
   */
  private async processFile(filePath: string): Promise<FileProcessResult> {
    const startTime = Date.now();
    const filename = path.basename(filePath);
    const errors: string[] = [];
    
    try {
      console.log(`📖 Processing ${filename}...`);
      
      // Parse filename to get date and genre info
      const fileInfo = parseFilename(filename);
      
      // Step 1: Read Excel file
      const excelResult = await readExcelFile(filePath);
      if (excelResult.warnings.length > 0) {
        errors.push(...excelResult.warnings);
      }
      
      // Step 2: Transform and validate rows
      const transformResult = transformRows(excelResult.rows, fileInfo);
      
      // Step 3: Deduplicate and enrich
      const { uniqueRows } = deduplicateRows(transformResult.validRows);
      const enrichedRows = enrichRows(uniqueRows);
      
      // Step 4: Validate cover images
      console.log(`🖼️  Validating cover images for ${filename}...`);
      const rowsWithValidatedImages = await validateCoverImages(enrichedRows);
      
      // Step 5: Write CSV
      const csvFilename = `${fileInfo.date.replace(/-/g, '')}_${fileInfo.genreKey}.csv`;
      const csvResult = await writeCsvFile(rowsWithValidatedImages, csvFilename, {
        outputDir: this.config.outputDir,
      });
      
      // Step 6: Load into DuckDB
      const duckDbResult = await this.duckDb.loadRows(rowsWithValidatedImages, filename);
      
      // Step 7: Upsert to MongoDB (if enabled)
      let mongoResult;
      if (this.mongo) {
        const mongoUpsertResult = await this.mongo.upsertRows(rowsWithValidatedImages, filename);
        errors.push(...mongoUpsertResult.errors);
        mongoResult = {
          inserted: mongoUpsertResult.inserted,
          updated: mongoUpsertResult.updated,
        };
      }
      
      // Step 8: Write log file
      await this.writeLogFile(fileInfo, transformResult, filename);
      
      return {
        filePath,
        fileInfo,
        success: true,
        rowsProcessed: transformResult.stats.totalProcessed,
        validRows: transformResult.stats.validCount,
        rejectedRows: transformResult.stats.rejectedCount,
        csvPath: csvResult.filePath,
        duckDbResult: {
          inserted: duckDbResult.rowsInserted,
          updated: duckDbResult.rowsUpdated,
        },
        mongoResult,
        errors,
        duration: Date.now() - startTime,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      return {
        filePath,
        fileInfo: parseFilename(filename), // Best effort
        success: false,
        rowsProcessed: 0,
        validRows: 0,
        rejectedRows: 0,
        errors,
        duration: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Writes detailed log file for processing results
   */
  private async writeLogFile(
    fileInfo: FilenameInfo,
    transformResult: any,
    filename: string
  ): Promise<void> {
    const logFilename = `${fileInfo.date.replace(/-/g, '')}_${fileInfo.genreKey}.log`;
    const logPath = path.join(this.config.logDir, logFilename);
    
    const logContent = [
      `ETL Log for ${filename}`,
      `Generated: ${new Date().toISOString()}`,
      `Genre: ${fileInfo.genreName}`,
      `Date: ${fileInfo.date}`,
      '',
      createTransformSummary(transformResult, filename),
    ].join('\n');
    
    await fs.writeFile(logPath, logContent, 'utf8');
  }
  
  /**
   * Ensures all required directories exist
   */
  private async ensureDirectoriesExist(): Promise<void> {
    const dirs = [this.config.outputDir, this.config.logDir];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }
  
  /**
   * Creates summary statistics
   */
  private createSummary(fileResults: FileProcessResult[], totalDuration: number) {
    const successfulFiles = fileResults.filter(r => r.success).length;
    const failedFiles = fileResults.length - successfulFiles;
    
    const totalRowsProcessed = fileResults.reduce((sum, r) => sum + r.rowsProcessed, 0);
    const totalValidRows = fileResults.reduce((sum, r) => sum + r.validRows, 0);
    const totalRejectedRows = fileResults.reduce((sum, r) => sum + r.rejectedRows, 0);
    
    return {
      totalFiles: fileResults.length,
      successfulFiles,
      failedFiles,
      totalRowsProcessed,
      totalValidRows,
      totalRejectedRows,
      totalDuration,
    };
  }
  
  /**
   * Logs final summary
   */
  private logSummary(summary: any): void {
    console.log('\n📊 ETL Pipeline Summary:');
    console.log(`   Files processed: ${summary.totalFiles}`);
    console.log(`   Successful: ${summary.successfulFiles}`);
    console.log(`   Failed: ${summary.failedFiles}`);
    console.log(`   Total rows: ${summary.totalRowsProcessed}`);
    console.log(`   Valid rows: ${summary.totalValidRows}`);
    console.log(`   Rejected rows: ${summary.totalRejectedRows}`);
    console.log(`   Success rate: ${Math.round((summary.totalValidRows / summary.totalRowsProcessed) * 100)}%`);
    console.log(`   Duration: ${(summary.totalDuration / 1000).toFixed(1)}s`);
    console.log('\n🎉 ETL pipeline completed!');
  }
  
  /**
   * Creates empty result for when no files are found
   */
  private createEmptyResult(): ETLRunResult {
    return {
      fileResults: [],
      summary: {
        totalFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        totalRowsProcessed: 0,
        totalValidRows: 0,
        totalRejectedRows: 0,
        totalDuration: 0,
      },
    };
  }
  
  /**
   * Cleans up database connections
   */
  private async cleanup(): Promise<void> {
    try {
      await this.duckDb.close();
      if (this.mongo) {
        await this.mongo.close();
      }
    } catch (error) {
      console.warn('Warning: Error during cleanup:', error);
    }
  }
}

/**
 * Parses command line arguments for ETL configuration
 */
export function parseETLArgs(args: string[]): ETLConfig {
  const config: ETLConfig = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--input-dir':
        config.inputDir = args[++i];
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--skip-mongo':
        config.skipMongo = true;
        break;
      case '--force':
        config.forceReprocess = true;
        break;
      case '--files':
        config.specificFiles = args[++i].split(',');
        break;
      case '--help':
        console.log(`
ETL Pipeline Usage:
  --input-dir <path>     Input directory for Excel files (default: /data_raw)
  --output-dir <path>    Output directory for CSV files (default: /data_cleaned)
  --skip-mongo           Skip MongoDB synchronization
  --force                Force reprocess all files
  --files <list>         Comma-separated list of specific files to process
  --help                 Show this help message
        `);
        process.exit(0);
    }
  }
  
  return config;
}
