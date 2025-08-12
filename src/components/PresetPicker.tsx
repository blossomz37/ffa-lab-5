import React from 'react';

// Map of preset query functions to their display names and descriptions
const PRESET_QUERIES = {
  getHighRatedBooks: {
    name: "High-Rated Books",
    description: "Books with ratings 4.0 and above",
    icon: "⭐"
  },
  getPopularBooks: {
    name: "Popular Books", 
    description: "Books with most reviews",
    icon: "🔥"
  },
  getCheapBooks: {
    name: "Budget Books",
    description: "Books under $5.00", 
    icon: "💰"
  },
  getExpensiveBooks: {
    name: "Premium Books",
    description: "Books over $15.00",
    icon: "💎"
  },
  getRomanceBooks: {
    name: "Romance Books",
    description: "All romance genre books",
    icon: "💕"
  },
  getFantasyBooks: {
    name: "Fantasy Books", 
    description: "All fantasy genre books",
    icon: "🐉"
  },
  getSciFiBooks: {
    name: "Sci-Fi Books",
    description: "Science fiction genre books", 
    icon: "🚀"
  },
  getSupernaturalBooks: {
    name: "Supernatural Books",
    description: "Books with supernatural elements",
    icon: "🔮"
  },
  getGenreStats: {
    name: "Genre Statistics",
    description: "Summary statistics by genre",
    icon: "📊"
  },
  getRatingDistribution: {
    name: "Rating Distribution", 
    description: "Rating distribution analysis",
    icon: "📈"
  },
  getPriceAnalysis: {
    name: "Price Analysis",
    description: "Price trends by genre",
    icon: "💹"
  },
  getTopAuthors: {
    name: "Top Authors",
    description: "Authors by book count",
    icon: "✍️"
  }
} as const;

type PresetQueryKey = keyof typeof PRESET_QUERIES;

interface PresetPickerProps {
  onPresetSelect: (presetKey: string) => void;
  selectedPreset?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * PresetPicker component for selecting predefined queries
 * - Grid layout of preset query cards
 * - Visual indicators for selected preset
 * - Loading states
 * - Category grouping (Books, Analytics)
 */
export default function PresetPicker({ 
  onPresetSelect, 
  selectedPreset, 
  isLoading = false,
  className = ""
}: PresetPickerProps) {

  // Group presets by category
  const bookQueries: PresetQueryKey[] = [
    'getHighRatedBooks',
    'getPopularBooks', 
    'getCheapBooks',
    'getExpensiveBooks',
    'getRomanceBooks',
    'getFantasyBooks',
    'getSciFiBooks',
    'getSupernaturalBooks'
  ];

  const analyticsQueries: PresetQueryKey[] = [
    'getGenreStats',
    'getRatingDistribution',
    'getPriceAnalysis', 
    'getTopAuthors'
  ];

  const handlePresetClick = (presetKey: string) => {
    if (!isLoading) {
      onPresetSelect(presetKey);
    }
  };

  const renderPresetCard = (presetKey: PresetQueryKey) => {
    const preset = PRESET_QUERIES[presetKey];
    const isSelected = selectedPreset === presetKey;
    const isDisabled = isLoading;

    return (
      <button
        key={presetKey}
        onClick={() => handlePresetClick(presetKey)}
        disabled={isDisabled}
        className={`
          p-4 rounded-lg border text-left transition-all duration-200
          ${isSelected 
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
            : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
          }
          ${isDisabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer'
          }
        `}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{preset.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-1">{preset.name}</h3>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </div>
        </div>
        
        {isSelected && (
          <div className="mt-2 flex items-center gap-1 text-xs text-primary">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Selected
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={`preset-picker ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Preset Queries</h2>
        <p className="text-sm text-muted-foreground">
          Choose from predefined queries to explore the book data
        </p>
      </div>

      {/* Book Queries Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          📚 Book Queries
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {bookQueries.map(renderPresetCard)}
        </div>
      </div>

      {/* Analytics Queries Section */}
      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          📊 Analytics Queries
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {analyticsQueries.map(renderPresetCard)}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Running query...
        </div>
      )}
    </div>
  );
}
