/**
 * DuckDB Database Operations
 * 
 * Creates and manages DuckDB database for fast querying of book data.
 * Handles schema creation, data loading, and idempotent upsert operations.
 */

import { Database, Connection } from 'duckdb';
import { promises as fs } from 'fs';
import path from 'path';
import { CleanRow } from '../lib/data-contract.js';

/**
 * DuckDB connection and operations manager
 */
export class DuckDBManager {
  private db: Database | null = null;
  private connection: Connection | null = null;
  private dbPath: string;
  
  constructor(dbPath: string = './data/library.duckdb') {
    this.dbPath = dbPath;
  }
  
  /**
   * Initializes database connection and creates tables if needed
   */
  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dbDir = path.dirname(this.dbPath);
      await this.ensureDirectoryExists(dbDir);
      
      // Create database instance
      this.db = new Database(this.dbPath);
      
      // Get connection
      this.connection = await new Promise<Connection>((resolve, reject) => {
        this.db!.connect((err, connection) => {
          if (err) reject(err);
          else resolve(connection);
        });
      });
      
      // Create schema
      await this.createSchema();
      
    } catch (error) {
      throw new Error(`Failed to initialize DuckDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Creates the books table with appropriate schema
   */
  private async createSchema(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS books_clean (
        ingested_date DATE NOT NULL,
        genre VARCHAR NOT NULL,
        asin VARCHAR NOT NULL,
        title VARCHAR NOT NULL,
        author VARCHAR NOT NULL,
        author_url VARCHAR,
        series VARCHAR,
        price DOUBLE,
        rating DOUBLE,
        review_count INTEGER,
        rank_overall INTEGER,
        release_date DATE,
        publisher VARCHAR,
        blurb_text TEXT,
        cover_url VARCHAR,
        product_url VARCHAR,
        topic_tags VARCHAR, -- JSON array as string
        subcategories VARCHAR, -- JSON array as string
        blurb_keyphrases TEXT,
        estimated_pov VARCHAR,
        has_supernatural BOOLEAN,
        has_romance BOOLEAN,
        cover_ok BOOLEAN DEFAULT FALSE,
        
        -- Primary key constraint
        PRIMARY KEY (ingested_date, genre, asin)
      );
    `;
    
    // Create indexes for common queries
    const createIndexesSQL = [
      'CREATE INDEX IF NOT EXISTS idx_books_genre ON books_clean(genre);',
      'CREATE INDEX IF NOT EXISTS idx_books_author ON books_clean(author);',
      'CREATE INDEX IF NOT EXISTS idx_books_rating ON books_clean(rating);',
      'CREATE INDEX IF NOT EXISTS idx_books_rank ON books_clean(rank_overall);',
      'CREATE INDEX IF NOT EXISTS idx_books_date ON books_clean(ingested_date);',
      'CREATE INDEX IF NOT EXISTS idx_books_price ON books_clean(price);',
    ];
    
    try {
      await this.executeQuery(createTableSQL);
      
      for (const indexSQL of createIndexesSQL) {
        await this.executeQuery(indexSQL);
      }
      
    } catch (error) {
      throw new Error(`Failed to create schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Loads clean rows into DuckDB using idempotent upsert strategy
   * @param rows - Clean rows to load
   * @param batchId - Identifier for this batch (usually filename)
   */
  async loadRows(rows: CleanRow[], batchId: string): Promise<LoadResult> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }
    
    if (rows.length === 0) {
      return { rowsInserted: 0, rowsUpdated: 0, rowsSkipped: 0 };
    }
    
    try {
      // Create temporary table for this batch
      const tempTableName = `temp_books_${Date.now()}`;
      await this.createTempTable(tempTableName);
      
      // Insert batch data into temp table
      await this.insertIntoTempTable(tempTableName, rows);
      
      // Perform upsert operation
      const result = await this.upsertFromTempTable(tempTableName);
      
      // Clean up temp table
      await this.executeQuery(`DROP TABLE ${tempTableName};`);
      
      return result;
      
    } catch (error) {
      throw new Error(`Failed to load rows for batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Creates a temporary table with the same schema as books table
   */
  private async createTempTable(tableName: string): Promise<void> {
    const createTempSQL = `
      CREATE TEMPORARY TABLE ${tableName} AS 
      SELECT * FROM books_clean WHERE 1=0; -- Copy structure but no data
    `;
    
    await this.executeQuery(createTempSQL);
  }
  
  /**
   * Inserts rows into temporary table
   */
  private async insertIntoTempTable(tableName: string, rows: CleanRow[]): Promise<void> {
    // Prepare batch insert with parameterized query
    const placeholders = rows.map(() => 
      '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).join(', ');
    
    const insertSQL = `
      INSERT INTO ${tableName} (
        ingested_date, genre, asin, title, author, author_url, series,
        price, rating, review_count, rank_overall, release_date, publisher,
        blurb_text, cover_url, product_url, topic_tags, subcategories,
        blurb_keyphrases, estimated_pov, has_supernatural, has_romance, cover_ok
      ) VALUES ${placeholders};
    `;
    
    // Flatten all row values into single array
    const values = rows.flatMap(row => [
      row.ingested_date,
      row.genre,
      row.asin,
      row.title,
      row.author,
      row.author_url || null,
      row.series || null,
      row.price || null,
      row.rating || null,
      row.review_count || null,
      row.rank_overall || null,
      row.release_date || null,
      row.publisher || null,
      row.blurb_text || null,
      row.cover_url || null,
      row.product_url || null,
      row.topic_tags || null,
      row.subcategories || null,
      row.blurb_keyphrases || null,
      row.estimated_pov || null,
      row.has_supernatural || null,
      row.has_romance || null,
      row.cover_ok || false,
    ]);
    
    await this.executeQuery(insertSQL, values);
  }
  
  /**
   * Performs upsert from temporary table to main books table
   */
  private async upsertFromTempTable(tempTableName: string): Promise<LoadResult> {
    // First, update existing records
    const updateSQL = `
      UPDATE books 
      SET 
        title = temp.title,
        author = temp.author,
        author_url = temp.author_url,
        series = temp.series,
        price = temp.price,
        rating = temp.rating,
        review_count = temp.review_count,
        rank_overall = temp.rank_overall,
        release_date = temp.release_date,
        publisher = temp.publisher,
        blurb_text = temp.blurb_text,
        cover_url = temp.cover_url,
        product_url = temp.product_url,
        topic_tags = temp.topic_tags,
        subcategories = temp.subcategories,
        blurb_keyphrases = temp.blurb_keyphrases,
        estimated_pov = temp.estimated_pov,
        has_supernatural = temp.has_supernatural,
        has_romance = temp.has_romance
      FROM ${tempTableName} temp
      WHERE books.ingested_date = temp.ingested_date 
        AND books.genre = temp.genre 
        AND books.asin = temp.asin;
    `;
    
    const updateResult = await this.executeQuery(updateSQL);
    const rowsUpdated = updateResult.changes || 0;
    
    // Then, insert new records
    const insertSQL = `
      INSERT INTO books 
      SELECT temp.* 
      FROM ${tempTableName} temp
      WHERE NOT EXISTS (
        SELECT 1 FROM books 
        WHERE books.ingested_date = temp.ingested_date 
          AND books.genre = temp.genre 
          AND books.asin = temp.asin
      );
    `;
    
    const insertResult = await this.executeQuery(insertSQL);
    const rowsInserted = insertResult.changes || 0;
    
    return {
      rowsInserted,
      rowsUpdated,
      rowsSkipped: 0, // Calculate if needed
    };
  }
  
  /**
   * Executes a SQL query with optional parameters
   */
  private async executeQuery(sql: string, params: any[] = []): Promise<any> {
    if (!this.connection) {
      throw new Error('Database connection not established');
    }
    
    return new Promise((resolve, reject) => {
      if (params.length > 0) {
        this.connection!.all(sql, params, (err: Error | null, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      } else {
        this.connection!.all(sql, (err: Error | null, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      }
    });
  }
  
  /**
   * Gets statistics about the books table
   */
  async getTableStats(): Promise<TableStats> {
    const statsSQL = `
      SELECT 
        COUNT(*) as total_books,
        COUNT(DISTINCT genre) as unique_genres,
        COUNT(DISTINCT author) as unique_authors,
        MIN(ingested_date) as earliest_date,
        MAX(ingested_date) as latest_date,
        AVG(rating) as avg_rating,
        AVG(price) as avg_price
      FROM books;
    `;
    
    const result = await this.executeQuery(statsSQL);
    return result[0] || {};
  }
  
  /**
   * Closes database connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      await new Promise<void>((resolve, reject) => {
        this.connection!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.connection = null;
    }
    
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        this.db!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.db = null;
    }
  }
  
  /**
   * Ensures directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}

/**
 * Result of loading data into DuckDB
 */
export interface LoadResult {
  /** Number of new rows inserted */
  rowsInserted: number;
  
  /** Number of existing rows updated */
  rowsUpdated: number;
  
  /** Number of rows skipped (duplicates) */
  rowsSkipped: number;
}

/**
 * Database statistics
 */
export interface TableStats {
  total_books?: number;
  unique_genres?: number;
  unique_authors?: number;
  earliest_date?: string;
  latest_date?: string;
  avg_rating?: number;
  avg_price?: number;
}
