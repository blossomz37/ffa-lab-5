import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';

/**
 * DOCX generation utilities for book export functionality
 * Uses the 'docx' package to create professional Word documents
 */

export interface BookExportData {
  ingested_date: string;
  genre: string;
  asin: string;
  title: string;
  author: string;
  author_url?: string;
  series?: string;
  price?: number;
  rating?: number;
  review_count?: number;
  rank_overall?: number;
  release_date?: string;
  publisher?: string;
  blurb_text?: string;
  cover_url?: string;
  product_url?: string;
  topic_tags?: string;
  subcategories?: string;
  has_supernatural?: boolean;
  has_romance?: boolean;
}

export interface ExportOptions {
  includeCovers?: boolean;
  includeDescriptions?: boolean;
  includePricing?: boolean;
  includeRatings?: boolean;
  sortBy?: 'title' | 'author' | 'rating' | 'price';
  title?: string;
}

/**
 * Generate a DOCX document from book data
 */
export async function generateBookReport(
  books: BookExportData[], 
  options: ExportOptions = {}
): Promise<Buffer> {
  
  const {
    includeCovers = true,
    includeDescriptions = true, 
    includePricing = true,
    includeRatings = true,
    sortBy = 'title',
    title = 'Book Analytics Report'
  } = options;

  // Sort books according to preference
  const sortedBooks = [...books].sort((a, b) => {
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

  // Create document sections
  const children: (Paragraph | Table)[] = [];

  // Title page
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Generated on ${new Date().toLocaleDateString()}`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `${sortedBooks.length} books included`,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }), // Empty paragraph for spacing
  );

  // Summary statistics
  if (sortedBooks.length > 0) {
    const stats = calculateStats(sortedBooks);
    
    children.push(
      new Paragraph({
        text: 'Summary Statistics',
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Total Books: ', bold: true }),
          new TextRun(sortedBooks.length.toString()),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Unique Authors: ', bold: true }),
          new TextRun(stats.uniqueAuthors.toString()),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Genres Represented: ', bold: true }),
          new TextRun(stats.uniqueGenres.toString()),
        ],
      }),
    );

    if (includeRatings && stats.avgRating > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Average Rating: ', bold: true }),
            new TextRun(`${stats.avgRating.toFixed(1)}★`),
          ],
        }),
      );
    }

    if (includePricing && stats.avgPrice > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Average Price: ', bold: true }),
            new TextRun(`$${stats.avgPrice.toFixed(2)}`),
          ],
        }),
      );
    }

    children.push(new Paragraph({ text: '' })); // Spacing
  }

  // Book details
  children.push(
    new Paragraph({
      text: 'Book Details',
      heading: HeadingLevel.HEADING_1,
    }),
  );

  // Create table with book information
  const tableRows: TableRow[] = [];

  // Header row
  const headerCells = [
    new TableCell({
      children: [new Paragraph({ text: 'Title', alignment: AlignmentType.CENTER })],
      width: { size: 25, type: WidthType.PERCENTAGE },
    }),
    new TableCell({
      children: [new Paragraph({ text: 'Author', alignment: AlignmentType.CENTER })],
      width: { size: 20, type: WidthType.PERCENTAGE },
    }),
    new TableCell({
      children: [new Paragraph({ text: 'Genre', alignment: AlignmentType.CENTER })],
      width: { size: 15, type: WidthType.PERCENTAGE },
    }),
  ];

  if (includeRatings) {
    headerCells.push(
      new TableCell({
        children: [new Paragraph({ text: 'Rating', alignment: AlignmentType.CENTER })],
        width: { size: 10, type: WidthType.PERCENTAGE },
      }),
    );
  }

  if (includePricing) {
    headerCells.push(
      new TableCell({
        children: [new Paragraph({ text: 'Price', alignment: AlignmentType.CENTER })],
        width: { size: 10, type: WidthType.PERCENTAGE },
      }),
    );
  }

  if (includeDescriptions) {
    headerCells.push(
      new TableCell({
        children: [new Paragraph({ text: 'Description', alignment: AlignmentType.CENTER })],
        width: { size: 20, type: WidthType.PERCENTAGE },
      }),
    );
  }

  tableRows.push(new TableRow({ children: headerCells }));

  // Data rows
  sortedBooks.forEach((book) => {
    const cells = [
      new TableCell({
        children: [new Paragraph(book.title)],
      }),
      new TableCell({
        children: [new Paragraph(book.author)],
      }),
      new TableCell({
        children: [new Paragraph(book.genre)],
      }),
    ];

    if (includeRatings) {
      cells.push(
        new TableCell({
          children: [new Paragraph(book.rating ? `${book.rating.toFixed(1)}★` : 'N/A')],
        }),
      );
    }

    if (includePricing) {
      cells.push(
        new TableCell({
          children: [new Paragraph(book.price ? `$${book.price.toFixed(2)}` : 'N/A')],
        }),
      );
    }

    if (includeDescriptions) {
      const description = book.blurb_text
        ? book.blurb_text.length > 150
          ? book.blurb_text.substring(0, 150) + '...'
          : book.blurb_text
        : 'No description available';
      
      cells.push(
        new TableCell({
          children: [new Paragraph(description)],
        }),
      );
    }

    tableRows.push(new TableRow({ children: cells }));
  });

  const table = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });

  children.push(table);

  // Create and pack the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Calculate summary statistics for a set of books
 */
function calculateStats(books: BookExportData[]) {
  const uniqueAuthors = new Set(books.map(b => b.author)).size;
  const uniqueGenres = new Set(books.map(b => b.genre)).size;
  
  const booksWithRating = books.filter(b => b.rating && b.rating > 0);
  const avgRating = booksWithRating.length > 0 
    ? booksWithRating.reduce((sum, b) => sum + (b.rating || 0), 0) / booksWithRating.length
    : 0;
  
  const booksWithPrice = books.filter(b => b.price && b.price > 0);
  const avgPrice = booksWithPrice.length > 0
    ? booksWithPrice.reduce((sum, b) => sum + (b.price || 0), 0) / booksWithPrice.length
    : 0;

  return {
    uniqueAuthors,
    uniqueGenres,
    avgRating,
    avgPrice,
  };
}

/**
 * Generate a unique filename for the export
 */
export function generateFilename(prefix: string = 'book-report'): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomSuffix}.docx`;
}
