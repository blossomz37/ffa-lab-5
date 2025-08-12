# Local API (Express) + DuckDB access + .docx export
## Prompt:
```
Create an Express server:

Files:
- server/index.ts
- server/routes/etl.ts       // POST /etl/run -> triggers ETL
- server/routes/query.ts     // GET /query/top-rated?... etc. (DuckDB-backed)
- server/routes/export.ts    // POST /export/docx { rows: CleanRow[] } -> .docx
- server/duck.ts             // singleton DuckDB handle
- server/docx.ts             // .docx generation via 'docx' package

Notes:
- CORS for localhost:5173
- Validate params; return typed JSON
- Stream .docx with unique filename
```

