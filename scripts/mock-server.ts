#!/usr/bin/env node

/**
 * Production CSV-based API Server
 * Serves book data directly from CSV files with advanced querying capabilities
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { promises as fs } from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType } from 'docx';

const app = express();
const PORT = 3001;

// Security and logging middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory data store with metadata
interface BookRecord {
  ingested_date: string;
  genre: string;
  asin: string;
  title: string;
  author: string;
  author_url?: string;
  series?: string;
  price: number;
  rating: number;
  review_count: number;
  rank_overall: number;
  release_date?: string;
  publisher?: string;
  blurb_text?: string;
  cover_url?: string;
  product_url?: string;
  topic_tags?: string;
  subcategories?: string;
  blurb_keyphrases?: string;
  estimated_pov?: string;
  has_supernatural: boolean;
  has_romance: boolean;
  cover_ok: boolean;
}

let books: BookRecord[] = [];
let genreStats: Map<string, any> = new Map();
let authorStats: Map<string, any> = new Map();

// Load CSV data on startup
async function loadCSVData() {
  console.log('📚 Loading CSV data...');
  
  const csvDir = './data_cleaned';
  
  try {
    const files = await fs.readdir(csvDir);
    const csvFiles = files.filter(f => f.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      console.warn('⚠️  No CSV files found in', csvDir);
      return;
    }
    
    for (const csvFile of csvFiles) {
      try {
        const csvPath = path.join(csvDir, csvFile);
        const csvContent = await fs.readFile(csvPath, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
          let fileBookCount = 0;
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === headers.length) {
              const book: any = {};
              headers.forEach((header, index) => {
                book[header] = values[index];
              });
              
              // Convert and validate data types
              book.price = parseFloat(book.price) || 0;
              book.rating = parseFloat(book.rating) || 0;
              book.review_count = parseInt(book.review_count) || 0;
              book.rank_overall = parseInt(book.rank_overall) || 0;
              book.has_supernatural = book.has_supernatural === 'true';
              book.has_romance = book.has_romance === 'true';
              book.cover_ok = book.cover_ok === 'true';
              
              // Validate required fields
              if (book.asin && book.title && book.author) {
                books.push(book as BookRecord);
                fileBookCount++;
              }
            }
          }
          
          console.log(`  ✓ Loaded ${csvFile} (${fileBookCount} books)`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to load ${csvFile}:`, error);
      }
    }
    
    // Calculate statistics
    calculateStatistics();
    
    console.log(`📊 Total books loaded: ${books.length}`);
    console.log(`📈 Genres: ${genreStats.size}, Authors: ${authorStats.size}`);
    
  } catch (error) {
    console.error('❌ Failed to load CSV data:', error);
  }
}

// Calculate genre and author statistics
function calculateStatistics() {
  genreStats.clear();
  authorStats.clear();
  
  books.forEach(book => {
    // Genre stats
    if (!genreStats.has(book.genre)) {
      genreStats.set(book.genre, {
        genre: book.genre,
        total_books: 0,
        unique_authors: new Set(),
        total_rating: 0,
        total_price: 0,
        total_reviews: 0,
        supernatural_count: 0,
        romance_count: 0
      });
    }
    
    const genreStat = genreStats.get(book.genre)!;
    genreStat.total_books++;
    genreStat.unique_authors.add(book.author);
    genreStat.total_rating += book.rating;
    genreStat.total_price += book.price;
    genreStat.total_reviews += book.review_count;
    if (book.has_supernatural) genreStat.supernatural_count++;
    if (book.has_romance) genreStat.romance_count++;
    
    // Author stats
    if (!authorStats.has(book.author)) {
      authorStats.set(book.author, {
        author: book.author,
        total_books: 0,
        total_rating: 0,
        genres: new Set()
      });
    }
    
    const authorStat = authorStats.get(book.author)!;
    authorStat.total_books++;
    authorStat.total_rating += book.rating;
    authorStat.genres.add(book.genre);
  });
  
  // Calculate averages
  genreStats.forEach(stat => {
    stat.avg_rating = stat.total_rating / stat.total_books;
    stat.avg_price = stat.total_price / stat.total_books;
    stat.avg_reviews = stat.total_reviews / stat.total_books;
    stat.unique_authors = stat.unique_authors.size;
  });
  
  authorStats.forEach(stat => {
    stat.avg_rating = stat.total_rating / stat.total_books;
    stat.genres = Array.from(stat.genres);
  });
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
    const genre = req.query.genre as string;
    const minRating = parseFloat(req.query.minRating as string) || 0;
    const maxRating = parseFloat(req.query.maxRating as string) || 5;
    const minReviews = parseInt(req.query.minReviews as string) || 0;
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 999;
    const hasSupernatural = req.query.hasSupernatural === 'true';
    const hasRomance = req.query.hasRomance === 'true';
    const limit = parseInt(req.query.limit as string) || 100;
    
    let filtered = books.filter(book => {
      // Text search
      if (query && !book.title?.toLowerCase().includes(query) && 
          !book.author?.toLowerCase().includes(query) && 
          !book.series?.toLowerCase().includes(query)) {
        return false;
      }
      
      // Genre filter
      if (genre && book.genre !== genre) return false;
      
      // Rating filter
      if (book.rating < minRating || book.rating > maxRating) return false;
      
      // Review count filter
      if (book.review_count < minReviews) return false;
      
      // Price filter
      if (book.price < minPrice || book.price > maxPrice) return false;
      
      // Boolean filters
      if (req.query.hasSupernatural !== undefined && book.has_supernatural !== hasSupernatural) return false;
      if (req.query.hasRomance !== undefined && book.has_romance !== hasRomance) return false;
      
      return true;
    });
    
    // Sort by relevance (rating + review count)
    filtered.sort((a, b) => {
      const scoreA = a.rating * Math.log(a.review_count + 1);
      const scoreB = b.rating * Math.log(b.review_count + 1);
      return scoreB - scoreA;
    });
    
    res.json(filtered.slice(0, limit));
  } catch (error) {
    console.error('Error in search query:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Genre statistics endpoint
app.get('/query/genre-stats', (req, res) => {
  try {
    const stats = Array.from(genreStats.values()).map(stat => ({
      genre: stat.genre,
      total_books: stat.total_books,
      unique_authors: stat.unique_authors,
      avg_rating: Math.round(stat.avg_rating * 100) / 100,
      avg_price: Math.round(stat.avg_price * 100) / 100,
      avg_reviews: Math.round(stat.avg_reviews),
      supernatural_count: stat.supernatural_count,
      romance_count: stat.romance_count,
      percentage_of_total: Math.round((stat.total_books / books.length) * 100 * 100) / 100
    }));
    
    res.json(stats);
  } catch (error) {
    console.error('Error in genre-stats query:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Author search endpoint
app.get('/query/author-search', (req, res) => {
  try {
    const author = (req.query.author as string || '').toLowerCase();
    const minBooks = parseInt(req.query.minBooks as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const authorData = Array.from(authorStats.entries())
      .filter(([name, stats]) => 
        name.toLowerCase().includes(author) && stats.total_books >= minBooks
      )
      .map(([name, stats]) => ({
        author: name,
        total_books: stats.total_books,
        avg_rating: Math.round(stats.avg_rating * 100) / 100,
        genres: stats.genres
      }))
      .sort((a, b) => b.total_books - a.total_books)
      .slice(0, limit);
    
    res.json(authorData);
  } catch (error) {
    console.error('Error in author-search query:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Price bands analysis
app.get('/query/price-bands', (req, res) => {
  try {
    const genre = req.query.genre as string;
    let targetBooks = genre ? books.filter(b => b.genre === genre) : books;
    
    const priceBands = [
      { tier: 'Free', min: 0, max: 0 },
      { tier: 'Budget', min: 0.01, max: 2.99 },
      { tier: 'Standard', min: 3.00, max: 7.99 },
      { tier: 'Premium', min: 8.00, max: 15.99 },
      { tier: 'Luxury', min: 16.00, max: 999 }
    ];
    
    const results = priceBands.map(band => {
      const booksInBand = targetBooks.filter(book => 
        book.price >= band.min && book.price <= band.max
      );
      
      if (booksInBand.length === 0) {
        return {
          price_tier: band.tier,
          book_count: 0,
          avg_rating: 0,
          avg_review_count: 0,
          min_price: band.min,
          max_price: band.max,
          avg_price: 0,
          percentage_of_total: 0
        };
      }
      
      return {
        price_tier: band.tier,
        book_count: booksInBand.length,
        avg_rating: Math.round((booksInBand.reduce((sum, book) => sum + book.rating, 0) / booksInBand.length) * 100) / 100,
        avg_review_count: Math.round(booksInBand.reduce((sum, book) => sum + book.review_count, 0) / booksInBand.length),
        min_price: Math.min(...booksInBand.map(book => book.price)),
        max_price: Math.max(...booksInBand.map(book => book.price)),
        avg_price: Math.round((booksInBand.reduce((sum, book) => sum + book.price, 0) / booksInBand.length) * 100) / 100,
        percentage_of_total: Math.round((booksInBand.length / targetBooks.length) * 100 * 100) / 100
      };
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error in price-bands query:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// New titles endpoint (recent releases)
app.get('/query/new-titles', (req, res) => {
  try {
    const genre = req.query.genre as string;
    const daysBack = parseInt(req.query.daysBack as string) || 30;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    let filtered = books.filter(book => {
      if (genre && book.genre !== genre) return false;
      if (book.release_date) {
        const releaseDate = new Date(book.release_date);
        return releaseDate >= cutoffDate;
      }
      return false;
    });
    
    // Add days since release calculation
    const withDays = filtered.map(book => ({
      ...book,
      is_new_release: true,
      days_since_release: Math.floor((Date.now() - new Date(book.release_date!).getTime()) / (1000 * 60 * 60 * 24))
    }));
    
    // Sort by newest first
    withDays.sort((a, b) => a.days_since_release - b.days_since_release);
    
    res.json(withDays.slice(0, limit));
  } catch (error) {
    console.error('Error in new-titles query:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// DOCX Export endpoint
app.post('/export/docx', async (req, res) => {
  try {
    const { books: selectedBooks, title = 'Book Analytics Report' } = req.body;
    
    if (!selectedBooks || !Array.isArray(selectedBooks) || selectedBooks.length === 0) {
      return res.status(400).json({ error: 'No books provided for export' });
    }
    
    console.log(`📄 Generating DOCX report for ${selectedBooks.length} books...`);
    
    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          // Summary paragraph
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on ${new Date().toLocaleDateString()} | ${selectedBooks.length} books`,
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),
          
          // Books table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Title', bold: true })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Author', bold: true })] })],
                    width: { size: 20, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Genre', bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Rating', bold: true })] })],
                    width: { size: 10, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Reviews', bold: true })] })],
                    width: { size: 10, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Price', bold: true })] })],
                    width: { size: 10, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'ASIN', bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                ]
              }),
              
              // Data rows
              ...selectedBooks.map((book: BookRecord) => new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: book.title || 'N/A' })] })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: book.author || 'N/A' })] })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: book.genre || 'N/A' })] })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: book.rating ? book.rating.toFixed(1) : 'N/A' })] 
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: book.review_count ? book.review_count.toString() : 'N/A' })] 
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: book.price ? `$${book.price.toFixed(2)}` : 'N/A' })] 
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: book.asin || 'N/A' })] })]
                  }),
                ]
              }))
            ]
          }),
        ]
      }]
    });
    
    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Set response headers
    const filename = `book-report-${new Date().toISOString().split('T')[0]}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Length', buffer.length);
    
    console.log(`✅ DOCX report generated: ${filename} (${buffer.length} bytes)`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ DOCX export error:', error);
    res.status(500).json({ error: 'Failed to generate DOCX report' });
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