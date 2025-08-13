import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, BookOpen, BarChart3, Sparkles, Star, DollarSign, TrendingUp } from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

// Existing Components
import Filters, { FilterOptions } from './Filters';
import DataTable from './DataTable';
import AnalyticsSummary from './AnalyticsSummary';
import DashboardWidgets from './DashboardWidgets';
import VirtualizedDataTable from './VirtualizedDataTable';
import { usePerformance } from '../hooks/usePerformance';
import * as api from '../lib/api';
import type { BookData } from '../lib/api';

export default function ModernHome() {
  // Performance monitoring
  const performanceMetrics = usePerformance('ModernHome');
  
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
  
  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'search' | 'presets'>('dashboard');

  // Quick stats state
  const [quickStats, setQuickStats] = useState({
    totalBooks: 0,
    avgRating: 0,
    totalGenres: 0,
    avgPrice: 0
  });

  // Performance settings
  const [useVirtualization, setUseVirtualization] = useState(false);

  // Fetch books based on current search/filter criteria
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result: BookData[];
      
      if (activeTab === 'presets' && selectedPreset) {
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
            const stats = await api.getGenreStats();
            setAnalyticsData(stats);
            result = [];
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
        setAnalyticsData([]);
      }
      
      setBooks(result);
      
      // Auto-enable virtualization for large datasets
      if (result.length > 500) {
        setUseVirtualization(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, activeTab, selectedPreset]);

  // Load initial data and quick stats
  useEffect(() => {
    fetchBooks();
    loadQuickStats();
  }, [fetchBooks]);

  const loadQuickStats = async () => {
    try {
      const stats = await api.getGenreStats();
      const totalBooks = stats.reduce((sum, s) => sum + s.total_books, 0);
      const avgRating = stats.reduce((sum, s) => sum + s.avg_rating, 0) / stats.length;
      const avgPrice = stats.reduce((sum, s) => sum + s.avg_price, 0) / stats.length;
      
      setQuickStats({
        totalBooks,
        avgRating: Math.round(avgRating * 10) / 10,
        totalGenres: stats.length,
        avgPrice: Math.round(avgPrice * 100) / 100
      });
    } catch (error) {
      console.error('Failed to load quick stats:', error);
    }
  };

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setActiveTab('search');
    setSelectedPreset(undefined);
  }, []);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetKey: string) => {
    setSelectedPreset(presetKey);
    setActiveTab('presets');
  }, []);

  // Handle book selection for export
  const handleBookSelection = useCallback((selections: Set<string>) => {
    const selectedBooksArray = books.filter(book => selections.has(book.asin));
    setSelectedBooks(selectedBooksArray);
  }, [books]);

  // Clear all filters and selections
  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setFilters({});
    setSelectedPreset(undefined);
    setSelectedBooks([]);
    setAnalyticsData([]);
    setActiveTab('dashboard');
  }, []);

  // Preset configurations with modern icons and descriptions
  const presetCategories = {
    books: [
      { id: 'getHighRatedBooks', name: 'Top Rated', icon: Star, description: 'Highest rated books with many reviews', color: 'text-yellow-500' },
      { id: 'getPopularBooks', name: 'Most Popular', icon: TrendingUp, description: 'Books with most reviews', color: 'text-green-500' },
      { id: 'getCheapBooks', name: 'Budget Picks', icon: DollarSign, description: 'Great books under $5', color: 'text-blue-500' },
      { id: 'getExpensiveBooks', name: 'Premium', icon: Sparkles, description: 'Premium books over $15', color: 'text-purple-500' },
      { id: 'getRomanceBooks', name: 'Romance', icon: BookOpen, description: 'All romance books', color: 'text-pink-500' },
      { id: 'getFantasyBooks', name: 'Fantasy', icon: BookOpen, description: 'Fantasy adventures', color: 'text-indigo-500' },
      { id: 'getSciFiBooks', name: 'Sci-Fi', icon: BookOpen, description: 'Science fiction', color: 'text-cyan-500' },
      { id: 'getSupernaturalBooks', name: 'Supernatural', icon: BookOpen, description: 'Supernatural elements', color: 'text-orange-500' }
    ],
    analytics: [
      { id: 'getGenreStats', name: 'Genre Analysis', icon: BarChart3, description: 'Complete genre breakdown', color: 'text-emerald-500' },
      { id: 'getPriceAnalysis', name: 'Price Trends', icon: DollarSign, description: 'Price distribution analysis', color: 'text-amber-500' },
      { id: 'getRatingDistribution', name: 'Rating Analysis', icon: Star, description: 'Rating patterns', color: 'text-rose-500' },
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Modern Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                    Book Analytics
                  </h1>
                  <p className="text-sm text-muted-foreground">Professional book data insights</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleClearAll}>
                Clear All
              </Button>
              <Button asChild>
                <Link to="/export" state={{ selectedBooks: selectedBooks }}>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedBooks.length > 0 && `(${selectedBooks.length})`}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats Banner */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{quickStats.totalBooks.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Books</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{quickStats.avgRating}</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{quickStats.totalGenres}</p>
                  <p className="text-sm text-muted-foreground">Genres</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">${quickStats.avgPrice}</p>
                  <p className="text-sm text-muted-foreground">Avg Price</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dashboard' | 'search' | 'presets')}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search & Filter
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <DashboardWidgets />
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Search & Filters
                    </CardTitle>
                    <CardDescription>
                      Search and filter through {quickStats.totalBooks.toLocaleString()} books
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search books, authors..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Filters
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Search Results
                      {books.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {books.length} found
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <div className="border border-destructive/20 bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4">
                        <p className="font-medium">Error loading data</p>
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                    
                    {/* Performance toggle for large datasets */}
                    {books.length > 100 && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">Performance Mode</span>
                            <p className="text-xs text-muted-foreground">
                              {books.length > 500 ? 'Auto-enabled for large dataset' : 'Enable for better performance with large lists'}
                            </p>
                          </div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={useVirtualization}
                              onChange={(e) => setUseVirtualization(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">Virtualized Table</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {useVirtualization && books.length > 50 ? (
                      <VirtualizedDataTable
                        data={books || []}
                        loading={loading}
                        onSelectionChange={handleBookSelection}
                      />
                    ) : (
                      <DataTable
                        data={books || []}
                        loading={loading}
                        onSelectionChange={handleBookSelection}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <div className="space-y-6">
                  {/* Book Presets */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">📚 Book Collections</CardTitle>
                      <CardDescription>Curated book selections</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {presetCategories.books.map((preset) => {
                        const IconComponent = preset.icon;
                        return (
                          <Button
                            key={preset.id}
                            variant={selectedPreset === preset.id ? "default" : "ghost"}
                            className="w-full justify-start text-left h-auto p-3"
                            onClick={() => handlePresetSelect(preset.id)}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent className={`h-4 w-4 ${preset.color}`} />
                              <div className="text-left">
                                <div className="font-medium">{preset.name}</div>
                                <div className="text-xs text-muted-foreground">{preset.description}</div>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Analytics Presets */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">📊 Analytics</CardTitle>
                      <CardDescription>Data insights and trends</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {presetCategories.analytics.map((preset) => {
                        const IconComponent = preset.icon;
                        return (
                          <Button
                            key={preset.id}
                            variant={selectedPreset === preset.id ? "default" : "ghost"}
                            className="w-full justify-start text-left h-auto p-3"
                            onClick={() => handlePresetSelect(preset.id)}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent className={`h-4 w-4 ${preset.color}`} />
                              <div className="text-left">
                                <div className="font-medium">{preset.name}</div>
                                <div className="text-xs text-muted-foreground">{preset.description}</div>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedPreset 
                        ? presetCategories.books.find(p => p.id === selectedPreset)?.name || 
                          presetCategories.analytics.find(p => p.id === selectedPreset)?.name || 
                          'Analytics Results'
                        : 'Select a preset to view results'
                      }
                      {books.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {books.length} results
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <div className="border border-destructive/20 bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4">
                        <p className="font-medium">Error loading data</p>
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                    
                    {selectedPreset && ['getGenreStats', 'getPriceAnalysis', 'getRatingDistribution'].includes(selectedPreset) ? (
                      <AnalyticsSummary
                        presetType={selectedPreset}
                        data={analyticsData}
                      />
                    ) : (
                      useVirtualization && books.length > 50 ? (
                        <VirtualizedDataTable
                          data={books || []}
                          loading={loading}
                          onSelectionChange={handleBookSelection}
                        />
                      ) : (
                        <DataTable
                          data={books || []}
                          loading={loading}
                          onSelectionChange={handleBookSelection}
                        />
                      )
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}