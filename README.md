# FFA Lab 5 - Book Data ETL Pipeline

A comprehensive ETL pipeline and web application for analyzing book data from Excel files.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (optional, can be skipped with `--skip-mongo`)
- Excel files in `/data_raw/` directory with naming pattern: `YYYYMMDD_<genre>_raw_data.xlsx`

### Installation

```bash
# Install dependencies
npm install

# Create required directories
mkdir -p data data_cleaned data_cleaned/logs
```

### Running the ETL Pipeline

```bash
# Process all Excel files in /data_raw/
npm run etl

# Process specific files
npm run etl -- --files "20250811_fantasy_raw_data.xlsx,20250811_romance_raw_data.xlsx"

# Skip MongoDB sync (DuckDB only)
npm run etl -- --skip-mongo

# Custom directories
npm run etl -- --input-dir ./my_data --output-dir ./my_output

# Force reprocess all files
npm run etl -- --force

# Show help
npm run etl -- --help
```

## 📊 Data Flow

```
Excel Files → ETL Pipeline → CSV + DuckDB + MongoDB → React UI → DOCX Export
```

### 1. **Input**: Excel Files
- **Location**: `/data_raw/`
- **Pattern**: `YYYYMMDD_<genre_key>_raw_data.xlsx`
- **Example**: `20250811_fantasy_raw_data.xlsx`

### 2. **Processing**: ETL Pipeline
- **Extract**: Read Excel with hyperlink support
- **Transform**: Validate, clean, and normalize data
- **Load**: Save to CSV, DuckDB, and MongoDB

### 3. **Output**: Multiple Formats
- **CSV**: `/data_cleaned/YYYYMMDD_<genre_key>.csv`
- **DuckDB**: `./data/library.duckdb` (fast analytics)
- **MongoDB**: `mongodb://127.0.0.1:27017/ffa` (flexible queries)
- **Logs**: `/data_cleaned/logs/YYYYMMDD_<genre_key>.log`

## 📋 Data Schema

### Supported Genres
| File Pattern | Display Name |
|--------------|-------------|
| `_fantasy` | Fantasy |
| `_romance` | Romance |
| `_science_fiction` | Science Fiction |
| `_cozy_mystery` | Cozy Mystery |
| `_erotica` | Erotica |
| `_gay_romance` | Gay Romance |
| `_historical_romance` | Historical Romance |
| `_m_t_s` | Mystery, Thriller & Suspense |
| `_paranormal` | Paranormal Romance |
| `_romance_1hr` | Romance Short Reads (1hr) |
| `_science_fiction_romance` | Science Fiction Romance |
| `_sff` | Science Fiction & Fantasy |
| `_teen_and_ya` | Teen & Young Adult |
| `_urban_fantasy` | Urban Fantasy |

### Excel Column Mapping
The pipeline extracts these columns from Excel files:
- **Title**, **ASIN**, **Author** (with hyperlink parsing)
- **Series**, **nReviews**, **reviewAverage**, **price**, **salesRank**
- **releaseDate**, **publisher**, **blurbText**
- **coverImage**, **bookURL**, **topicTags** (pipe-separated)
- **blurbKeyphrases**, **subcatsList**
- **estimatedBlurbPOV**, **hasSupernatural**, **hasRomance**

### Special Processing
- **Author Hyperlinks**: `[Author Name](URL)` → separate name and URL fields
- **Topic Tags**: `"tag1|tag2|tag3"` → JSON array
- **Data Validation**: Type coercion, URL validation, range checking
- **Deduplication**: Unique constraint on `(date, genre, asin)`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/etl.spec.ts
```

### Test Coverage
- ✅ Filename parsing and genre mapping
- ✅ Author hyperlink extraction  
- ✅ Data validation and transformation
- ✅ Topic tag and boolean parsing
- ✅ Row deduplication and enrichment
- ✅ Error handling and rejection logging

## 🏗️ Architecture

### ETL Components
```
src/etl/
├── readXlsx.ts      # Excel file reading with hyperlink support
├── transform.ts     # Data validation and transformation
├── writeCsv.ts      # CSV output with UTF-8 encoding
├── loadDuckDb.ts    # DuckDB operations and schema management
├── upsertMongo.ts   # MongoDB sync with indexing
└── run.ts           # ETL orchestrator and CLI
```

### Data Contract
```
src/lib/
└── data-contract.ts # Schema definitions and validation rules
```

### Configuration
- **TypeScript**: Modern ES modules with strict type checking
- **Testing**: Vitest with comprehensive coverage
- **Database**: DuckDB for analytics, MongoDB for flexibility
- **Validation**: Robust error handling and logging

## 📈 Performance Features

### Efficient Processing
- **Batch Operations**: Bulk database inserts/updates
- **Streaming**: Large file handling without memory issues
- **Idempotent**: Safe to re-run ETL on same files
- **Parallel**: Multiple database operations

### Optimized Queries
- **DuckDB Indexes**: Genre, author, rating, rank, date, price
- **MongoDB Indexes**: Compound unique keys + text search
- **CSV Output**: Properly escaped UTF-8 encoding

## 🔧 Development Scripts

```bash
npm run etl           # Run ETL pipeline
npm run dev           # Start React development server
npm run dev:server    # Start Express API server
npm run build         # Build for production
npm run test          # Run test suite
npm run test:watch    # Run tests in watch mode
```

## 🐛 Troubleshooting

### Common Issues

**"Cannot find Excel files"**
- Ensure files are in `/data_raw/` directory
- Check filename pattern: `YYYYMMDD_<genre>_raw_data.xlsx`
- Verify file permissions

**"MongoDB connection failed"**
- Start MongoDB: `brew services start mongodb-community`
- Or skip MongoDB: `npm run etl -- --skip-mongo`

**"DuckDB file locked"**
- Close any open database connections
- Check file permissions in `./data/` directory

**"Memory issues with large files"**
- ETL processes files in batches automatically
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run etl`

### Validation Errors
Check log files in `/data_cleaned/logs/` for detailed error messages:
```bash
cat /data_cleaned/logs/20250811_fantasy.log
```

## 🎯 Next Steps

This ETL pipeline provides the foundation for:
- **Phase 3**: DuckDB schema and preset queries
- **Phase 4**: React web application scaffolding  
- **Phase 5**: Express API with DOCX export
- **Phase 6**: Image handling for book covers
- **Phase 7**: Selection-based DOCX export UX
- **Phase 8**: Search and preset query wiring

---

**Ready to process your book data!** 📚✨
