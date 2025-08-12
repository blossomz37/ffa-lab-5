# DuckDB Schema + Preset Queries

## ⚠️ CRITICAL: Database Driver Testing
Before creating queries:
1. Create a simple test file to verify parameter binding works
2. Test both `?` placeholders and `$1, $2` syntax
3. If parameter binding fails, use string interpolation with proper escaping
4. Document which approach is being used and why

## Prompt (creates schema + query library + tests):
```
Create:
- src/db/schema.sql        // CREATE TABLE IF NOT EXISTS books (...)
- src/db/queries.ts        // typed query helpers for React
- tests/queries.spec.ts    // vitest: verify presets

Preset queries (export as functions):
- topRated(genre?:string, minReviews=100, limit=50)
- movers(genre?:string, minDeltaRank=50, windowDays=7)
- priceBands(genre?:string)  // counts per price bucket
- authorSearch(query:string, limit=50)
- newTitlesOn(date:string, genre?:string)

Each function returns a typed array matching CleanRow or an aggregate type.
Include SQL optimized for DuckDB.
⚠️ NOTE: Use string interpolation if prepared statements fail with driver.
Test parameter binding approach before implementing all queries.
```

