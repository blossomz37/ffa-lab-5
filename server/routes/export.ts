import express from 'express';
import { generateBookReport, generateFilename, BookExportData, ExportOptions } from '../docx';

const router = express.Router();

/**
 * Export Routes
 * Handles DOCX generation and download functionality
 */

/**
 * POST /export/docx
 * Generate and download a DOCX report from book data
 * Body: { books: BookExportData[], options?: ExportOptions }
 */
router.post('/docx', async (req, res) => {
  try {
    const { books, options = {} } = req.body;
    
    // Validate input
    if (!books || !Array.isArray(books) || books.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Books array is required and must not be empty',
      });
    }
    
    console.log(`📄 Generating DOCX for ${books.length} books...`);
    
    // Generate the DOCX document
    const buffer = await generateBookReport(books as BookExportData[], options as ExportOptions);
    
    // Generate unique filename
    const filename = generateFilename('book-report');
    
    console.log(`✅ DOCX generated successfully: ${filename} (${buffer.length} bytes)`);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    
    // Send the file
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ DOCX export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate DOCX document',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /export/preview
 * Generate a preview of what will be included in the export
 * Body: { books: BookExportData[], options?: ExportOptions }
 */
router.post('/preview', async (req, res) => {
  try {
    const { books, options = {} } = req.body;
    
    // Validate input
    if (!books || !Array.isArray(books) || books.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Books array is required and must not be empty',
      });
    }
    
    const {
      includeCovers = true,
      includeDescriptions = true,
      includePricing = true,
      includeRatings = true,
      sortBy = 'title',
      title = 'Book Analytics Report'
    } = options as ExportOptions;
    
    // Sort books according to preference
    const sortedBooks = [...books].sort((a: BookExportData, b: BookExportData) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return a.author.localeCompare(b.author);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'price':
          return (a.price || 0) - (b.price || 0);
        default:
          return 0;
      }
    });
    
    // Calculate statistics
    const uniqueAuthors = new Set(sortedBooks.map(b => b.author)).size;
    const uniqueGenres = new Set(sortedBooks.map(b => b.genre)).size;
    
    const booksWithRating = sortedBooks.filter(b => b.rating && b.rating > 0);
    const avgRating = booksWithRating.length > 0 
      ? booksWithRating.reduce((sum, b) => sum + (b.rating || 0), 0) / booksWithRating.length
      : 0;
    
    const booksWithPrice = sortedBooks.filter(b => b.price && b.price > 0);
    const avgPrice = booksWithPrice.length > 0
      ? booksWithPrice.reduce((sum, b) => sum + (b.price || 0), 0) / booksWithPrice.length
      : 0;
    
    // Return preview data
    res.json({
      success: true,
      preview: {
        title,
        totalBooks: sortedBooks.length,
        uniqueAuthors,
        uniqueGenres,
        avgRating: Math.round(avgRating * 10) / 10,
        avgPrice: Math.round(avgPrice * 100) / 100,
        options: {
          includeCovers,
          includeDescriptions,
          includePricing,
          includeRatings,
          sortBy,
        },
        sampleBooks: sortedBooks.slice(0, 3), // First 3 books as preview
        estimatedFileSize: `${Math.round(sortedBooks.length * 2.5)}KB`, // Rough estimate
      },
    });
    
  } catch (error) {
    console.error('❌ Export preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate export preview',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /export/formats
 * Get available export formats and their descriptions
 */
router.get('/formats', (req, res) => {
  res.json({
    success: true,
    formats: [
      {
        name: 'DOCX',
        extension: '.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        description: 'Microsoft Word document format',
        features: [
          'Professional formatting',
          'Tables and statistics',
          'Customizable content sections',
          'Compatible with Word, Google Docs, LibreOffice',
        ],
        endpoint: '/export/docx',
      },
    ],
  });
});

export default router;
