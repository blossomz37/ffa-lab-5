# Data Contract
**ETL Rules**

## Create a data-contract.md and a data-contract.ts that define:
1) Input files: /data_raw/YYYYMMDD_<genre_key>_raw_data.xlsx
2) Parse rules:
   - date = first 8 chars (YYYYMMDD)
   - genre = substring between date and "_raw_data.xlsx"
   - genre_key → human readable:
       _cozy_mystery→"Cozy Mystery"
       _erotica→"Erotica"
       _fantasy→"Fantasy"
       _gay_romance→"Gay Romance"
       _historical_romance→"Historical Romance"
       _m_t_s→"Mystery, Thriller & Suspense"
       _paranormal→"Paranormal Romance"
       _romance_1hr→"Romance Short Reads (1hr)"
       _romance→"Romance"
       _science_fiction→"Science Fiction"
       _science_fiction_romance→"Science Fiction Romance"
       _sff→"Science Fiction & Fantasy"
       _teen _and_ya→"Teen & Young Adult"
       _urban_fantasy→"Urban Fantasy"
3) Cleaned CSV schema (add/adjust as needed):
   columns:
     - ingested_date: DATE (from filename)
     - genre: TEXT (mapped display name)
     - asin: TEXT (PRIMARY KEY with ingested_date, genre)
     - title: TEXT
     - author: TEXT
     - author_url: TEXT  // NEW: separate author hyperlinks
     - series: TEXT      // NEW: book series information
     - price: DOUBLE
     - rating: DOUBLE
     - review_count: INTEGER
     - rank_overall: INTEGER
     - release_date: DATE        // NEW: publication date
     - publisher: TEXT           // NEW: publisher info
     - blurb_text: TEXT         // NEW: book description
     - cover_url: TEXT          // image URL if present
     - product_url: TEXT        // Amazon or source URL
     - topic_tags: TEXT         // NEW: JSON array as string
     - subcategories: TEXT      // NEW: JSON array as string
     - blurb_keyphrases: TEXT   // NEW: extracted key phrases
     - estimated_pov: TEXT      // NEW: narrative perspective
     - has_supernatural: BOOLEAN // NEW: content flags
     - has_romance: BOOLEAN     // NEW: content flags
   
   ⚠️ NOTE: Design schema for target database's limitations
   - Avoid partial indexes if using DuckDB
   - Avoid generated columns if driver doesn't support them
   - Test CREATE TABLE statements early
4) Output:
- Write CSV to /data_cleaned/YYYYMMDD_<genre_key>.csv (UTF‑8, header)
- Append to DuckDB table `books` (matching schema)
- Log to /data_cleaned/logs/YYYYMMDD_<genre_key>.log
5) Logging: write /data_cleaned/logs/YYYYMMDD_<genre_key>.log

## Testing Strategy:
1. Create minimal test data (2-3 rows) first
2. Test data contract validation before building ETL
3. Verify basic database operations before complex queries
4. Build incrementally: parse → validate → transform → load

## Prompt to generate these files:
```
Generate two files:
1) docs/data-contract.md
2) src/lib/data-contract.ts

For #2, export TypeScript types for the cleaned row and a `genreKeyToName(key:string):string` mapper. Include comments for each field and a `validateRow(raw:any): {ok:boolean; row?:CleanRow; errors?:string[]}` helper.

Return only code blocks per file with file paths.
```