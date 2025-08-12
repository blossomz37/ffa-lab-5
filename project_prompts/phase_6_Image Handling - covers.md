# Image Handling (covers)
## Prompt:
```
Add cover image rendering:
- In DataTable, render cover_url as <img loading="lazy"> with max-height: 64px; fallback to a placeholder if 404.
- Add a small `probeImage(url:string):Promise<boolean>` on server side used during ETL to mark invalid links; skip inline rendering for invalid.
- Store a boolean `cover_ok` in DuckDB; DataTable only renders when true. Update schema + ETL accordingly.
```

