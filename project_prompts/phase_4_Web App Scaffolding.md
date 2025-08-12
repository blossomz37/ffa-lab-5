# Web App Scaffolding (Vite + shadcn/ui)

## Prompt:
```
Scaffold a Vite + React + TypeScript app:
Files:
- index.html, src/main.tsx, src/App.tsx
- src/components/DataTable.tsx   // renders results, shows link cells clickable; cover_url renders <img>
- src/components/Filters.tsx     // genre dropdown, rating slider, min reviews
- src/components/SearchBar.tsx   // full-text search box wired to author/title
- src/components/PresetPicker.tsx// select preset query (topRated, movers, etc.)
- src/lib/api.ts                 // api client (fetch to local Node endpoints)
- src/routes/Home.tsx
- src/routes/ExportDocx.tsx
- src/styles/globals.css

UI behavior:
- User selects a preset query + optional filters → table updates
- Hyperlinks clickable; images display with aspect-cover, max-height row
- Client-side pagination and column sort
- Error boundary + loading states

Use shadcn/ui for Button, Select, Input, Table, Card.
Add concise comments in each component.
```

