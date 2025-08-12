# Search + Preset Query Wiring
## Prompt:
```
Wire Filters + Presets:
- Presets call the appropriate /query/* endpoints.
- SearchBar debounces 300ms and calls /query/search?text=...
- Filters (genre, rating, minReviews) propagate to the query URL.
- Keep URL in sync (query params) so state is shareable.
- Add a `useQueryState()` hook that parses/builds URLs.
```

# Testing & Verification

## Prompt:
```
Add tests:
- tests/filename-parse.spec.ts  // ensure date+genre parsing is correct for several samples
- tests/transform.spec.ts       // coercions, URL validation, numeric ranges
- tests/duckdb-roundtrip.spec.ts// insert sample rows, query presets, assert shapes
- tests/export-docx.spec.ts     // generate a .docx from 3 rows; assert file created

Add `npm scripts`: test, test:watch, dev (client), dev:server, etl.
Provide a README.md with "Getting Started" and "Common Issues".
```

# Critic → Builder → Tester Loop
**After any sizeable code dump**
## Prompt:
```
Act as a code reviewer. List the top 10 concrete risks/bugs in the files you just produced. For each, propose a precise patch (file path + diff-like snippet).

Then feed those patches back with:

Apply the above patches. Return updated files only.

Finish with:

Generate a minimal script of commands I can run to verify end-to-end:
- prepare folders
- run ETL on one file
- start server + client
- run a preset query and export a docx
⸻