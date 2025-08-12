/**
 * MongoDB Upsert Operations
 * 
 * Handles syncing clean book data to MongoDB for backup and alternative querying.
 * Provides upsert operations to keep MongoDB in sync with DuckDB.
 */

import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';
import { CleanRow } from '../lib/data-contract.js';

/**
 * MongoDB connection and operations manager
 */
export class MongoManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<CleanRow> | null = null;
  private connectionUrl: string;
  private dbName: string;
  private collectionName: string;
  
  constructor(
    connectionUrl: string = 'mongodb://127.0.0.1:27017',
    dbName: string = 'ffa',
    collectionName: string = 'books'
  ) {
    this.connectionUrl = connectionUrl;
    this.dbName = dbName;
    this.collectionName = collectionName;
  }
  
  /**
   * Initializes MongoDB connection and creates indexes
   */
  async initialize(): Promise<void> {
    try {
      // Connection options for local development
      const options: MongoClientOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };
      
      // Create client and connect
      this.client = new MongoClient(this.connectionUrl, options);
      await this.client.connect();
      
      // Get database and collection references
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection<CleanRow>(this.collectionName);
      
      // Create indexes for efficient querying
      await this.createIndexes();
      
    } catch (error) {
      throw new Error(`Failed to initialize MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Creates indexes for efficient querying
   */
  private async createIndexes(): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }
    
    try {
      // Compound index for unique constraint
      await this.collection.createIndex(
        { ingested_date: 1, genre: 1, asin: 1 },
        { unique: true, name: 'unique_book_key' }
      );
      
      // Individual field indexes for common queries
      await this.collection.createIndex({ genre: 1 }, { name: 'idx_genre' });
      await this.collection.createIndex({ author: 1 }, { name: 'idx_author' });
      await this.collection.createIndex({ rating: -1 }, { name: 'idx_rating' });
      await this.collection.createIndex({ rank_overall: 1 }, { name: 'idx_rank' });
      await this.collection.createIndex({ ingested_date: -1 }, { name: 'idx_date' });
      await this.collection.createIndex({ price: 1 }, { name: 'idx_price' });
      
      // Text index for full-text search
      await this.collection.createIndex(
        { 
          title: 'text', 
          author: 'text', 
          blurb_text: 'text',
          blurb_keyphrases: 'text'
        },
        { name: 'text_search' }
      );
      
    } catch (error) {
      // Ignore errors if indexes already exist
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }
  
  /**
   * Upserts clean rows into MongoDB collection
   * @param rows - Clean rows to upsert
   * @param batchId - Identifier for this batch
   */
  async upsertRows(rows: CleanRow[], batchId: string): Promise<UpsertResult> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }
    
    if (rows.length === 0) {
      return { inserted: 0, updated: 0, errors: [] };
    }
    
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];
    
    try {
      // Process rows in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        // Use bulkWrite for efficient upserts
        const operations = batch.map(row => ({
          replaceOne: {
            filter: {
              ingested_date: row.ingested_date,
              genre: row.genre,
              asin: row.asin,
            },
            replacement: this.prepareDocumentForMongo(row),
            upsert: true,
          },
        }));
        
        const result = await this.collection.bulkWrite(operations);
        inserted += result.insertedCount;
        updated += result.modifiedCount;
      }
      
    } catch (error) {
      const errorMsg = `Failed to upsert batch ${batchId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
    }
    
    return { inserted, updated, errors };
  }
  
  /**
   * Prepares a CleanRow for MongoDB storage
   * @param row - Clean row to prepare
   * @returns Document ready for MongoDB insertion
   */
  private prepareDocumentForMongo(row: CleanRow): any {
    const doc: any = { ...row };
    
    // Convert date strings to Date objects for better querying
    if (doc.ingested_date) {
      doc.ingested_date = new Date(doc.ingested_date);
    }
    
    if (doc.release_date) {
      doc.release_date = new Date(doc.release_date);
    }
    
    // Parse JSON string arrays back to arrays for better querying
    if (doc.topic_tags && typeof doc.topic_tags === 'string') {
      try {
        doc.topic_tags = JSON.parse(doc.topic_tags);
      } catch {
        // Keep as string if parsing fails
      }
    }
    
    if (doc.subcategories && typeof doc.subcategories === 'string') {
      try {
        doc.subcategories = JSON.parse(doc.subcategories);
      } catch {
        // Keep as string if parsing fails
      }
    }
    
    // Add metadata
    doc._updated_at = new Date();
    
    return doc;
  }
  
  /**
   * Gets collection statistics
   */
  async getCollectionStats(): Promise<MongoStats> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }
    
    try {
      const totalBooks = await this.collection.countDocuments();
      
      const pipeline = [
        {
          $group: {
            _id: null,
            uniqueGenres: { $addToSet: '$genre' },
            uniqueAuthors: { $addToSet: '$author' },
            avgRating: { $avg: '$rating' },
            avgPrice: { $avg: '$price' },
            earliestDate: { $min: '$ingested_date' },
            latestDate: { $max: '$ingested_date' },
          }
        }
      ];
      
      const aggregateResult = await this.collection.aggregate(pipeline).toArray();
      const stats = aggregateResult[0] || {};
      
      return {
        totalBooks,
        uniqueGenres: stats.uniqueGenres?.length || 0,
        uniqueAuthors: stats.uniqueAuthors?.length || 0,
        avgRating: stats.avgRating || 0,
        avgPrice: stats.avgPrice || 0,
        earliestDate: stats.earliestDate,
        latestDate: stats.latestDate,
      };
      
    } catch (error) {
      throw new Error(`Failed to get collection stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Searches books by text query
   * @param query - Text to search for
   * @param limit - Maximum number of results
   */
  async searchBooks(query: string, limit: number = 50): Promise<CleanRow[]> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }
    
    try {
      const results = await this.collection
        .find(
          { $text: { $search: query } },
          { score: { $meta: 'textScore' } }
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .toArray();
      
      return results.map(doc => this.convertMongoDocToCleanRow(doc));
      
    } catch (error) {
      throw new Error(`Failed to search books: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Converts MongoDB document back to CleanRow format
   */
  private convertMongoDocToCleanRow(doc: any): CleanRow {
    const row: any = { ...doc };
    
    // Remove MongoDB-specific fields
    delete row._id;
    delete row._updated_at;
    
    // Convert dates back to strings
    if (row.ingested_date instanceof Date) {
      row.ingested_date = row.ingested_date.toISOString().split('T')[0];
    }
    
    if (row.release_date instanceof Date) {
      row.release_date = row.release_date.toISOString().split('T')[0];
    }
    
    // Convert arrays back to JSON strings to match CleanRow schema
    if (Array.isArray(row.topic_tags)) {
      row.topic_tags = JSON.stringify(row.topic_tags);
    }
    
    if (Array.isArray(row.subcategories)) {
      row.subcategories = JSON.stringify(row.subcategories);
    }
    
    return row as CleanRow;
  }
  
  /**
   * Closes MongoDB connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
    }
  }
  
  /**
   * Tests the MongoDB connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.initialize();
      }
      
      await this.client!.db('admin').command({ ping: 1 });
      return true;
      
    } catch (error) {
      return false;
    }
  }
}

/**
 * Result of upsert operation
 */
export interface UpsertResult {
  /** Number of documents inserted */
  inserted: number;
  
  /** Number of documents updated */
  updated: number;
  
  /** Any errors that occurred */
  errors: string[];
}

/**
 * MongoDB collection statistics
 */
export interface MongoStats {
  totalBooks: number;
  uniqueGenres: number;
  uniqueAuthors: number;
  avgRating: number;
  avgPrice: number;
  earliestDate?: Date;
  latestDate?: Date;
}
