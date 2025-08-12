import express from 'express';
import DuckDBManager from '../duck';

const router = express.Router();

/**
 * Query Routes
 * Provides DuckDB-backed endpoints for all book analytics queries
 * Implements the same queries from Phase 3 with Express API endpoints
 */

/**
 * GET /query/top-rated
 * Get top-rated books, optionally filtered by genre
 * Query params: genre?, minReviews?, limit?
 */
router.get('/top-rated', async (req, res) => {
  try {
    const { genre, minReviews = '100', limit = '50' } = req.query;
    
    const duck = DuckDBManager.getInstance();
    
    let sql = `
      SELECT 
        ingested_date, genre, asin, title, author, author_url, series,
        price, rating, review_count, rank_overall, release_date, publisher,
        blurb_text, cover_url, product_url, topic_tags, subcategories,
        has_supernatural, has_romance,
        ROW_NUMBER() OVER (ORDER BY rating DESC, review_count DESC) as rank_position
      FROM books_clean 
      WHERE rating IS NOT NULL 
        AND review_count >= $minReviews
    `;
    
    const params: Record<string, any> = {
      minReviews: parseInt(minReviews as string, 10),
    };
    
    if (genre) {
      sql += ` AND genre = $genre`;
      params.genre = genre as string;
    }
    
    sql += ` ORDER BY rating DESC, review_count DESC LIMIT $limit`;
    params.limit = parseInt(limit as string, 10);
    
    const results = await duck.queryWithParams(sql, params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      filters: { genre, minReviews: parseInt(minReviews as string), limit: parseInt(limit as string) },
    });
    
  } catch (error) {
    console.error('❌ Top-rated query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top-rated books',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /query/movers
 * Get books with significant ranking changes (mock implementation for now)
 * Query params: genre?, minDeltaRank?, limit?
 */
router.get('/movers', async (req, res) => {
  try {
    const { genre, minDeltaRank = '50', limit = '25' } = req.query;
    
    // Note: This is a simplified version since we don't have historical ranking data
    // In a real system, this would compare current vs previous rankings
    const duck = DuckDBManager.getInstance();
    
    let sql = `
      SELECT 
        asin, title, author, genre, rank_overall as current_rank,
        (rank_overall + FLOOR(RANDOM() * 1000 + 100)) as previous_rank,
        (rank_overall - (rank_overall + FLOOR(RANDOM() * 1000 + 100))) as rank_change,
        ingested_date as current_date,
        (ingested_date::DATE - INTERVAL '7 days')::VARCHAR as previous_date,
        rating, review_count, price
      FROM books_clean 
      WHERE rank_overall IS NOT NULL
    `;
    
    const params: Record<string, any> = {};
    
    if (genre) {
      sql += ` AND genre = $genre`;
      params.genre = genre as string;
    }
    
    sql += ` ORDER BY ABS(rank_overall - (rank_overall + FLOOR(RANDOM() * 1000 + 100))) DESC LIMIT $limit`;
    params.limit = parseInt(limit as string, 10);
    
    const results = await duck.queryWithParams(sql, params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      filters: { genre, minDeltaRank: parseInt(minDeltaRank as string), limit: parseInt(limit as string) },
      note: 'Movers data is simulated as historical ranking data is not available',
    });
    
  } catch (error) {
    console.error('❌ Movers query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch movers data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /query/price-bands
 * Get price analysis by tier
 * Query params: genre?
 */
router.get('/price-bands', async (req, res) => {
  try {
    const { genre } = req.query;
    
    const duck = DuckDBManager.getInstance();
    
    let sql = `
      WITH price_tiers AS (
        SELECT *,
          CASE 
            WHEN price = 0 THEN 'Free'
            WHEN price <= 2.99 THEN 'Budget'
            WHEN price <= 9.99 THEN 'Mid-range'
            WHEN price <= 19.99 THEN 'Premium'
            ELSE 'Luxury'
          END as price_tier
        FROM books_clean 
        WHERE price IS NOT NULL
    `;
    
    const params: Record<string, any> = {};
    
    if (genre) {
      sql += ` AND genre = $genre`;
      params.genre = genre as string;
    }
    
    sql += `
      )
      SELECT 
        price_tier,
        COUNT(*) as book_count,
        AVG(rating) as avg_rating,
        AVG(review_count) as avg_review_count,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM price_tiers)) as percentage_of_total
      FROM price_tiers
      GROUP BY price_tier
      ORDER BY 
        CASE price_tier 
          WHEN 'Free' THEN 1
          WHEN 'Budget' THEN 2
          WHEN 'Mid-range' THEN 3
          WHEN 'Premium' THEN 4
          WHEN 'Luxury' THEN 5
        END
    `;
    
    const results = await duck.queryWithParams(sql, params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      filters: { genre },
    });
    
  } catch (error) {
    console.error('❌ Price bands query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price bands data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /query/author-search
 * Search for books by author name
 * Query params: author (required), minBooks?, limit?
 */
router.get('/author-search', async (req, res) => {
  try {
    const { author, minBooks = '1', limit = '50' } = req.query;
    
    if (!author) {
      return res.status(400).json({
        success: false,
        message: 'Author parameter is required',
      });
    }
    
    const duck = DuckDBManager.getInstance();
    
    const sql = `
      WITH author_books AS (
        SELECT *, 
          COUNT(*) OVER (PARTITION BY author) as total_books,
          AVG(rating) OVER (PARTITION BY author) as avg_rating
        FROM books_clean 
        WHERE LOWER(author) LIKE LOWER($authorPattern)
      )
      SELECT 
        ingested_date, genre, asin, title, author, author_url, series,
        price, rating, review_count, rank_overall, release_date, publisher,
        blurb_text, cover_url, product_url, topic_tags, subcategories,
        has_supernatural, has_romance, total_books, avg_rating
      FROM author_books
      WHERE total_books >= $minBooks
      ORDER BY avg_rating DESC, total_books DESC, rating DESC
      LIMIT $limit
    `;
    
    const params = {
      authorPattern: `%${author}%`,
      minBooks: parseInt(minBooks as string, 10),
      limit: parseInt(limit as string, 10),
    };
    
    const results = await duck.queryWithParams(sql, params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      filters: { author, minBooks: parseInt(minBooks as string), limit: parseInt(limit as string) },
    });
    
  } catch (error) {
    console.error('❌ Author search query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search authors',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /query/new-titles
 * Get recently published books
 * Query params: genre?, daysBack?, limit?
 */
router.get('/new-titles', async (req, res) => {
  try {
    const { genre, daysBack = '30', limit = '50' } = req.query;
    
    const duck = DuckDBManager.getInstance();
    
    let sql = `
      SELECT 
        ingested_date, genre, asin, title, author, author_url, series,
        price, rating, review_count, rank_overall, release_date, publisher,
        blurb_text, cover_url, product_url, topic_tags, subcategories,
        has_supernatural, has_romance,
        TRUE as is_new_release,
        DATE_DIFF('day', release_date::DATE, CURRENT_DATE) as days_since_release
      FROM books_clean 
      WHERE release_date IS NOT NULL 
        AND release_date::DATE >= (CURRENT_DATE - INTERVAL '$daysBack days')
    `;
    
    const params: Record<string, any> = {
      daysBack: parseInt(daysBack as string, 10),
    };
    
    if (genre) {
      sql += ` AND genre = $genre`;
      params.genre = genre as string;
    }
    
    sql += ` ORDER BY release_date DESC, rating DESC LIMIT $limit`;
    params.limit = parseInt(limit as string, 10);
    
    const results = await duck.queryWithParams(sql, params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      filters: { genre, daysBack: parseInt(daysBack as string), limit: parseInt(limit as string) },
    });
    
  } catch (error) {
    console.error('❌ New titles query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch new titles',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /query/genre-stats
 * Get comprehensive statistics by genre
 */
router.get('/genre-stats', async (req, res) => {
  try {
    const duck = DuckDBManager.getInstance();
    
    const sql = `
      SELECT 
        genre,
        COUNT(*) as total_books,
        COUNT(DISTINCT author) as unique_authors,
        AVG(rating) as avg_rating,
        AVG(price) as avg_price,
        AVG(review_count) as avg_reviews,
        MIN(ingested_date) as earliest_date,
        MAX(ingested_date) as latest_date,
        SUM(CASE WHEN has_supernatural = true THEN 1 ELSE 0 END) as supernatural_count,
        SUM(CASE WHEN has_romance = true THEN 1 ELSE 0 END) as romance_count
      FROM books_clean
      GROUP BY genre
      ORDER BY total_books DESC
    `;
    
    const results = await duck.queryWithParams(sql);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
    });
    
  } catch (error) {
    console.error('❌ Genre stats query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch genre statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /query/search
 * General search across books with multiple filters
 * Query params: q?, genre?, minRating?, maxRating?, minPrice?, maxPrice?, minReviews?, hasSupernatural?, hasRomance?, limit?
 */
router.get('/search', async (req, res) => {
  try {
    const { 
      q, 
      genre, 
      minRating, 
      maxRating, 
      minPrice, 
      maxPrice, 
      minReviews,
      hasSupernatural,
      hasRomance,
      limit = '100' 
    } = req.query;
    
    const duck = DuckDBManager.getInstance();
    
    let sql = `
      SELECT 
        ingested_date, genre, asin, title, author, author_url, series,
        price, rating, review_count, rank_overall, release_date, publisher,
        blurb_text, cover_url, product_url, topic_tags, subcategories,
        has_supernatural, has_romance
      FROM books_clean 
      WHERE 1=1
    `;
    
    const params: Record<string, any> = {};
    
    if (q) {
      sql += ` AND (LOWER(title) LIKE LOWER($searchQuery) OR LOWER(author) LIKE LOWER($searchQuery) OR LOWER(blurb_text) LIKE LOWER($searchQuery))`;
      params.searchQuery = `%${q}%`;
    }
    
    if (genre) {
      sql += ` AND genre = $genre`;
      params.genre = genre as string;
    }
    
    if (minRating) {
      sql += ` AND rating >= $minRating`;
      params.minRating = parseFloat(minRating as string);
    }
    
    if (maxRating) {
      sql += ` AND rating <= $maxRating`;
      params.maxRating = parseFloat(maxRating as string);
    }
    
    if (minPrice) {
      sql += ` AND price >= $minPrice`;
      params.minPrice = parseFloat(minPrice as string);
    }
    
    if (maxPrice) {
      sql += ` AND price <= $maxPrice`;
      params.maxPrice = parseFloat(maxPrice as string);
    }
    
    if (minReviews) {
      sql += ` AND review_count >= $minReviews`;
      params.minReviews = parseInt(minReviews as string, 10);
    }
    
    if (hasSupernatural !== undefined) {
      sql += ` AND has_supernatural = $hasSupernatural`;
      params.hasSupernatural = hasSupernatural === 'true';
    }
    
    if (hasRomance !== undefined) {
      sql += ` AND has_romance = $hasRomance`;
      params.hasRomance = hasRomance === 'true';
    }
    
    sql += ` ORDER BY COALESCE(rating, 0) DESC, COALESCE(review_count, 0) DESC LIMIT $limit`;
    params.limit = parseInt(limit as string, 10);
    
    const results = await duck.queryWithParams(sql, params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      filters: req.query,
    });
    
  } catch (error) {
    console.error('❌ Search query error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search books',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
