import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { BookData } from '../lib/api';
import BookCover from './BookCover';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface VirtualizedDataTableProps {
  data: BookData[];
  loading?: boolean;
  onSelectionChange?: (selectedBooks: BookData[]) => void;
  itemHeight?: number;
  pageSize?: number;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    books: BookData[];
    selectedBooks: Set<string>;
    onRowSelect: (asin: string, selected: boolean) => void;
    renderLink: (text: string, url?: string) => React.ReactNode;
  };
}

// Virtualized row component
const BookRow: React.FC<RowProps> = ({ index, style, data }) => {
  const { books, selectedBooks, onRowSelect, renderLink } = data;
  const book = books[index];

  if (!book) return null;

  return (
    <div style={style} className="px-4 py-2 border-b hover:bg-muted/30">
      <div className="flex items-center gap-4">
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={selectedBooks.has(book.asin)}
          onChange={(e) => onRowSelect(book.asin, e.target.checked)}
          className="rounded border-gray-300"
        />

        {/* Cover */}
        <div className="flex-shrink-0">
          <BookCover 
            coverUrl={book.cover_url} 
            title={book.title}
            size="small"
          />
        </div>

        {/* Book details */}
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
          {/* Title & Author */}
          <div className="md:col-span-2 min-w-0">
            <div className="font-medium line-clamp-1">
              {renderLink(book.title, book.product_url)}
            </div>
            <div className="text-sm text-muted-foreground line-clamp-1">
              {renderLink(book.author, book.author_url)}
            </div>
          </div>

          {/* Genre */}
          <div className="hidden md:block">
            <Badge variant="secondary" className="text-xs">
              {book.genre}
            </Badge>
          </div>

          {/* Rating */}
          <div className="hidden md:block">
            {book.rating ? (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="text-sm">{book.rating.toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>

          {/* Price */}
          <div className="hidden md:block">
            {book.price !== undefined ? (
              book.price === 0 ? (
                <span className="text-green-600 font-medium text-sm">Free</span>
              ) : (
                <span className="text-sm">${book.price.toFixed(2)}</span>
              )
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>

          {/* Reviews */}
          <div className="hidden md:block">
            <span className="text-sm">
              {book.review_count ? book.review_count.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * VirtualizedDataTable component for handling large datasets efficiently
 * - Uses react-window for virtualization 
 * - Supports sorting and filtering
 * - Pagination for better UX
 * - Optimized for 10k+ books
 */
export default function VirtualizedDataTable({
  data,
  loading = false,
  onSelectionChange,
  itemHeight = 100,
  pageSize = 1000
}: VirtualizedDataTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof BookData | null>('rating');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const listRef = useRef<List>(null);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = data.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.genre.toLowerCase().includes(query)
      );
    }

    // Sort data
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
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
    }

    return filtered;
  }, [data, searchQuery, sortColumn, sortDirection]);

  // Paginate data for better performance
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Handle sorting
  const handleSort = useCallback((column: keyof BookData) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(0); // Reset to first page when sorting
  }, [sortColumn]);

  // Handle row selection
  const handleRowSelect = useCallback((asin: string, selected: boolean) => {
    setSelectedBooks(prev => {
      const newSelected = new Set(prev);
      if (selected) {
        newSelected.add(asin);
      } else {
        newSelected.delete(asin);
      }

      // Notify parent component
      const selectedData = data.filter(book => newSelected.has(book.asin));
      onSelectionChange?.(selectedData);
      
      return newSelected;
    });
  }, [data, onSelectionChange]);

  // Handle select all/none for current page
  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedBooks(prev => {
      const newSelected = new Set(prev);
      
      if (selected) {
        paginatedData.forEach(book => newSelected.add(book.asin));
      } else {
        paginatedData.forEach(book => newSelected.delete(book.asin));
      }

      // Notify parent component
      const selectedData = data.filter(book => newSelected.has(book.asin));
      onSelectionChange?.(selectedData);
      
      return newSelected;
    });
  }, [paginatedData, data, onSelectionChange]);

  // Handle search with debouncing
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(0); // Reset to first page when searching
  }, []);

  // Render clickable link
  const renderLink = useCallback((text: string, url?: string) => {
    if (url && url.startsWith('http')) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline"
        >
          {text}
        </a>
      );
    }
    return text;
  }, []);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(0);
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading book data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            No books found. Try adjusting your filters or search query.
          </div>
        </CardContent>
      </Card>
    );
  }

  const itemData = {
    books: paginatedData,
    selectedBooks,
    onRowSelect: handleRowSelect,
    renderLink
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Books Library
            <Badge variant="secondary" className="ml-2">
              {processedData.length.toLocaleString()} total
            </Badge>
          </CardTitle>
          
          {/* Search */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search books, authors, genres..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        {/* Table controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedData.length} of {processedData.length} books
            {selectedBooks.size > 0 && ` (${selectedBooks.size} selected)`}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Select all for current page */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={paginatedData.length > 0 && paginatedData.every(book => selectedBooks.has(book.asin))}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300"
              />
              Select Page
            </label>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm">
                  {currentPage + 1} / {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {(['title', 'author', 'rating', 'review_count', 'price'] as (keyof BookData)[]).map((column) => (
            <Button
              key={column}
              variant={sortColumn === column ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort(column)}
              className="text-xs"
            >
              {column.charAt(0).toUpperCase() + column.slice(1).replace('_', ' ')}
              {sortColumn === column && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Virtualized list */}
        <div className="border-t">
          <List
            ref={listRef}
            height={Math.min(600, paginatedData.length * itemHeight)}
            itemCount={paginatedData.length}
            itemSize={itemHeight}
            itemData={itemData}
            className="scrollbar-thin"
          >
            {BookRow}
          </List>
        </div>

        {/* Footer with stats */}
        {processedData.length > 0 && (
          <div className="p-4 border-t bg-muted/30 text-sm text-muted-foreground">
            Performance: Showing {paginatedData.length} of {processedData.length} books 
            ({Math.round((paginatedData.length / processedData.length) * 100)}% loaded)
            {selectedBooks.size > 0 && ` • ${selectedBooks.size} selected for export`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}