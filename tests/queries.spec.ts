/**
 * DuckDB Queries Tests
 * 
 * Comprehensive tests for preset query functions.
 * Tests query logic, parameter handling, and result structure.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { promises as fs } from 'fs';
import { Database } from 'duckdb';
import { 
  topRated, 
  movers, 
  priceBands, 
  authorSearch, 
  newTitlesOn,
  getGenreStats,
  getBooksBySeries,
  getTrendingTopics,
  getDatabase,
  closeDatabase,
  type TopRatedResult,
  type MoversResult,
  type PriceBandResult,
  type AuthorSearchResult,
  type NewTitlesResult,
  type GenreStatsResult
} from '../src/db/queries.js';
import { CleanRow } from '../src/lib/data-contract.js';

// Test database path
const TEST_DB_PATH = './test_data/test_library.duckdb';

// Sample test data
const sampleBooks: CleanRow[] = [
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
    blurb_text: 'An epic fantasy adventure',
    cover_url: 'https://example.com/cover1.jpg',
    product_url: 'https://amazon.com/dp/B001',
    topic_tags: '["fantasy", "magic", "dragons"]',
    subcategories: '["Epic Fantasy", "Dragon Fiction"]',
    has_supernatural: true,
    has_romance: false,
  },
  {
    ingested_date: '2025-08-11',
    genre: 'Romance',
    asin: 'B002',
    title: 'Love in Paris',
    author: 'Sarah Romance',
    price: 3.99,
    rating: 4.8,
    review_count: 1200,
    rank_overall: 800,
    release_date: '2025-07-15',
    publisher: 'Romance Publishers',
    topic_tags: '["romance", "paris", "contemporary"]',
    has_supernatural: false,
    has_romance: true,
  },
  {
    ingested_date: '2025-08-10',
    genre: 'Fantasy',
    asin: 'B003',
    title: 'Dark Magic Rising',
    author: 'Jane Fantasy',
    series: 'Dragon Magic Series',
    price: 12.99,
    rating: 4.2,
    review_count: 180,
    rank_overall: 2200,
    release_date: '2025-07-01',
    topic_tags: '["fantasy", "dark magic", "adventure"]',
    has_supernatural: true,
    has_romance: false,
  },
  {
    ingested_date: '2025-08-11',
    genre: 'Science Fiction',
    asin: 'B004',
    title: 'Space Warriors',
    author: 'Mike SciFi',
    price: 0.0, // Free book
    rating: 3.9,
    review_count: 50,
    rank_overall: 5000,
    release_date: '2025-08-05',
    topic_tags: '["sci-fi", "space", "warriors"]',
    has_supernatural: false,
    has_romance: false,
  },
  {
    ingested_date: '2025-08-11',
    genre: 'Romance',
    asin: 'B005',
    title: 'Mountain Love Story',
    author: 'Sarah Romance',
    price: 15.99,
    rating: 4.6,
    review_count: 75,
    rank_overall: 3000,
    release_date: '2025-06-01',
    topic_tags: '["romance", "mountains", "contemporary"]',
    has_supernatural: false,
    has_romance: true,
  },
];

describe('DuckDB Queries', () => {
  beforeAll(async () => {
    // Create test data directory
    await fs.mkdir('./test_data', { recursive: true });
    
    // Initialize test database
    const db = getDatabase(TEST_DB_PATH);
    
    // Read and execute schema
    const schemaSQL = await fs.readFile('./src/db/schema.sql', 'utf8');
    
    return new Promise<void>((resolve, reject) => {
      const connection = db.connect();
      connection.exec(schemaSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
        connection.close();
      });
    });
  });
  
  beforeEach(async () => {
    // Clear and populate test data
    const db = getDatabase(TEST_DB_PATH);
    
    return new Promise<void>((resolve, reject) => {
      const connection = db.connect();
      
      // Clear existing data
      connection.run('DELETE FROM books', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Insert test data
        const insertSQL = `
          INSERT INTO books 
          SELECT * FROM VALUES
        `;
        
        let completed = 0;
        for (const book of sampleBooks) {
          const valueSQL = `(
            '${book.ingested_date}', '${book.genre}', '${book.asin}', '${book.title}', 
            '${book.author}', ${book.author_url ? `'${book.author_url}'` : 'NULL'}, 
            ${book.series ? `'${book.series}'` : 'NULL'}, ${book.price || 'NULL'}, 
            ${book.rating || 'NULL'}, ${book.review_count || 'NULL'}, 
            ${book.rank_overall || 'NULL'}, ${book.release_date ? `'${book.release_date}'` : 'NULL'}, 
            ${book.publisher ? `'${book.publisher}'` : 'NULL'}, 
            ${book.blurb_text ? `'${book.blurb_text.replace(/'/g, "''")}'` : 'NULL'}, 
            ${book.cover_url ? `'${book.cover_url}'` : 'NULL'}, 
            ${book.product_url ? `'${book.product_url}'` : 'NULL'}, 
            ${book.topic_tags ? `'${book.topic_tags.replace(/'/g, "''")}'` : 'NULL'}, 
            ${book.subcategories ? `'${book.subcategories.replace(/'/g, "''")}'` : 'NULL'}, 
            NULL, NULL, 
            ${book.has_supernatural === true ? 'true' : book.has_supernatural === false ? 'false' : 'NULL'}, 
            ${book.has_romance === true ? 'true' : book.has_romance === false ? 'false' : 'NULL'}
          )`;
          
          const fullSQL = `INSERT INTO books VALUES ${valueSQL}`;
          
          connection.run(fullSQL, (insertErr) => {
            if (insertErr) {
              reject(insertErr);
              return;
            }
            
            completed++;
            if (completed === sampleBooks.length) {
              resolve();
              connection.close();
            }
          });
        }
      });
    });
  });
  
  afterAll(async () => {
    closeDatabase();
    // Clean up test database
    try {
      await fs.unlink(TEST_DB_PATH);
      await fs.rmdir('./test_data');
    } catch {
      // Ignore cleanup errors
    }
  });
  
  describe('topRated', () => {
    it('should return top rated books with default parameters', async () => {
      const results = await topRated();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Should include books with >= 100 reviews (Love in Paris: 1200, Dragon Wizard: 250, Dark Magic: 180)
      expect(results.length).toBe(3);
      
      // Should be ordered by rating DESC
      expect(results[0].rating).toBeGreaterThanOrEqual(results[1].rating || 0);
      
      // Top book should be "Love in Paris" (4.8 rating, 1200 reviews)
      expect(results[0].title).toBe('Love in Paris');
      expect(results[0].rating).toBe(4.8);
    });
    
    it('should filter by genre correctly', async () => {
      const fantasyResults = await topRated('Fantasy');
      
      expect(fantasyResults.length).toBe(2); // Dragon Wizard and Dark Magic
      expect(fantasyResults.every(book => book.genre === 'Fantasy')).toBe(true);
      
      // Should be ordered by rating
      expect(fantasyResults[0].title).toBe('Dragon Wizard Supreme'); // 4.5 rating
      expect(fantasyResults[1].title).toBe('Dark Magic Rising'); // 4.2 rating
    });
    
    it('should respect minimum reviews parameter', async () => {
      const results = await topRated(undefined, 200); // Minimum 200 reviews
      
      expect(results.length).toBe(2); // Only Love in Paris (1200) and Dragon Wizard (250)
      expect(results.every(book => (book.review_count || 0) >= 200)).toBe(true);
    });
    
    it('should respect limit parameter', async () => {
      const results = await topRated(undefined, 100, 1);
      
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Love in Paris'); // Highest rated with enough reviews
    });
  });
  
  describe('movers', () => {
    it('should detect ranking changes (requires historical data)', async () => {
      // Note: This test is limited since we need time-series data for meaningful results
      // In a real scenario, you'd insert data with different dates and ranks
      
      const results = await movers();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // With single-day test data, we won't have meaningful rank changes
      // This test verifies the query structure and parameter handling
    });
    
    it('should filter by genre', async () => {
      const results = await movers('Fantasy');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Results should only contain Fantasy books if any rank changes exist
    });
  });
  
  describe('priceBands', () => {
    it('should return price distribution for all genres', async () => {
      const results = await priceBands();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Should include various price tiers
      const tiers = results.map(r => r.price_tier);
      expect(tiers).toContain('Free'); // Space Warriors is free
      expect(tiers).toContain('Budget'); // Love in Paris is $3.99
      expect(tiers).toContain('Standard'); // Dragon Wizard is $9.99
      expect(tiers).toContain('Premium'); // Mountain Love is $15.99
      
      // Each result should have required fields
      results.forEach(result => {
        expect(result.book_count).toBeGreaterThan(0);
        expect(typeof result.avg_rating).toBe('number');
        expect(typeof result.percentage_of_total).toBe('number');
      });
    });
    
    it('should filter by genre correctly', async () => {
      const fantasyResults = await priceBands('Fantasy');
      
      expect(fantasyResults).toBeDefined();
      expect(fantasyResults.length).toBeGreaterThan(0);
      
      // Should only include Standard and Premium tiers for Fantasy
      const tiers = fantasyResults.map(r => r.price_tier);
      expect(tiers).toContain('Standard'); // Dragon Wizard $9.99
      expect(tiers).toContain('Premium'); // Dark Magic $12.99
    });
    
    it('should calculate percentages correctly', async () => {
      const results = await priceBands();
      
      const totalPercentage = results.reduce((sum, r) => sum + r.percentage_of_total, 0);
      expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.1); // Should sum to ~100%
    });
  });
  
  describe('authorSearch', () => {
    it('should find books by exact author name', async () => {
      const results = await authorSearch('Jane Fantasy');
      
      expect(results.length).toBe(2); // Dragon Wizard and Dark Magic
      expect(results.every(book => book.author === 'Jane Fantasy')).toBe(true);
      
      // Should include match score and stats
      expect(results[0].match_score).toBeDefined();
      expect(results[0].total_books).toBe(2);
    });
    
    it('should find books by partial author name', async () => {
      const results = await authorSearch('Sarah');
      
      expect(results.length).toBe(2); // Love in Paris and Mountain Love
      expect(results.every(book => book.author.includes('Sarah'))).toBe(true);
    });
    
    it('should handle case-insensitive search', async () => {
      const results = await authorSearch('jane fantasy');
      
      expect(results.length).toBe(2);
      expect(results.every(book => book.author === 'Jane Fantasy')).toBe(true);
    });
    
    it('should respect limit parameter', async () => {
      const results = await authorSearch('a', 1); // Very broad search with limit
      
      expect(results.length).toBeLessThanOrEqual(1);
    });
    
    it('should return empty array for non-existent author', async () => {
      const results = await authorSearch('Non Existent Author');
      
      expect(results.length).toBe(0);
    });
  });
  
  describe('newTitlesOn', () => {
    it('should return books ingested on specific date', async () => {
      const results = await newTitlesOn('2025-08-11');
      
      expect(results.length).toBe(4); // Books ingested on 2025-08-11
      expect(results.every(book => book.ingested_date === '2025-08-11')).toBe(true);
      
      // Should include computed fields
      results.forEach(book => {
        expect(typeof book.is_new_release).toBe('boolean');
        if (book.release_date) {
          expect(typeof book.days_since_release).toBe('number');
        }
      });
    });
    
    it('should filter by genre correctly', async () => {
      const results = await newTitlesOn('2025-08-11', 'Romance');
      
      expect(results.length).toBe(2); // Love in Paris and Mountain Love
      expect(results.every(book => book.genre === 'Romance')).toBe(true);
    });
    
    it('should identify new releases correctly', async () => {
      const results = await newTitlesOn('2025-08-11');
      
      // Books released within 30 days should be marked as new
      const newReleases = results.filter(book => book.is_new_release);
      expect(newReleases.length).toBeGreaterThan(0);
      
      // Space Warriors (released 2025-08-05) should be a new release
      const spaceWarriors = results.find(book => book.title === 'Space Warriors');
      expect(spaceWarriors?.is_new_release).toBe(true);
    });
    
    it('should return empty array for date with no books', async () => {
      const results = await newTitlesOn('2025-01-01');
      
      expect(results.length).toBe(0);
    });
  });
  
  describe('getGenreStats', () => {
    it('should return statistics for all genres', async () => {
      const results = await getGenreStats();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Should include all genres in test data
      const genres = results.map(r => r.genre);
      expect(genres).toContain('Fantasy');
      expect(genres).toContain('Romance');
      expect(genres).toContain('Science Fiction');
      
      // Each result should have complete stats
      results.forEach(stat => {
        expect(stat.total_books).toBeGreaterThan(0);
        expect(stat.unique_authors).toBeGreaterThan(0);
        expect(typeof stat.avg_rating).toBe('number');
        expect(typeof stat.supernatural_count).toBe('number');
        expect(typeof stat.romance_count).toBe('number');
      });
    });
    
    it('should order by total books descending', async () => {
      const results = await getGenreStats();
      
      // Fantasy and Romance both have 2 books, Science Fiction has 1
      // Order may vary for equal counts, but should be consistent
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].total_books).toBeGreaterThanOrEqual(results[i].total_books);
      }
    });
  });
  
  describe('getBooksBySeries', () => {
    it('should return books from specified series', async () => {
      const results = await getBooksBySeries('Dragon Magic Series');
      
      expect(results.length).toBe(2); // Dragon Wizard and Dark Magic
      expect(results.every(book => book.series === 'Dragon Magic Series')).toBe(true);
      
      // Should include series statistics
      expect(results[0].series_book_count).toBe(2);
      expect(typeof results[0].series_avg_rating).toBe('number');
    });
    
    it('should return empty array for non-existent series', async () => {
      const results = await getBooksBySeries('Non Existent Series');
      
      expect(results.length).toBe(0);
    });
    
    it('should order by release date', async () => {
      const results = await getBooksBySeries('Dragon Magic Series');
      
      // Dark Magic (2025-07-01) should come before Dragon Wizard (2025-08-01)
      expect(results[0].title).toBe('Dark Magic Rising');
      expect(results[1].title).toBe('Dragon Wizard Supreme');
    });
  });
  
  describe('getTrendingTopics', () => {
    it('should extract and count topic tags', async () => {
      const results = await getTrendingTopics();
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      
      // Should find common topics like "fantasy" and "romance"
      const topics = results.map(r => r.topic);
      expect(topics.some(topic => topic.includes('fantasy'))).toBe(true);
      expect(topics.some(topic => topic.includes('romance'))).toBe(true);
      
      // Each result should have required fields
      results.forEach(result => {
        expect(result.book_count).toBeGreaterThan(0);
        expect(typeof result.avg_rating).toBe('number');
        expect(typeof result.genres).toBe('string');
      });
    });
    
    it('should order by book count descending', async () => {
      const results = await getTrendingTopics();
      
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].book_count).toBeGreaterThanOrEqual(results[i].book_count);
      }
    });
    
    it('should respect limit parameter', async () => {
      const results = await getTrendingTopics(5);
      
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });
});
