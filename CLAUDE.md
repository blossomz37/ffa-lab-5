# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Run ETL pipeline (processes Excel files to CSV/DuckDB/MongoDB)
npm run etl
npm run etl -- --csv-only     # Generate CSV files only (skip all databases)
npm run etl -- --skip-mongo   # Skip MongoDB, use DuckDB only
npm run etl -- --force        # Force reprocess all files

# Run tests
npm test                      # Run all tests
npm run test:watch           # Run tests in watch mode
npm test -- tests/etl.spec.ts # Run specific test file

# Development servers
npm run dev                   # Start Vite React frontend (port 5173)
npm run dev:server           # Start Express API server (port 3001)

# Build for production
npm run build
```

### ETL Pipeline Usage
The ETL pipeline processes Excel files from `/data_raw/` with pattern `YYYYMMDD_<genre>_raw_data.xlsx`:
- Extracts data with hyperlink parsing for author URLs
- Validates and transforms data according to strict schema rules
- Outputs to CSV (`/data_cleaned/`), DuckDB (`./data/library.duckdb`), and MongoDB
- Creates detailed logs in `/data_cleaned/logs/`

## Architecture Overview

### Project Structure
This is a full-stack TypeScript application for analyzing book data:
- **ETL Pipeline**: Processes Excel → CSV + DuckDB + MongoDB
- **React Frontend**: Analytics dashboard with search, filters, and data visualization
- **Express API**: DuckDB queries and DOCX export functionality
- **Data Storage**: DuckDB for analytics, MongoDB for flexibility, CSV for archival

### Key Components

**ETL System** (`src/etl/`):
- `run.ts`: Orchestrator handling file discovery, logging, and coordination
- `readXlsx.ts`: Excel reader with hyperlink extraction
- `transform.ts`: Data validation, deduplication, and enrichment
- `loadDuckDb.ts`: DuckDB schema management and bulk loading
- `upsertMongo.ts`: MongoDB sync with compound indexes

**Query System** (`src/db/`):
- `queries.ts`: Preset analytical queries (uses string interpolation due to DuckDB 1.3.2 driver bug)
- `schema.sql`: Optimized DuckDB schema with indexes and views

**API Server** (`server/`):
- `index.ts`: Express server with CORS, security middleware
- `duck.ts`: DuckDB connection manager
- `docx.ts`: DOCX report generation with book data tables
- Routes: `/api/query`, `/api/export`, `/api/etl`

**Frontend** (`src/`):
- React app with TypeScript
- Components for search, filters, data tables, preset queries
- API integration for real-time queries and exports

### Data Flow
1. Excel files → ETL validates/transforms → CSV + databases
2. Frontend queries → Express API → DuckDB → JSON response
3. Export request → API generates DOCX → Download to user

## Critical Known Issues

### DuckDB Connection Hanging
**Issue**: DuckDB initialization may hang when creating database connections in certain environments.

**Workaround**: Use `--csv-only` flag to generate CSV files without database operations:
```bash
npm run etl -- --csv-only
```

### DuckDB Parameter Binding Bug
**Issue**: DuckDB 1.3.2 Node.js driver fails with prepared statements. All parameterized queries throw "Values were not provided" errors.

**Current Workaround**: Using string interpolation with manual escaping in `src/db/queries.ts`:
```typescript
// Instead of: connection.all(`SELECT * FROM books WHERE genre = ?`, [genre])
// We use: connection.all(`SELECT * FROM books WHERE genre = '${genre.replace(/'/g, "''")}'`)
```

**Impact**: Query tests partially failing (8/26 pass). ETL and API work correctly with workaround.

### Schema Limitations
DuckDB doesn't support:
- Partial indexes with WHERE clauses
- Generated columns (GENERATED ALWAYS AS)
- Some aggregate functions in views

Workarounds implemented in `schema.sql` using CASE expressions and manual calculations.

## Testing Strategy

### Test Coverage Areas
- **ETL Pipeline** (`tests/etl.spec.ts`): Filename parsing, data validation, transformation, deduplication
- **Query Functions** (`tests/queries.spec.ts`): Preset queries, aggregations (partially passing due to driver bug)

### Running Single Tests
```bash
npm test -- tests/etl.spec.ts --grep "should parse filename correctly"
```

## Data Schema Notes

### Genre Mapping
Files use genre keys that map to display names:
- `_fantasy` → "Fantasy"
- `_romance` → "Romance"
- `_science_fiction` → "Science Fiction"
- `_m_t_s` → "Mystery, Thriller & Suspense"
- See `src/lib/data-contract.ts` for complete mapping

### Special Field Processing
- **Author URLs**: Extracted from Excel hyperlinks `[Name](URL)`
- **Topic Tags**: Pipe-separated strings → JSON arrays
- **Booleans**: Various text formats → proper boolean values
- **Dates**: Excel serial dates → ISO strings
- **Prices**: Currency strings → decimal numbers

### Validation Rules
- ASIN: 10 alphanumeric characters
- URLs: Must be valid HTTP/HTTPS
- Ratings: 0-5 range
- Sales Rank: Positive integers
- Required fields enforced, rejected rows logged

## Development Tips

### Before Making Changes
1. Check if MongoDB is required or use `--skip-mongo` flag
2. Review `/data_cleaned/logs/` for any ETL errors
3. Test database connectivity before building features
4. Use absolute paths in all file operations

### Common Debugging
- **ETL Issues**: Check logs in `/data_cleaned/logs/`
- **Query Failures**: Likely DuckDB driver issue, check string interpolation
- **Frontend API Calls**: Ensure both servers running (ports 5173 and 3001)
- **CORS Errors**: API server must be running on port 3001

### Performance Optimization
- DuckDB indexes on: genre, author, rating, sales_rank, date, price
- MongoDB compound index on (date, genre, asin) for uniqueness
- Batch operations for large datasets
- Streaming for memory-efficient file processing