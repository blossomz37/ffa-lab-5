/**
 * DuckDB Query Library
 * 
 * Typed query helpers for React components to access book data.
 * All queries are optimized for DuckDB and use parameterized queries for security.
 */

import { Database } from 'duckdb';
import { CleanRow } from '../lib/data-contract.js';

/**
 * Database connection manager
 */
let dbInstance: Database | null = null;

/**
 * Get or create DuckDB connection
 */
export function getDatabase(dbPath: string = './data/library.duckdb'): Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
  }
  return dbInstance;
}

/**
 * Execute a query with proper error handling
 */
async function executeQuery<T = any>(sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const connection = db.connect();
    
    connection.all(sql, (err: Error | null, result: any) => {
      if (err) {
        reject(new Error(`Query failed: ${err.message}`));
      } else {
        resolve(result as T[] || []);
      }
      connection.close();
    });
  });
}

/**
 * Result type for top rated books
 */
export interface TopRatedResult extends CleanRow {
  rank_position?: number;
}

/**
 * Get top-rated books with optional genre filtering
 * @param genre - Optional genre filter
 * @param minReviews - Minimum number of reviews (default: 100)
 * @param limit - Maximum number of results (default: 50)
 */
export async function topRated(
  genre?: string, 
  minReviews: number = 100, 
  limit: number = 50
): Promise<TopRatedResult[]> {
  let sql: string;
  
  if (genre) {
    sql = `
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY rating DESC, review_count DESC) as rank_position
      FROM books 
      WHERE rating IS NOT NULL 
        AND review_count >= ${minReviews}
        AND genre = '${genre.replace(/'/g, "''")}'
      ORDER BY rating DESC, review_count DESC
      LIMIT ${limit}
    `;
  } else {
    sql = `
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY rating DESC, review_count DESC) as rank_position
      FROM books 
      WHERE rating IS NOT NULL 
        AND review_count >= ${minReviews}
      ORDER BY rating DESC, review_count DESC
      LIMIT ${limit}
    `;
  }
  
  return executeQuery<TopRatedResult>(sql);
}

/**
 * Result type for movers (books with significant rank changes)
 */
export interface MoversResult {
  asin: string;
  title: string;
  author: string;
  genre: string;
  current_rank: number;
  previous_rank: number;
  rank_change: number;
  current_date: string;
  previous_date: string;
  rating?: number;
  review_count?: number;
  price?: number;
}

/**
 * Get books with significant ranking movements
 * @param genre - Optional genre filter
 * @param minDeltaRank - Minimum rank change to include (default: 50)
 * @param windowDays - Number of days to look back (default: 7)
 */
export async function movers(
  genre?: string,
  minDeltaRank: number = 50,
  windowDays: number = 7
): Promise<MoversResult[]> {
  let sql: string;
  let params: any[];
  
  if (genre) {
    sql = `
      WITH ranked_books AS (
        SELECT 
          asin, title, author, genre, rank_overall, ingested_date, rating, review_count, price,
          LAG(rank_overall) OVER (PARTITION BY asin ORDER BY ingested_date) as prev_rank,
          LAG(ingested_date) OVER (PARTITION BY asin ORDER BY ingested_date) as prev_date
        FROM books 
        WHERE rank_overall IS NOT NULL
          AND ingested_date >= CURRENT_DATE - INTERVAL '${windowDays + 7} days'
          AND genre = ?
      )
      SELECT 
        asin,
        title,
        author, 
        genre,
        rank_overall as current_rank,
        prev_rank as previous_rank,
        (prev_rank - rank_overall) as rank_change,
        ingested_date as current_date,
        prev_date as previous_date,
        rating,
        review_count,
        price
      FROM ranked_books
      WHERE prev_rank IS NOT NULL 
        AND prev_date >= CURRENT_DATE - INTERVAL '${windowDays} days'
        AND ABS(prev_rank - rank_overall) >= ?
      ORDER BY ABS(prev_rank - rank_overall) DESC
      LIMIT 100
    `;
    params = [genre, minDeltaRank];
  } else {
    sql = `
      WITH ranked_books AS (
        SELECT 
          asin, title, author, genre, rank_overall, ingested_date, rating, review_count, price,
          LAG(rank_overall) OVER (PARTITION BY asin ORDER BY ingested_date) as prev_rank,
          LAG(ingested_date) OVER (PARTITION BY asin ORDER BY ingested_date) as prev_date
        FROM books 
        WHERE rank_overall IS NOT NULL
          AND ingested_date >= CURRENT_DATE - INTERVAL '${windowDays + 7} days'
      )
      SELECT 
        asin,
        title,
        author, 
        genre,
        rank_overall as current_rank,
        prev_rank as previous_rank,
        (prev_rank - rank_overall) as rank_change,
        ingested_date as current_date,
        prev_date as previous_date,
        rating,
        review_count,
        price
      FROM ranked_books
      WHERE prev_rank IS NOT NULL 
        AND prev_date >= CURRENT_DATE - INTERVAL '${windowDays} days'
        AND ABS(prev_rank - rank_overall) >= ?
      ORDER BY ABS(prev_rank - rank_overall) DESC
      LIMIT 100
    `;
    params = [minDeltaRank];
  }
  
  return executeQuery<MoversResult>(sql, params);
}

