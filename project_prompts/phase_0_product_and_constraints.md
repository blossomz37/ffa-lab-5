# Product + Constraints (1–pager you paste before any codegen)

## Goal summary:
	•	Local web app that reads Excel files in /data_raw/, runs ETL → outputs clean CSVs to /data_cleaned/, ingests to DuckDB for querying.
	•	UI needs: clickable hyperlinks, inline cover images (if a cell is a URL to an image, render it), preset queries with dropdown filters, free‑text search, export of query results to .docx.
	•	Run everything locally; simple start script; minimal dependencies.

## PROMPT:
```
You are a senior full‑stack engineer.

Target stack:
- Node.js + Vite + React + TypeScript + shadcn/ui
- DuckDB (node binding on the server; optional DuckDB‑WASM for client previews)
- Express API for ETL triggers, queries, and .docx export

OS paths:
  - RAW XLSX: /data_raw
  - CLEAN CSV: /data_cleaned

Database:
  - DuckDB file: ./data/library.duckdb
  - **IMPORTANT**: Pin DuckDB version to 1.1.x or test driver compatibility first
  - Alternative: Consider SQLite with better-drizzle for complex queries if DuckDB issues persist
  - Document any known driver limitations

## Technology Risk Assessment:
- DuckDB: Newer database, test driver stability first
- Excel parsing: XLSX library mature, low risk
- TypeScript: Stable, medium complexity
- React + Vite: Stable, low risk

## Mitigation Strategies:
- Create driver compatibility tests before building on top
- Have fallback approaches documented
- Pin all dependency versions in package.json

## Development Workflow:
1. Phase N: Create minimal working example
2. Phase N+0.5: Test and validate approach  
3. Phase N+1: Build full feature
4. Always commit working states before major changes
5. Document any workarounds or driver issues encountered

Coding standards:
  - Provide complete, runnable files with paths.
  - Add comments to explain each function/prop (I’m learning).
  - Include minimal tests for parsing, transforms, and queries.
  - Prefer pure, composable modules.
When uncertain, make a sensible default and document it.

Goal:
- Local web app to read Excel files, run ETL → cleaned CSV → DuckDB.
- UI shows clickable hyperlinks and inline cover images.
- Preset queries + filters + search.
- Export selected rows to .docx.
```