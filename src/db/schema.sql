-- FFA Lab 5 - DuckDB Schema
-- Book data analytics database schema optimized for fast querying

-- Main books table with comprehensive indexing
CREATE TABLE IF NOT EXISTS books (
    -- Primary identification
    ingested_date DATE NOT NULL,
    genre VARCHAR NOT NULL,
    asin VARCHAR NOT NULL,
    
    -- Core book information
    title VARCHAR NOT NULL,
    author VARCHAR NOT NULL,
    author_url VARCHAR,
    series VARCHAR,
    
    -- Pricing and ratings
    price DOUBLE,
    rating DOUBLE,
    review_count INTEGER,
    rank_overall INTEGER,
    
    -- Publication details
    release_date DATE,
    publisher VARCHAR,
    
    -- Content and metadata
    blurb_text TEXT,
    cover_url VARCHAR,
    product_url VARCHAR,
    topic_tags VARCHAR, -- JSON array as string
    subcategories VARCHAR, -- JSON array as string
    blurb_keyphrases TEXT,
    estimated_pov VARCHAR,
    
    -- Content flags
    has_supernatural BOOLEAN,
    has_romance BOOLEAN,
    
    -- Primary key constraint
    PRIMARY KEY (ingested_date, genre, asin)
);

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_rating_desc ON books(rating DESC);
CREATE INDEX IF NOT EXISTS idx_books_review_count_desc ON books(review_count DESC);
CREATE INDEX IF NOT EXISTS idx_books_rank_asc ON books(rank_overall ASC);
CREATE INDEX IF NOT EXISTS idx_books_date_desc ON books(ingested_date DESC);
CREATE INDEX IF NOT EXISTS idx_books_price_asc ON books(price ASC);
CREATE INDEX IF NOT EXISTS idx_books_release_date_desc ON books(release_date DESC);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_books_genre_rating ON books(genre, rating DESC);
CREATE INDEX IF NOT EXISTS idx_books_genre_date ON books(genre, ingested_date DESC);
CREATE INDEX IF NOT EXISTS idx_books_author_date ON books(author, ingested_date DESC);

-- Full-text search preparation (for future use)
-- Note: DuckDB has limited full-text search, but we can use LIKE patterns efficiently
CREATE INDEX IF NOT EXISTS idx_books_title_lower ON books(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_books_author_lower ON books(LOWER(author));

-- Views for common aggregations
CREATE OR REPLACE VIEW books_summary AS
SELECT 
    genre,
    COUNT(*) as total_books,
    COUNT(DISTINCT author) as unique_authors,
    AVG(rating) as avg_rating,
    AVG(price) as avg_price,
    AVG(review_count) as avg_reviews,
    MIN(ingested_date) as earliest_date,
    MAX(ingested_date) as latest_date,
    COUNT(*) FILTER (WHERE has_supernatural = true) as supernatural_count,
    COUNT(*) FILTER (WHERE has_romance = true) as romance_count
FROM books 
GROUP BY genre
ORDER BY total_books DESC;

-- Top authors view
CREATE OR REPLACE VIEW top_authors AS
SELECT 
    author,
    COUNT(*) as book_count,
    AVG(rating) as avg_rating,
    AVG(review_count) as avg_reviews,
    COUNT(DISTINCT genre) as genre_count,
    STRING_AGG(DISTINCT genre, ', ' ORDER BY genre) as genres
FROM books 
WHERE rating IS NOT NULL
GROUP BY author
HAVING book_count >= 2 -- Authors with multiple books
ORDER BY avg_rating DESC, book_count DESC;

-- Recent releases view
CREATE OR REPLACE VIEW recent_releases AS
SELECT 
    *,
    ROW_NUMBER() OVER (PARTITION BY genre ORDER BY release_date DESC, ingested_date DESC) as rank_in_genre
FROM books 
WHERE release_date IS NOT NULL 
  AND release_date >= CURRENT_DATE - INTERVAL '365 days'
ORDER BY release_date DESC;

-- Price analysis view
CREATE OR REPLACE VIEW price_analysis AS
SELECT 
  genre,
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
  AVG(review_count) as avg_reviews,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price) as avg_price
FROM books 
WHERE price IS NOT NULL
GROUP BY genre,
  CASE 
    WHEN price IS NULL THEN 'Unknown'
    WHEN price = 0 THEN 'Free'
    WHEN price <= 2.99 THEN 'Budget'
    WHEN price <= 9.99 THEN 'Standard'
    WHEN price <= 19.99 THEN 'Premium'
    ELSE 'Luxury'
  END
ORDER BY genre, 
  CASE 
    CASE 
      WHEN price IS NULL THEN 'Unknown'
      WHEN price = 0 THEN 'Free'
      WHEN price <= 2.99 THEN 'Budget'
      WHEN price <= 9.99 THEN 'Standard'
      WHEN price <= 19.99 THEN 'Premium'
      ELSE 'Luxury'
    END
    WHEN 'Free' THEN 0
    WHEN 'Budget' THEN 1
    WHEN 'Standard' THEN 2
    WHEN 'Premium' THEN 3
    WHEN 'Luxury' THEN 4
    ELSE 5
  END;

-- Rating distribution view
CREATE OR REPLACE VIEW rating_distribution AS
SELECT 
    genre,
    FLOOR(rating * 2) / 2 as rating_bucket, -- 0.5 increments
    COUNT(*) as book_count,
    AVG(review_count) as avg_reviews
FROM books 
WHERE rating IS NOT NULL
GROUP BY genre, rating_bucket
ORDER BY genre, rating_bucket DESC;

-- Series analysis view
CREATE OR REPLACE VIEW series_analysis AS
SELECT 
    COALESCE(series, 'Standalone') as series_name,
    genre,
    COUNT(*) as book_count,
    AVG(rating) as avg_rating,
    AVG(review_count) as avg_reviews,
    MIN(release_date) as first_book_date,
    MAX(release_date) as latest_book_date
FROM books 
WHERE rating IS NOT NULL
GROUP BY COALESCE(series, 'Standalone'), genre
HAVING COUNT(*) >= 2 OR MIN(series) IS NULL
ORDER BY book_count DESC, avg_rating DESC;