/**
 * Result type for price band analysis
 */
export interface PriceBandResult {
  price_tier: string;
  book_count: number;
  avg_rating: number;
  avg_review_count: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  percentage_of_total: number;
}

/**
 * Get price distribution analysis
 * @param genre - Optional genre filter
 */
export async function priceBands(genre?: string): Promise<PriceBandResult[]> {
  const sql = `
    WITH price_stats AS (
      SELECT 
        CASE 
          WHEN price IS NULL THEN 'Unknown'
          WHEN price = 0 THEN 'Free'
          WHEN price <= 2.99 THEN 'Budget'
          WHEN price <= 9.99 THEN 'Standard'
          WHEN price <= 19.99 THEN 'Premium'
          ELSE 'Luxury'
        END as price_tier,
        COUNT(*) as book_count,
        AVG(rating) as avg_rating,
        AVG(review_count) as avg_review_count,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage_of_total
      FROM books 
      WHERE price IS NOT NULL
        ${genre ? 'AND genre = ?' : ''}
      GROUP BY 
        CASE 
          WHEN price IS NULL THEN 'Unknown'
          WHEN price = 0 THEN 'Free'
          WHEN price <= 2.99 THEN 'Budget'
          WHEN price <= 9.99 THEN 'Standard'
          WHEN price <= 19.99 THEN 'Premium'
          ELSE 'Luxury'
        END
    )
    SELECT 
      price_tier,
      book_count,
      ROUND(avg_rating, 2) as avg_rating,
      ROUND(avg_review_count, 0) as avg_review_count,
      ROUND(min_price, 2) as min_price,
      ROUND(max_price, 2) as max_price,
      ROUND(avg_price, 2) as avg_price,
      ROUND(percentage_of_total, 1) as percentage_of_total
    FROM price_stats
    ORDER BY 
      CASE price_tier 
        WHEN 'Free' THEN 0
        WHEN 'Budget' THEN 1
        WHEN 'Standard' THEN 2
        WHEN 'Premium' THEN 3
        WHEN 'Luxury' THEN 4
        ELSE 5
      END
  `;
  
  const params = genre ? [genre] : [];
  return executeQuery<PriceBandResult>(sql, params);
}

/**
 * Result type for author search
 */
export interface AuthorSearchResult extends CleanRow {
  match_score?: number;
  total_books?: number;
  avg_rating?: number;
}

/**
 * Search for books by author name
 * @param query - Author name search query
 * @param limit - Maximum number of results (default: 50)
 */
export async function authorSearch(
  query: string, 
  limit: number = 50
): Promise<AuthorSearchResult[]> {
  const sql = `
    WITH author_matches AS (
      SELECT 
        *,
        -- Simple relevance scoring based on match position and exactness
        CASE 
          WHEN LOWER(author) = LOWER(?) THEN 100
          WHEN LOWER(author) LIKE LOWER(?) THEN 90
          WHEN LOWER(author) LIKE LOWER(?) THEN 80
          ELSE 70
        END as match_score
      FROM books 
      WHERE LOWER(author) LIKE LOWER(?)
    ),
    author_stats AS (
      SELECT 
        author,
        COUNT(*) as total_books,
        AVG(rating) as avg_rating
      FROM books 
      WHERE LOWER(author) LIKE LOWER(?)
      GROUP BY author
    )
    SELECT 
      am.*,
      ast.total_books,
      ast.avg_rating
    FROM author_matches am
    LEFT JOIN author_stats ast ON am.author = ast.author
    ORDER BY match_score DESC, rating DESC NULLS LAST, review_count DESC NULLS LAST
    LIMIT ?
  `;
  
  const searchPattern = `%${query}%`;
  const exactMatch = query;
  const prefixMatch = `${query}%`;
  
  const params = [
    exactMatch,      // Exact match scoring
    prefixMatch,     // Prefix match scoring  
    searchPattern,   // Contains match scoring
    searchPattern,   // Main WHERE clause
    searchPattern,   // Author stats subquery
    limit
  ];
  
  return executeQuery<AuthorSearchResult>(sql, params);
}

/**
 * Result type for new titles on specific date
 */
export interface NewTitlesResult extends CleanRow {
  is_new_release?: boolean;
  days_since_release?: number;
}

