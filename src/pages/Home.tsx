import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import Filters, { FilterOptions } from '../components/Filters';
import PresetPicker from '../components/PresetPicker';
import DataTable from '../components/DataTable';
import AnalyticsSummary from '../components/AnalyticsSummary';
import * as api from '../lib/api';
import type { BookData } from '../lib/api';

/**
 * Main Home page component that orchestrates the book analytics dashboard
 * - Manages search, filtering, and preset query state
 * - Coordinates data fetching and display
 * - Provides navigation to export functionality
 */
export default function Home() {
  // State management
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>();
  
  // Data table state
  const [selectedBooks, setSelectedBooks] = useState<BookData[]>([]);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'search' | 'preset'>('search');
  
  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);

  // Fetch books based on current search/filter criteria
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result: BookData[];
      
      if (viewMode === 'preset' && selectedPreset) {
        // Execute the selected preset query
        // Clear analytics data for book-type presets
        setAnalyticsData([]);
        
        switch (selectedPreset) {
          case 'getHighRatedBooks':
            result = await api.getHighRatedBooks();
            break;
          case 'getPopularBooks':
            result = await api.getPopularBooks();
            break;
          case 'getCheapBooks':
            result = await api.getCheapBooks();
            break;
          case 'getExpensiveBooks':
            result = await api.getExpensiveBooks();
            break;
          case 'getRomanceBooks':
            result = await api.getRomanceBooks();
            break;
          case 'getFantasyBooks':
            result = await api.getFantasyBooks();
            break;
          case 'getSciFiBooks':
            result = await api.getSciFiBooks();
            break;
          case 'getSupernaturalBooks':
            result = await api.getSupernaturalBooks();
            break;
          case 'getGenreStats':
            // Special handling for analytics queries that don't return books
            const stats = await api.getGenreStats();
            setAnalyticsData(stats);
            result = []; // Don't show books for analytics
            break;
          case 'getPriceAnalysis':
            const priceData = await api.getPriceAnalysis();
            setAnalyticsData(priceData);
            result = [];
            break;
          case 'getRatingDistribution':
            const ratingData = await api.getRatingDistribution();
            setAnalyticsData(ratingData);
            result = [];
            break;
          case 'getTopAuthors':
            result = await api.getTopAuthors();
            break;
          default:
            result = await api.fetchTopRated(undefined, 0, 100);
        }
      } else {
        // Default search behavior
        result = await api.fetchTopRated(undefined, 0, 100);
        setAnalyticsData([]); // Clear analytics data for non-preset views
      }
      
      setBooks(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, viewMode, selectedPreset]);

  // Load initial data
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Handle search query changes
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setViewMode('search');
    setSelectedPreset(undefined);
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setViewMode('search');
    setSelectedPreset(undefined);
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetKey: string) => {
    setSelectedPreset(presetKey);
    setViewMode('preset');
    setSearchQuery('');
    setFilters({});
  }, []);

  // Handle book selection for export
  const handleBookSelection = useCallback((selectedBooksArray: BookData[]) => {
    setSelectedBooks(selectedBooksArray);
  }, []);

  // Export selected books to DOCX
  const handleExportDOCX = async () => {
    if (selectedBooks.length === 0) {
      alert('Please select at least one book to export.');
      return;
    }

    try {
      const response = await api.exportToDocx(selectedBooks);
      
      // Create download link
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `book-report-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`✅ Exported ${selectedBooks.length} books to DOCX`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Clear all selections and reset to default view
  const handleClearAll = () => {
    setSearchQuery('');
    setFilters({});
    setSelectedPreset(undefined);
    setViewMode('search');
    setSelectedBooks([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Book Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Explore and analyze book data across multiple genres
              </p>
            </div>
            
            {/* Export Link */}
            <Link
              to="/export"
              state={{ selectedBooks: Array.from(selectedBooks) }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to DOCX
              {selectedBooks.size > 0 && (
                <span className="bg-primary-foreground/20 px-2 py-0.5 rounded text-xs">
                  {selectedBooks.size} selected
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Search and Filters */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border p-1">
                <button
                  onClick={() => setViewMode('search')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'search'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Search & Filter
                </button>
                <button
                  onClick={() => setViewMode('preset')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'preset'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Preset Queries
                </button>
              </div>

              {/* Clear All Button */}
              <button
                onClick={handleClearAll}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-accent transition-colors"
              >
                Clear All
              </button>

              {/* Search and Filters Panel */}
              {viewMode === 'search' && (
                <div className="space-y-6">
                  <SearchBar
                    onSearch={handleSearch}
                    initialValue={searchQuery}
                  />
                  
                  <Filters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                  />
                </div>
              )}

              {/* Preset Queries Panel */}
              {viewMode === 'preset' && (
                <PresetPicker
                  onPresetSelect={handlePresetSelect}
                  selectedPreset={selectedPreset}
                  isLoading={loading}
                />
              )}
            </div>
          </div>

          {/* Main Content - Results */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {viewMode === 'preset' && selectedPreset
                      ? `Results: ${selectedPreset.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`
                      : 'Search Results'
                    }
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {loading ? 'Loading...' : `${books?.length || 0} books found`}
                  </p>
                </div>

                {/* Results Actions */}
                <div className="flex items-center gap-2">
                  {selectedBooks.length > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {selectedBooks.length} selected for export
                      </span>
                      <button
                        onClick={handleExportDOCX}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Export to DOCX
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="border border-destructive/20 bg-destructive/10 text-destructive px-4 py-3 rounded-md">
                  <p className="font-medium">Error loading data</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Data Display - Books or Analytics */}
              {viewMode === 'preset' && selectedPreset && ['getGenreStats', 'getPriceAnalysis', 'getRatingDistribution'].includes(selectedPreset) ? (
                <AnalyticsSummary
                  presetType={selectedPreset}
                  data={analyticsData}
                />
              ) : (
                <DataTable
                  data={books || []}
                  loading={loading}
                  onSelectionChange={handleBookSelection}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
