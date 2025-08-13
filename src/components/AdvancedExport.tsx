import React, { useState, useMemo } from 'react';
import { Download, Filter, Settings, FileText, Table, Image, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import BookCover from './BookCover';
import type { BookData } from '../lib/api';

interface AdvancedExportProps {
  books: BookData[];
  onExport: (format: ExportFormat, options: ExportOptions) => void;
  className?: string;
}

export interface ExportFormat {
  type: 'docx' | 'csv' | 'json' | 'xlsx';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}

export interface ExportOptions {
  format: ExportFormat;
  fields: string[];
  filters: {
    genres?: string[];
    minRating?: number;
    maxRating?: number;
    minPrice?: number;
    maxPrice?: number;
    dateRange?: { start: string; end: string };
    hasCovers?: boolean;
    hasSupernatural?: boolean;
    hasRomance?: boolean;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeImages?: boolean;
  groupBy?: string;
  maxResults?: number;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    type: 'docx',
    name: 'Word Document',
    description: 'Professional document with formatting and images',
    icon: FileText
  },
  {
    type: 'csv',
    name: 'CSV Spreadsheet',
    description: 'Data for Excel, Google Sheets, or analysis',
    icon: Table
  },
  {
    type: 'json',
    name: 'JSON Data',
    description: 'Structured data for developers and APIs',
    icon: Settings
  },
  {
    type: 'xlsx',
    name: 'Excel Workbook',
    description: 'Native Excel format with multiple sheets',
    icon: Table
  }
];

const AVAILABLE_FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'author', label: 'Author', required: true },
  { key: 'genre', label: 'Genre', required: false },
  { key: 'rating', label: 'Rating', required: false },
  { key: 'review_count', label: 'Review Count', required: false },
  { key: 'price', label: 'Price', required: false },
  { key: 'publisher', label: 'Publisher', required: false },
  { key: 'release_date', label: 'Release Date', required: false },
  { key: 'series', label: 'Series', required: false },
  { key: 'rank_overall', label: 'Sales Rank', required: false },
  { key: 'blurb_text', label: 'Description', required: false },
  { key: 'topic_tags', label: 'Topic Tags', required: false },
  { key: 'cover_url', label: 'Cover URL', required: false },
  { key: 'product_url', label: 'Product URL', required: false },
  { key: 'author_url', label: 'Author URL', required: false },
  { key: 'has_supernatural', label: 'Has Supernatural', required: false },
  { key: 'has_romance', label: 'Has Romance', required: false }
];

/**
 * AdvancedExport component for flexible data export with filtering and formatting options
 * - Multiple export formats (DOCX, CSV, JSON, XLSX)
 * - Field selection and customization
 * - Advanced filtering and sorting
 * - Preview before export
 * - Batch processing for large datasets
 */
