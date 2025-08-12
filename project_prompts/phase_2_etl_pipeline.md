# ETL Pipeline (CLI + library)

## Prompt:
```
Build a Node CLI to run ETL:
Files to create:
- src/etl/readXlsx.ts           // read and normalize a single xlsx
- src/etl/transform.ts          // coerce types, map fields, validate
- src/etl/writeCsv.ts           // write cleaned CSV to /data_cleaned
- src/etl/loadDuckDb.ts         // create/append to ./data/library.duckdb (duckdb npm)
- src/etl/upsertMongo.ts        // upsert into mongodb://127.0.0.1:27017/ffa
- src/etl/run.ts                // orchestrator, logs, CLI args
- scripts/etl.ts                // bin script: `node scripts/etl.ts`

Requirements:
- Discover files like /data_raw/*_raw_data.xlsx
- Parse date + genre_key from filename (per data contract)
- Validate each row with validateRow() from data-contract.ts
- Emit reject log with line#, reason
- Idempotent (safe to re-run); use temp table then MERGE/INSERT
- Add comments explaining each step
- Provide sample unit tests in tests/etl.spec.ts (vitest)

## Development Order:
1. Start with readXlsx.ts + basic test
2. Add transform.ts + validation tests  
3. Test writeCsv.ts with sample data
4. Create minimal DuckDB connection test
5. Only then build the full pipeline

## Error Handling Strategy:
- Log the exact error type and database driver version
- Include SQL statement and parameters in error logs
- Create fallback strategies (e.g., string interpolation vs prepared statements)
- Test error conditions explicitly

Return complete files with imports and package.json updates (scripts: "etl": "tsx scripts/etl.ts").
```
