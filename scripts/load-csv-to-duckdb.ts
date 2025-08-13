#!/usr/bin/env node

/**
 * Load CSV files directly into DuckDB
 * This bypasses the ETL pipeline issues and directly creates the database
 */

import { Database } from 'duckdb';
import { promises as fs } from 'fs';
import path from 'path';

async function loadCSVsToDuckDB() {
  const dbPath = './books.duckdb';
  const csvDir = './data_cleaned';
  
  console.log('🦆 Loading CSV files into DuckDB...');
  
  // Create new database connection
  const db = new Database(dbPath);
  
  const connection = await new Promise<any>((resolve, reject) => {
    db.connect((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });

  try {
    // Create the books_clean table
    console.log('📋 Creating books_clean table...');
    await new Promise<void>((resolve, reject) => {
      connection.run(`
        CREATE TABLE IF NOT EXISTS books_clean (
          ingested_date DATE,
          genre VARCHAR,
          asin VARCHAR,
          title VARCHAR,
          author VARCHAR,
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
          topic_tags VARCHAR,
          subcategories VARCHAR,
          blurb_keyphrases TEXT,
          estimated_pov VARCHAR,
          has_supernatural BOOLEAN,
          has_romance BOOLEAN,
          cover_ok BOOLEAN,
          PRIMARY KEY (ingested_date, genre, asin)
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get all CSV files
    const files = await fs.readdir(csvDir);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    console.log(`📁 Found ${csvFiles.length} CSV files to load`);

    // Load each CSV file
    for (const csvFile of csvFiles) {
      const csvPath = path.join(csvDir, csvFile);
      console.log(`  Loading ${csvFile}...`);
      
      // First, create a temp table from CSV
      await new Promise<void>((resolve, reject) => {
        connection.run(`
          CREATE TEMP TABLE temp_csv AS 
          SELECT * FROM read_csv_auto('${csvPath}', header=true);
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Insert into main table (ignore duplicates)
      await new Promise<void>((resolve, reject) => {
        connection.run(`
          INSERT OR IGNORE INTO books_clean 
          SELECT * FROM temp_csv;
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Drop temp table
      await new Promise<void>((resolve, reject) => {
        connection.run(`DROP TABLE temp_csv;`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log(`  ✓ Loaded ${csvFile}`);
    }

    // Create indexes
    console.log('🔍 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_books_genre ON books_clean(genre);',
      'CREATE INDEX IF NOT EXISTS idx_books_author ON books_clean(author);',
      'CREATE INDEX IF NOT EXISTS idx_books_rating ON books_clean(rating);',
      'CREATE INDEX IF NOT EXISTS idx_books_rank ON books_clean(rank_overall);',
      'CREATE INDEX IF NOT EXISTS idx_books_date ON books_clean(ingested_date);',
      'CREATE INDEX IF NOT EXISTS idx_books_price ON books_clean(price);',
    ];

    for (const indexSql of indexes) {
      await new Promise<void>((resolve, reject) => {
        connection.run(indexSql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Count total rows
    const count = await new Promise<number>((resolve, reject) => {
      connection.all('SELECT COUNT(*) as count FROM books_clean', (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    });

    console.log(`\n✅ Successfully loaded ${count} books into DuckDB!`);
    console.log(`📍 Database location: ${path.resolve(dbPath)}`);
    
  } catch (error) {
    console.error('❌ Error loading data:', error);
  } finally {
    connection.close();
    db.close();
  }
}

// Run the loader
loadCSVsToDuckDB();