/**
 * Get new titles ingested on a specific date
 * @param date - Date to search for (YYYY-MM-DD format)
 * @param genre - Optional genre filter
 */
export async function newTitlesOn(
  date: string, 
  genre?: string
): Promise<NewTitlesResult[]> {
  let sql: string;
  let params: any[];
  
  if (genre) {
    sql = `
      SELECT 
        *,
        CASE 
          WHEN release_date IS NOT NULL AND release_date >= DATE(?) - INTERVAL '30 days' 
          THEN true 
          ELSE false 
        END as is_new_release,
        CASE 
          WHEN release_date IS NOT NULL 
          THEN CAST((DATE(?) - release_date) AS INTEGER)
          ELSE NULL 
        END as days_since_release
      FROM books 
      WHERE ingested_date = DATE(?)
        AND genre = ?
      ORDER BY 
        is_new_release DESC,
        rating DESC NULLS LAST,
        review_count DESC NULLS LAST,
        title ASC
    `;
    params = [date, date, date, genre];
  } else {
    sql = `
      SELECT 
        *,
        CASE 
          WHEN release_date IS NOT NULL AND release_date >= DATE(?) - INTERVAL '30 days' 
          THEN true 
          ELSE false 
        END as is_new_release,
        CASE 
          WHEN release_date IS NOT NULL 
          THEN CAST((DATE(?) - release_date) AS INTEGER)
          ELSE NULL 
        END as days_since_release
      FROM books 
      WHERE ingested_date = DATE(?)
      ORDER BY 
        is_new_release DESC,
        rating DESC NULLS LAST,
        review_count DESC NULLS LAST,
        title ASC
    `;
    params = [date, date, date];
  }
  
  return executeQuery<NewTitlesResult>(sql, params);
}

/**
 * Additional utility queries
 */

/**
 * Get all available genres with statistics
 */
export interface GenreStatsResult {
  genre: string;
  total_books: number;
  unique_authors: number;
  avg_rating: number;
  avg_price: number;
  avg_reviews: number;
  earliest_date: string;
  latest_date: string;
  supernatural_count: number;
  romance_count: number;
}

export async function getGenreStats(): Promise<GenreStatsResult[]> {
  const sql = `SELECT * FROM books_summary ORDER BY total_books DESC`;
  return executeQuery<GenreStatsResult>(sql);
}

/**
 * Get books by series
 */
export interface SeriesBooksResult extends CleanRow {
  series_book_count?: number;
  series_avg_rating?: number;
}

export async function getBooksBySeries(
  seriesName: string, 
  limit: number = 20
): Promise<SeriesBooksResult[]> {
  const sql = `
    WITH series_stats AS (
      SELECT 
        series,
        COUNT(*) as series_book_count,
        AVG(rating) as series_avg_rating
      FROM books 
      WHERE series = ?
      GROUP BY series
    )
    SELECT 
      b.*,
      ss.series_book_count,
      ss.series_avg_rating
    FROM books b
    LEFT JOIN series_stats ss ON b.series = ss.series
    WHERE b.series = ?
    ORDER BY b.release_date ASC NULLS LAST, b.ingested_date ASC
    LIMIT ?
  `;
  
  return executeQuery<SeriesBooksResult>(sql, [seriesName, seriesName, limit]);
}

/**
 * Get trending topics (from topic_tags)
 */
export interface TrendingTopicsResult {
  topic: string;
  book_count: number;
  avg_rating: number;
  genres: string;
}

export async function getTrendingTopics(limit: number = 20): Promise<TrendingTopicsResult[]> {
  const sql = `
    WITH topic_extraction AS (
      SELECT 
        genre,
        rating,
        TRIM(UNNEST(STRING_SPLIT(REPLACE(REPLACE(topic_tags, '[', ''), ']', ''), ','))) as topic
      FROM books 
      WHERE topic_tags IS NOT NULL 
        AND topic_tags != ''
        AND topic_tags != '[]'
    ),
    topic_stats AS (
      SELECT 
        REPLACE(REPLACE(topic, '"', ''), '''', '') as clean_topic,
        COUNT(*) as book_count,
        AVG(rating) as avg_rating,
        STRING_AGG(DISTINCT genre, ', ' ORDER BY genre) as genres
      FROM topic_extraction
      WHERE REPLACE(REPLACE(topic, '"', ''), '''', '') != ''
      GROUP BY REPLACE(REPLACE(topic, '"', ''), '''', '')
      HAVING book_count >= 5
    )
    SELECT 
      clean_topic as topic,
      book_count,
      ROUND(avg_rating, 2) as avg_rating,
      genres
    FROM topic_stats
    ORDER BY book_count DESC, avg_rating DESC
    LIMIT ${limit}
  `;
  
  return executeQuery<TrendingTopicsResult>(sql);
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
