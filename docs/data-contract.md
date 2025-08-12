# Data Contract

## Overview
This contract defines how raw Excel files are processed into clean CSV format and ingested into DuckDB for the FFA Lab 5 book analysis application.

## Input File Structure
- **Location**: `/data_raw/`
- **Pattern**: `YYYYMMDD_<genre_key>_raw_data.xlsx`
- **Example**: `20250811_fantasy_raw_data.xlsx`

### Filename Parsing Rules
1. **Date**: First 8 characters (YYYYMMDD format)
2. **Genre Key**: Substring between date and `_raw_data.xlsx`

### Genre Key Mappings
| Genre Key | Display Name |
|-----------|-------------|
| `_cozy_mystery` | Cozy Mystery |
| `_erotica` | Erotica |
| `_fantasy` | Fantasy |
| `_gay_romance` | Gay Romance |
| `_historical_romance` | Historical Romance |
| `_m_t_s` | Mystery, Thriller & Suspense |
| `_paranormal` | Paranormal Romance |
| `_romance_1hr` | Romance Short Reads (1hr) |
| `_romance` | Romance |
| `_science_fiction` | Science Fiction |
| `_science_fiction_romance` | Science Fiction Romance |
| `_sff` | Science Fiction & Fantasy |
| `_teen_and_ya` | Teen & Young Adult |
| `_urban_fantasy` | Urban Fantasy |

## Excel Column Extraction Rules

### Columns to Extract (TRUE)
- **Title**: Book title
- **ASIN**: Amazon Standard Identification Number
- **Author**: Author name with hyperlink (requires parsing)
- **Series**: Book series name
- **nReviews**: Number of reviews (integer)
- **reviewAverage**: Average rating (decimal)
- **price**: Book price (decimal)
- **salesRank**: Overall sales rank (integer)
- **releaseDate**: Publication date
- **publisher**: Publisher name
- **blurbText**: Book description/summary
- **coverImage**: Cover image URL
- **bookURL**: Product page URL
- **topicTags**: Tags separated by "|"
- **blurbKeyphrases**: Key phrases from blurb
- **subcatsList**: Subcategories (multiple)
- **estimatedBlurbPOV**: Point of view estimation
- **hasSupernatural**: Boolean flag
- **hasRomance**: Boolean flag

### Columns to Ignore
- `kuStatus`, `nPages`, `isTrad`, `isFree`, `isDuplicateASIN`

### Special Parsing Requirements

#### Author Field
- **Input**: `[Jessamine Chan](https://www.amazon.com/stores/author/B092BKD9NX)`
- **Extract**: 
  - Author name: "Jessamine Chan"
  - Author URL: "https://www.amazon.com/stores/author/B092BKD9NX"

#### Topic Tags
- **Input**: "tag1|tag2|tag3"
- **Output**: Array of strings

#### Subcategories
- **Input**: Multiple subcategory entries
- **Output**: Array of cleaned subcategory names

## Clean CSV Schema

### Output File Structure
- **Location**: `/data_cleaned/`
- **Pattern**: `YYYYMMDD_<genre_key>.csv`
- **Encoding**: UTF-8 with header row

### Column Schema
| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `ingested_date` | DATE | Date from filename (YYYY-MM-DD) | ✓ |
| `genre` | TEXT | Mapped genre display name | ✓ |
| `asin` | TEXT | Amazon Standard Identification Number | ✓ |
| `title` | TEXT | Book title | ✓ |
| `author` | TEXT | Author name (parsed from hyperlink) | ✓ |
| `author_url` | TEXT | Author's Amazon store URL | |
| `series` | TEXT | Book series name | |
| `price` | DOUBLE | Book price in USD | |
| `rating` | DOUBLE | Average review rating (0-5) | |
| `review_count` | INTEGER | Number of reviews | |
| `rank_overall` | INTEGER | Overall sales rank | |
| `release_date` | DATE | Publication date | |
| `publisher` | TEXT | Publisher name | |
| `blurb_text` | TEXT | Book description/summary | |
| `cover_url` | TEXT | Cover image URL | |
| `product_url` | TEXT | Amazon product page URL | |
| `topic_tags` | TEXT | JSON array of tags | |
| `subcategories` | TEXT | JSON array of subcategories | |
| `blurb_keyphrases` | TEXT | Key phrases from blurb | |
| `estimated_pov` | TEXT | Estimated point of view | |
| `has_supernatural` | BOOLEAN | Contains supernatural elements | |
| `has_romance` | BOOLEAN | Contains romance elements | |

### Data Quality Rules

#### Validation Constraints
- **Unique Key**: `(ingested_date, genre, asin)` - no duplicates within same date/genre
- **Required Fields**: `ingested_date`, `genre`, `asin`, `title`, `author`
- **Text Normalization**: Trim whitespace, normalize Unicode characters
- **Number Coercion**: Convert string numbers to appropriate numeric types
- **URL Validation**: Verify URL format for `author_url`, `cover_url`, `product_url`
- **Date Parsing**: Convert date strings to ISO format (YYYY-MM-DD)
- **Boolean Coercion**: Convert text/numeric to boolean for flags

#### Reject Handling
- **Invalid Rows**: Log to `/data_cleaned/logs/YYYYMMDD_<genre_key>.log`
- **Log Format**: `Line {number}: {validation_errors}`
- **Continue Processing**: Don't halt on individual row failures

## DuckDB Integration

### Database Location
- **File**: `./data/library.duckdb`
- **Table**: `books`
- **Operation**: Upsert (INSERT or UPDATE on conflict)

### Idempotent Loading
- Use temporary staging table for each batch
- Merge/replace existing records based on unique key
- Safe to re-run ETL on same files

## Output Logging
- **Location**: `/data_cleaned/logs/`
- **Format**: `YYYYMMDD_<genre_key>.log`
- **Content**: Processing summary, validation errors, statistics