export default function AdvancedExport({ books, onExport, className = '' }: AdvancedExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(EXPORT_FORMATS[0]);
  const [selectedFields, setSelectedFields] = useState<string[]>(['title', 'author', 'genre', 'rating', 'price']);
  const [filters, setFilters] = useState<ExportOptions['filters']>({});
  const [sortBy, setSortBy] = useState<string>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [includeImages, setIncludeImages] = useState(false);
  const [groupBy, setGroupBy] = useState<string>('');
  const [maxResults, setMaxResults] = useState<number>(1000);

  // Filter and process books based on current settings
  const processedBooks = useMemo(() => {
    let filtered = [...books];

    // Apply filters
    if (filters.genres?.length) {
      filtered = filtered.filter(book => filters.genres!.includes(book.genre));
    }
    if (filters.minRating !== undefined) {
      filtered = filtered.filter(book => book.rating && book.rating >= filters.minRating!);
    }
    if (filters.maxRating !== undefined) {
      filtered = filtered.filter(book => book.rating && book.rating <= filters.maxRating!);
    }
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(book => book.price !== undefined && book.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(book => book.price !== undefined && book.price <= filters.maxPrice!);
    }
    if (filters.hasCovers) {
      filtered = filtered.filter(book => book.cover_url && book.cover_url.startsWith('http'));
    }
    if (filters.hasSupernatural !== undefined) {
      filtered = filtered.filter(book => book.has_supernatural === filters.hasSupernatural);
    }
    if (filters.hasRomance !== undefined) {
      filtered = filtered.filter(book => book.has_romance === filters.hasRomance);
    }

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[sortBy];
        const bVal = (b as any)[sortBy];
        
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
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply limit
    if (maxResults > 0) {
      filtered = filtered.slice(0, maxResults);
    }

    return filtered;
  }, [books, filters, sortBy, sortOrder, maxResults]);

  // Get unique genres for filter options
  const availableGenres = useMemo(() => {
    return Array.from(new Set(books.map(book => book.genre))).sort();
  }, [books]);

  // Handle field selection
  const handleFieldToggle = (fieldKey: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.key === fieldKey);
    if (field?.required) return; // Don't allow deselecting required fields

    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  // Handle export
  const handleExport = () => {
    const exportOptions: ExportOptions = {
      format: selectedFormat,
      fields: selectedFields,
      filters,
      sortBy,
      sortOrder,
      includeImages,
      groupBy: groupBy || undefined,
      maxResults
    };

    onExport(selectedFormat, exportOptions);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Advanced Export
          </CardTitle>
          <CardDescription>
            Export {processedBooks.length.toLocaleString()} of {books.length.toLocaleString()} books with custom formatting and filters
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="format" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="format">Format</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Format Selection */}
        <TabsContent value="format">
          <Card>
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
              <CardDescription>Choose how your data will be formatted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXPORT_FORMATS.map((format) => {
                  const IconComponent = format.icon;
                  return (
                    <button
                      key={format.type}
                      onClick={() => setSelectedFormat(format)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedFormat.type === format.type
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-gray-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <IconComponent className="h-5 w-5 mt-1 text-primary" />
                        <div>
                          <h3 className="font-medium">{format.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Format-specific options */}
              <div className="mt-6 space-y-4">
                <h4 className="font-medium">Options</h4>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Include book cover images</span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedFormat.type === 'docx' ? 'Recommended' : 'Not supported'}
                  </Badge>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Group by</label>
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">No grouping</option>
                      <option value="genre">Genre</option>
                      <option value="author">Author</option>
                      <option value="publisher">Publisher</option>
                      <option value="series">Series</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Max results</label>
                    <Input
                      type="number"
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value) || 1000)}
                      min={1}
                      max={10000}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Selection */}
        <TabsContent value="fields">
          <Card>
            <CardHeader>
              <CardTitle>Data Fields</CardTitle>
              <CardDescription>
                Select which book information to include ({selectedFields.length} of {AVAILABLE_FIELDS.length} fields selected)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_FIELDS.map((field) => (
                  <label key={field.key} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => handleFieldToggle(field.key)}
                      disabled={field.required}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm flex-1">{field.label}</span>
                    {field.required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </label>
                ))}
              </div>

              {/* Quick selections */}
              <div className="mt-6 space-y-2">
                <h4 className="font-medium">Quick selections</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFields(['title', 'author', 'genre', 'rating', 'price'])}
                  >
                    Basic Info
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFields(AVAILABLE_FIELDS.map(f => f.key))}
                  >
                    All Fields
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFields(['title', 'author', 'cover_url', 'product_url'])}
                  >
                    Marketing Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filters */}
        <TabsContent value="filters">
          <Card>
            <CardHeader>
              <CardTitle>Filters & Sorting</CardTitle>
              <CardDescription>Refine your export with filters and sorting options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {availableGenres.map((genre) => (
                    <label key={genre} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={filters.genres?.includes(genre) || false}
                        onChange={(e) => {
                          const genres = filters.genres || [];
                          setFilters(prev => ({
                            ...prev,
                            genres: e.target.checked 
                              ? [...genres, genre]
                              : genres.filter(g => g !== genre)
                          }));
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-xs">{genre}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Rating</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={filters.minRating || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      minRating: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Rating</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={filters.maxRating || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      maxRating: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={filters.minPrice || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      minPrice: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={filters.maxPrice || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      maxPrice: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                  />
                </div>
              </div>

              {/* Content Filters */}
              <div className="space-y-3">
                <h4 className="font-medium">Content Types</h4>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.hasCovers || false}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        hasCovers: e.target.checked || undefined
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Has cover images</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.hasSupernatural || false}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        hasSupernatural: e.target.checked || undefined
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Supernatural elements</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.hasRomance || false}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        hasRomance: e.target.checked || undefined
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Romance elements</span>
                  </label>
                </div>
              </div>

              {/* Sorting */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="rating">Rating</option>
                    <option value="review_count">Review Count</option>
                    <option value="price">Price</option>
                    <option value="release_date">Release Date</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Sort order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Export Preview</CardTitle>
              <CardDescription>
                Preview of {processedBooks.length} books that will be exported
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedBooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No books match your current filters. Try adjusting your criteria.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Sample rows */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-muted/50">
                          {selectedFields.map((fieldKey) => {
                            const field = AVAILABLE_FIELDS.find(f => f.key === fieldKey);
                            return (
                              <th key={fieldKey} className="border border-gray-300 p-2 text-left text-xs font-medium">
                                {field?.label}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {processedBooks.slice(0, 5).map((book, index) => (
                          <tr key={book.asin} className="hover:bg-muted/30">
                            {selectedFields.map((fieldKey) => (
                              <td key={fieldKey} className="border border-gray-300 p-2 text-xs">
                                {fieldKey === 'cover_url' && book.cover_url ? (
                                  <BookCover coverUrl={book.cover_url} title={book.title} size="small" />
                                ) : (
                                  <span className="line-clamp-2">
                                    {String((book as any)[fieldKey] || '—')}
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {processedBooks.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      Showing first 5 of {processedBooks.length} books...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Button */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Ready to export</h3>
              <p className="text-sm text-muted-foreground">
                {processedBooks.length.toLocaleString()} books • {selectedFormat.name} • {selectedFields.length} fields
              </p>
            </div>
            <Button 
              onClick={handleExport}
              disabled={processedBooks.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}