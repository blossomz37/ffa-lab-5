#!/usr/bin/env node

/**
 * Mock server that reads CSV files directly
 * Bypasses DuckDB connection issues for previewing the frontend
 */

import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

// CORS middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
  credentials: true,
}));

app.use(express.json());

// In-memory data store
let books: any[] = [];

// Load CSV data on startup
async function loadCSVData() {
  console.log('📚 Loading CSV data...');
  
  const csvDir = './data_cleaned';
  const files = await fs.readdir(csvDir);
  const csvFiles = files.filter(f => f.endsWith('.csv'));
  
  for (const csvFile of csvFiles) {
    try {
      const csvPath = path.join(csvDir, csvFile);
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length === headers.length) {
            const book: any = {};
            headers.forEach((header, index) => {
              book[header] = values[index];
            });
            
            // Convert numeric fields
            book.price = parseFloat(book.price) || 0;
            book.rating = parseFloat(book.rating) || 0;
            book.review_count = parseInt(book.review_count) || 0;
            book.rank_overall = parseInt(book.rank_overall) || 0;
            book.has_supernatural = book.has_supernatural === 'true';
            book.has_romance = book.has_romance === 'true';
            book.cover_ok = book.cover_ok === 'true';
            
            books.push(book);
          }
        }
      }
      
      console.log(`  ✓ Loaded ${csvFile}`);
    } catch (error) {
      console.error(`  ✗ Failed to load ${csvFile}:`, error);
    }
  }
  
  console.log(`📊 Total books loaded: ${books.length}`);
}

// Simple CSV parser (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, ''));
}

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    booksLoaded: books.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/query/top-rated', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const minReviews = parseInt(req.query.minReviews as string) || 0;
    
    const filtered = books
      .filter(book => book.rating && book.review_count >= minReviews)
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.review_count - a.review_count;
      })
      .slice(0, limit)
      .map((book, index) => ({
        ...book,
        rank_position: index + 1
      }));
    
    res.json(filtered);
  } catch (error) {
    console.error('Error in top-rated query:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

app.get('/query/by-genre', (req, res) => {
  try {
    const genre = req.query.genre as string;
    const limit = parseInt(req.query.limit as string) || 100;
    
    let filtered = books;
    if (genre) {
      filtered = books.filter(book => book.genre === genre);
    }
    
    const sorted = filtered
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
    
    res.json(sorted);
  } catch (error) {
    console.error('Error in by-genre query:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

app.get('/query/search', (req, res) => {
  try {
    const query = (req.query.q as string || '').toLowerCase();
    const limit = parseInt(req.query.limit as string) || 100;
    
    const filtered = books
      .filter(book => 
        book.title?.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query) ||
        book.series?.toLowerCase().includes(query)
      )
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
    
    res.json(filtered);
  } catch (error) {
    console.error('Error in search query:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Start server
async function start() {
  await loadCSVData();
  
  app.listen(PORT, () => {
    console.log(`\n🎉 Mock server running!`);
    console.log(`📍 API: http://localhost:${PORT}`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log(`📊 Top books: http://localhost:${PORT}/query/top-rated`);
    console.log(`\n👉 Now start frontend: npm run dev`);
  });
}

start().catch(console.error);