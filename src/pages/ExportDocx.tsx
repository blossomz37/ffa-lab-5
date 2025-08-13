import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { exportToDocx } from '../lib/api';
import type { BookData } from '../lib/api';

/**
 * ExportDocx page component for generating DOCX reports
 * - Accepts selected books from Home page via React Router state
 * - Provides export options and customization
 * - Handles download process and error states
 */
export default function ExportDocx() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get selected books from navigation state
  const selectedBookIds = (location.state?.selectedBooks as string[]) || [];
  
  // Component state
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<string>('');
  
  // Export options
  const [includeCovers, setIncludeCovers] = useState(true);
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [includePricing, setIncludePricing] = useState(true);
  const [includeRatings, setIncludeRatings] = useState(true);
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'rating' | 'price'>('title');

  // Load book details for selected books (mock for now)
  useEffect(() => {
    if (selectedBookIds.length === 0) {
      return;
    }

    // TODO: Fetch actual book details by IDs
    // For now, create mock data
    const mockBooks: BookData[] = selectedBookIds.map((id, index) => ({
      ingested_date: '2025-08-11',
      genre: ['Fantasy', 'Romance', 'Science Fiction'][index % 3],
      asin: id,
      title: `Sample Book ${index + 1}`,
      author: `Author ${index + 1}`,
      author_url: `https://amazon.com/author/${index + 1}`,
      series: index % 2 === 0 ? `Series ${index + 1}` : undefined,
      price: 3.99 + index * 2,
      rating: 4.0 + (index % 10) * 0.1,
      review_count: 100 + index * 50,
      rank_overall: 1000 + index * 100,
      release_date: '2025-07-01',
      publisher: `Publisher ${index % 3 + 1}`,
      blurb_text: `This is a sample description for book ${index + 1}. It contains exciting adventures and compelling characters.`,
      cover_url: `https://example.com/cover${index + 1}.jpg`,
      product_url: `https://amazon.com/dp/${id}`,
      topic_tags: `["tag${index + 1}", "tag${index + 2}"]`,
      subcategories: `Subcategory ${index % 2 + 1}`,
      has_supernatural: index % 3 === 0,
      has_romance: index % 2 === 0,
    }));

    setBooks(mockBooks);
  }, [selectedBookIds]);

  // Handle export process
  const handleExport = async () => {
    if (books.length === 0) {
      setError('No books selected for export');
      return;
    }

    setLoading(true);
    setError(null);
    setExportProgress('Preparing export data...');

    try {
      // Sort books according to user preference
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

      setExportProgress('Generating DOCX document...');
      
      // Call the API to generate DOCX
      const blob = await exportToDocx(sortedBooks);
      
      setExportProgress('Downloading file...');

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book-report-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportProgress('Export completed successfully!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
      setTimeout(() => setExportProgress(''), 3000);
    }
  };

  // If no books selected, show message
  if (selectedBookIds.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to Search
              </Link>
              <h1 className="text-2xl font-bold">Export to DOCX</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="text-muted-foreground mb-4">
              <svg className="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">No Books Selected</h2>
            <p className="text-muted-foreground mb-6">
              Please go back to the search page and select some books to export.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Go to Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Search
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Export to DOCX</h1>
              <p className="text-muted-foreground">
                {books.length} book{books.length !== 1 ? 's' : ''} selected for export
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Export Options */}
          <div className="lg:col-span-1">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Export Options</h3>
              
              {/* Content Options */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium">Include in Export</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeCovers}
                      onChange={(e) => setIncludeCovers(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Cover Images</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeDescriptions}
                      onChange={(e) => setIncludeDescriptions(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Book Descriptions</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includePricing}
                      onChange={(e) => setIncludePricing(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Pricing Information</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeRatings}
                      onChange={(e) => setIncludeRatings(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Ratings & Reviews</span>
                  </label>
                </div>
              </div>

              {/* Sort Options */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium">Sort Books By</h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="title">Title (A-Z)</option>
                  <option value="author">Author (A-Z)</option>
                  <option value="rating">Rating (High to Low)</option>
                  <option value="price">Price (Low to High)</option>
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={loading || books.length === 0}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Exporting...' : 'Generate DOCX'}
              </button>

              {/* Progress/Error Display */}
              {exportProgress && (
                <div className="mt-4 text-sm text-primary">
                  {exportProgress}
                </div>
              )}
              
              {error && (
                <div className="mt-4 text-sm text-destructive">
                  Error: {error}
                </div>
              )}
            </div>
          </div>

          {/* Book Preview */}
          <div className="lg:col-span-2">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Selected Books Preview</h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {books.map((book, index) => (
                  <div key={book.asin} className="flex gap-4 p-3 border rounded">
                    {includeCovers && book.cover_url && (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{book.title}</h4>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      {includeRatings && book.rating && (
                        <p className="text-sm">
                          ⭐ {book.rating.toFixed(1)} ({book.review_count} reviews)
                        </p>
                      )}
                      {includePricing && book.price && (
                        <p className="text-sm font-medium">${book.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
