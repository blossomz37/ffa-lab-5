import React, { useState, useMemo } from 'react';
import { BookData } from '../lib/api';

interface DataTableProps {
  data: BookData[];
  loading?: boolean;
  onSelectionChange?: (selectedBooks: BookData[]) => void;
}

/**
 * DataTable component for displaying book data with sorting, pagination, and selection
 * - Renders clickable hyperlinks for author_url and product_url
 * - Shows cover images when cover_url is available
 * - Supports column sorting and pagination
 * - Allows row selection for export functionality
 */
export default function DataTable({ data, loading = false, onSelectionChange }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof BookData | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [itemsPerPage] = useState(25);

  // Sort the data based on current sort settings
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, sortColumn, sortDirection]);

  // Paginate the sorted data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Handle column header click for sorting
  const handleSort = (column: keyof BookData) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Handle row selection for export
  const handleRowSelect = (asin: string, selected: boolean) => {
    const newSelected = new Set(selectedBooks);
    if (selected) {
      newSelected.add(asin);
    } else {
      newSelected.delete(asin);
    }
    setSelectedBooks(newSelected);

    // Notify parent component of selection changes
    const selectedData = data.filter(book => newSelected.has(book.asin));
    onSelectionChange?.(selectedData);
  };

  // Handle select all/none
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const newSelected = new Set(data.map(book => book.asin));
      setSelectedBooks(newSelected);
      onSelectionChange?.(data);
    } else {
      setSelectedBooks(new Set());
      onSelectionChange?.([]);
    }
  };

  // Render clickable link or plain text
  const renderLink = (text: string, url?: string) => {
    if (url && url.startsWith('http')) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="clickable-link"
        >
          {text}
        </a>
      );
    }
    return text;
  };

  // Render cover image or placeholder
  const renderCover = (book: BookData) => {
    // Only render image if cover_ok is true
    if (book.cover_ok && book.cover_url && book.cover_url.startsWith('http')) {
      return (
        <img
          src={book.cover_url}
          alt={`Cover of ${book.title}`}
          className="book-cover"
          loading="lazy"
          style={{ maxHeight: '64px', width: 'auto' }}
          onError={(e) => {
            // Hide broken images and show placeholder
            e.currentTarget.style.display = 'none';
            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
            if (placeholder) {
              placeholder.style.display = 'flex';
            }
          }}
        />
      );
    }
    return (
      <div 
        className="book-cover bg-muted flex items-center justify-center text-xs border rounded"
        style={{ height: '64px', width: '48px', fontSize: '10px' }}
      >
        No Cover
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading book data...</div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No books found. Try adjusting your filters or search query.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedData.length} of {sortedData.length} books
          {selectedBooks.size > 0 && ` (${selectedBooks.size} selected)`}
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedBooks.size === data.length && data.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-border"
            />
            Select All
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    checked={selectedBooks.size === paginatedData.length && paginatedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border"
                  />
                </th>
                <th className="w-20">Cover</th>
                <th 
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleSort('title')}
                >
                  Title {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleSort('author')}
                >
                  Author {sortColumn === 'author' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleSort('genre')}
                >
                  Genre {sortColumn === 'genre' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleSort('rating')}
                >
                  Rating {sortColumn === 'rating' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleSort('price')}
                >
                  Price {sortColumn === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleSort('review_count')}
                >
                  Reviews {sortColumn === 'review_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Series</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((book) => (
                <tr key={book.asin} className="hover:bg-muted/30">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedBooks.has(book.asin)}
                      onChange={(e) => handleRowSelect(book.asin, e.target.checked)}
                      className="rounded border-border"
                    />
                  </td>
                  <td>
                    {renderCover(book)}
                  </td>
                  <td className="font-medium">
                    {renderLink(book.title, book.product_url)}
                  </td>
                  <td>
                    {renderLink(book.author, book.author_url)}
                  </td>
                  <td>
                    <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                      {book.genre}
                    </span>
                  </td>
                  <td>
                    {book.rating ? (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        {book.rating.toFixed(1)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    {book.price !== undefined ? (
                      book.price === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        `$${book.price.toFixed(2)}`
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    {book.review_count ? book.review_count.toLocaleString() : '—'}
                  </td>
                  <td className="text-muted-foreground">
                    {book.series || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            Previous
          </button>
          
          <span className="px-3 py-1 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
