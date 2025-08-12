#!/usr/bin/env node
/**
 * Quick database setup script for testing Phase 5 API
 * Creates minimal tables with sample data
 */

import Database from 'duckdb';
import path from 'path';

async function setupTestDatabase() {
  const dbPath = path.join(process.cwd(), 'books.duckdb');
  const db = new Database.Database(dbPath);
  const conn = db.connect();

  console.log('🚀 Setting up test database...');

  // Create tables
  await query(conn, `
    CREATE TABLE IF NOT EXISTS books_raw (
      ingested_date VARCHAR,
      genre VARCHAR,
      asin VARCHAR PRIMARY KEY,
      title VARCHAR,
      author VARCHAR,
      author_url VARCHAR,
      series VARCHAR,
      price DOUBLE,
      rating DOUBLE,
      review_count INTEGER,
      rank_overall INTEGER,
      release_date VARCHAR,
      publisher VARCHAR,
      blurb_text TEXT,
      cover_url VARCHAR,
      product_url VARCHAR,
      topic_tags TEXT,
      subcategories VARCHAR,
      has_supernatural BOOLEAN,
      has_romance BOOLEAN
    )
  `);

  await query(conn, `
    CREATE TABLE IF NOT EXISTS books_clean AS SELECT * FROM books_raw WHERE FALSE
  `);

  // Insert sample data
  const sampleBooks = [
    {
      ingested_date: '2025-08-11',
      genre: 'Fantasy',
      asin: 'B001',
      title: 'Dragon Wizard Supreme',
      author: 'Jane Fantasy',
      author_url: 'https://amazon.com/author/jane',
      series: 'Dragon Magic Series',
      price: 9.99,
      rating: 4.5,
      review_count: 250,
      rank_overall: 1500,
      release_date: '2025-08-01',
      publisher: 'Fantasy Books Inc',
      blurb_text: 'An epic fantasy adventure with dragons and magic.',
      cover_url: 'https://example.com/cover1.jpg',
      product_url: 'https://amazon.com/dp/B001',
      topic_tags: '["fantasy", "magic", "dragons"]',
      subcategories: 'Epic Fantasy',
      has_supernatural: true,
      has_romance: false,
    },
    {
      ingested_date: '2025-08-11',
      genre: 'Romance',
      asin: 'B002',
      title: 'Love in Paris',
      author: 'Sarah Romance',
      author_url: 'https://amazon.com/author/sarah',
      series: null,
      price: 3.99,
      rating: 4.8,
      review_count: 1200,
      rank_overall: 800,
      release_date: '2025-07-15',
      publisher: 'Romance Publishers',
      blurb_text: 'A contemporary romance set in the beautiful city of Paris.',
      cover_url: 'https://example.com/cover2.jpg',
      product_url: 'https://amazon.com/dp/B002',
      topic_tags: '["romance", "paris", "contemporary"]',
      subcategories: 'Contemporary Romance',
      has_supernatural: false,
      has_romance: true,
    },
    {
      ingested_date: '2025-08-11',
      genre: 'Science Fiction',
      asin: 'B003',
      title: 'Galaxy Explorer',
      author: 'Alex SciFi',
      author_url: 'https://amazon.com/author/alex',
      series: 'Space Adventures',
      price: 12.99,
      rating: 4.2,
      review_count: 89,
      rank_overall: 2500,
      release_date: '2025-08-05',
      publisher: 'SciFi Press',
      blurb_text: 'Journey through the cosmos in this thrilling space adventure.',
      cover_url: 'https://example.com/cover3.jpg',
      product_url: 'https://amazon.com/dp/B003',
      topic_tags: '["science fiction", "space", "adventure"]',
      subcategories: 'Space Opera',
      has_supernatural: false,
      has_romance: false,
    },
  ];

  for (const book of sampleBooks) {
    await query(conn, `
      INSERT OR REPLACE INTO books_clean VALUES (
        '${book.ingested_date}', '${book.genre}', '${book.asin}', '${book.title}',
        '${book.author}', '${book.author_url}', ${book.series ? `'${book.series}'` : 'NULL'},
        ${book.price}, ${book.rating}, ${book.review_count}, ${book.rank_overall},
        '${book.release_date}', '${book.publisher}', '${book.blurb_text}',
        '${book.cover_url}', '${book.product_url}', '${book.topic_tags}',
        '${book.subcategories}', ${book.has_supernatural}, ${book.has_romance}
      )
    `);
  }

  console.log('✅ Test database setup complete!');
  console.log(`📊 Inserted ${sampleBooks.length} sample books`);
  
  conn.close();
  db.close();
}

function query(conn: any, sql: string): Promise<any> {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err: any, result: any) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Run the setup
setupTestDatabase().catch(console.error);
