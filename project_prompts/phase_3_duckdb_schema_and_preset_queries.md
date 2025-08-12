# DuckDB Schema + Preset Queries
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
Include SQL optimized for DuckDB (use parameterized queries).
```

