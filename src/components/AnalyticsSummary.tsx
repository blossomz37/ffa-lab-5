import React from 'react';
import type { GenreStatsResult, PriceBandResult } from '../lib/api';

interface AnalyticsSummaryProps {
  presetType: string;
  data: any[];
  className?: string;
}

/**
 * AnalyticsSummary component for displaying insights from analytics presets
 * Shows formatted summaries instead of raw book data
 */
export default function AnalyticsSummary({ 
  presetType, 
  data, 
  className = "" 
}: AnalyticsSummaryProps) {
  
  const renderGenreStats = (stats: GenreStatsResult[]) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-primary">{stats.length}</div>
          <div className="text-sm text-muted-foreground">Total Genres</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-primary">
            {stats.reduce((sum, s) => sum + s.total_books, 0).toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Total Books</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-primary">
            {Math.round(stats.reduce((sum, s) => sum + s.avg_rating, 0) / stats.length * 10) / 10}
          </div>
          <div className="text-sm text-muted-foreground">Avg Rating</div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Genre</th>
              <th className="text-right p-3">Books</th>
              <th className="text-right p-3">Authors</th>
              <th className="text-right p-3">Avg Rating</th>
              <th className="text-right p-3">Avg Price</th>
              <th className="text-right p-3">Supernatural</th>
              <th className="text-right p-3">Romance</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.genre} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{stat.genre}</td>
                <td className="p-3 text-right">{stat.total_books}</td>
                <td className="p-3 text-right">{stat.unique_authors}</td>
                <td className="p-3 text-right">{stat.avg_rating.toFixed(1)}</td>
                <td className="p-3 text-right">${stat.avg_price.toFixed(2)}</td>
                <td className="p-3 text-right">{stat.supernatural_count}</td>
                <td className="p-3 text-right">{stat.romance_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPriceAnalysis = (prices: PriceBandResult[]) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {prices.map((band) => (
          <div key={band.price_tier} className="bg-card p-4 rounded-lg border">
            <div className="text-lg font-bold text-primary">{band.price_tier}</div>
            <div className="text-2xl font-bold">{band.book_count}</div>
            <div className="text-sm text-muted-foreground">
              {band.percentage_of_total.toFixed(1)}% of books
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              ${band.min_price.toFixed(2)} - ${band.max_price.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Price Tier</th>
              <th className="text-right p-3">Book Count</th>
              <th className="text-right p-3">Avg Rating</th>
              <th className="text-right p-3">Avg Reviews</th>
              <th className="text-right p-3">Price Range</th>
              <th className="text-right p-3">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((band) => (
              <tr key={band.price_tier} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{band.price_tier}</td>
                <td className="p-3 text-right">{band.book_count}</td>
                <td className="p-3 text-right">{band.avg_rating.toFixed(1)}</td>
                <td className="p-3 text-right">{band.avg_review_count.toLocaleString()}</td>
                <td className="p-3 text-right">
                  ${band.min_price.toFixed(2)} - ${band.max_price.toFixed(2)}
                </td>
                <td className="p-3 text-right">{band.percentage_of_total.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (presetType) {
      case 'getGenreStats':
        return renderGenreStats(data as GenreStatsResult[]);
      case 'getPriceAnalysis':
        return renderPriceAnalysis(data as PriceBandResult[]);
      case 'getRatingDistribution':
        return renderGenreStats(data as GenreStatsResult[]); // Placeholder
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            No analytics data available for this preset.
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (presetType) {
      case 'getGenreStats':
        return '📊 Genre Statistics';
      case 'getPriceAnalysis':
        return '💹 Price Analysis';
      case 'getRatingDistribution':
        return '📈 Rating Distribution';
      default:
        return '📋 Analytics Results';
    }
  };

  const getDescription = () => {
    switch (presetType) {
      case 'getGenreStats':
        return 'Comprehensive breakdown of book data by genre';
      case 'getPriceAnalysis':
        return 'Book distribution and trends across price tiers';
      case 'getRatingDistribution':
        return 'Analysis of rating patterns across the dataset';
      default:
        return 'Analytics insights from the book dataset';
    }
  };

  return (
    <div className={`analytics-summary ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{getTitle()}</h2>
        <p className="text-muted-foreground">{getDescription()}</p>
      </div>
      
      {renderContent()}
    </div>
  );
}