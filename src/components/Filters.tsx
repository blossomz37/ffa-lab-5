import React from 'react';

export interface FilterOptions {
  genre?: string;
  minRating?: number;
  maxRating?: number;
  minReviews?: number;
  minPrice?: number;
  maxPrice?: number;
  hasSupernatural?: boolean;
  hasRomance?: boolean;
}

interface FiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableGenres?: string[];
}

/**
 * Filters component for refining book search results
 * - Genre dropdown selection
 * - Rating range slider
 * - Minimum reviews threshold
 * - Price range filters
 * - Content type checkboxes (supernatural, romance)
 */
export default function Filters({ filters, onFiltersChange, availableGenres = [] }: FiltersProps) {
  
  // Default genre list if not provided
  const defaultGenres = [
    'Fantasy',
    'Romance',
    'Science Fiction',
    'Cozy Mystery',
    'Erotica',
    'Gay Romance',
    'Historical Romance',
    'Mystery, Thriller & Suspense',
    'Paranormal Romance',
    'Romance Short Reads (1hr)',
    'Science Fiction Romance',
    'Science Fiction & Fantasy',
    'Teen & Young Adult',
    'Urban Fantasy',
  ];

  const genres = availableGenres.length > 0 ? availableGenres : defaultGenres;

  const updateFilter = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="filter-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Genre Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Genre</label>
          <select
            value={filters.genre || ''}
            onChange={(e) => updateFilter('genre', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="">All Genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {/* Rating Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Minimum Rating</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={filters.minRating || 0}
              onChange={(e) => updateFilter('minRating', parseFloat(e.target.value) || undefined)}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12">
              {filters.minRating ? filters.minRating.toFixed(1) : '0.0'}★
            </span>
          </div>
        </div>

        {/* Maximum Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Maximum Rating</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={filters.maxRating || 5}
              onChange={(e) => updateFilter('maxRating', parseFloat(e.target.value) || undefined)}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12">
              {filters.maxRating ? filters.maxRating.toFixed(1) : '5.0'}★
            </span>
          </div>
        </div>

        {/* Minimum Reviews */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Minimum Reviews</label>
          <input
            type="number"
            min="0"
            step="1"
            value={filters.minReviews || ''}
            onChange={(e) => updateFilter('minReviews', parseInt(e.target.value) || undefined)}
            placeholder="e.g. 100"
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        {/* Price Range - Minimum */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Minimum Price</label>
          <div className="flex items-center gap-2">
            <span className="text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.minPrice || ''}
              onChange={(e) => updateFilter('minPrice', parseFloat(e.target.value) || undefined)}
              placeholder="0.00"
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
        </div>

        {/* Price Range - Maximum */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Maximum Price</label>
          <div className="flex items-center gap-2">
            <span className="text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.maxPrice || ''}
              onChange={(e) => updateFilter('maxPrice', parseFloat(e.target.value) || undefined)}
              placeholder="99.99"
              className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
        </div>
      </div>

      {/* Content Type Filters */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium mb-3">Content Types</h4>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.hasSupernatural || false}
              onChange={(e) => updateFilter('hasSupernatural', e.target.checked || undefined)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Has Supernatural Elements</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.hasRomance || false}
              onChange={(e) => updateFilter('hasRomance', e.target.checked || undefined)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Has Romance</span>
          </label>
        </div>
      </div>

      {/* Active Filters Summary */}
      {Object.keys(filters).length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Active Filters</h4>
          <div className="flex flex-wrap gap-2">
            {filters.genre && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Genre: {filters.genre}
                <button
                  onClick={() => updateFilter('genre', undefined)}
                  className="hover:text-primary/80"
                >
                  ×
                </button>
              </span>
            )}
            {filters.minRating && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Min Rating: {filters.minRating.toFixed(1)}★
                <button
                  onClick={() => updateFilter('minRating', undefined)}
                  className="hover:text-primary/80"
                >
                  ×
                </button>
              </span>
            )}
            {filters.maxRating && filters.maxRating < 5 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Max Rating: {filters.maxRating.toFixed(1)}★
                <button
                  onClick={() => updateFilter('maxRating', undefined)}
                  className="hover:text-primary/80"
                >
                  ×
                </button>
              </span>
            )}
            {filters.minReviews && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Min Reviews: {filters.minReviews}
                <button
                  onClick={() => updateFilter('minReviews', undefined)}
                  className="hover:text-primary/80"
                >
                  ×
                </button>
              </span>
            )}
            {filters.minPrice && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Min Price: ${filters.minPrice.toFixed(2)}
                <button
                  onClick={() => updateFilter('minPrice', undefined)}
                  className="hover:text-primary/80"
                >
                  ×
                </button>
              </span>
            )}
            {filters.maxPrice && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                Max Price: ${filters.maxPrice.toFixed(2)}
                <button
                  onClick={() => updateFilter('maxPrice', undefined)}
                  className="hover:text-primary/80"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
