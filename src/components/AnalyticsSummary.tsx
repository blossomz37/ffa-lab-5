import React from 'react';
import { BarChart3, TrendingUp, Star, DollarSign } from 'lucide-react';
import type { GenreStatsResult, PriceBandResult } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import BookCover from './BookCover';

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.length}</div>
                <div className="text-sm text-muted-foreground">Total Genres</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {stats.reduce((sum, s) => sum + s.total_books, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Books</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(stats.reduce((sum, s) => sum + s.avg_rating, 0) / stats.length * 10) / 10}
                </div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Genre Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Genre</TableHead>
                <TableHead className="text-right">Books</TableHead>
                <TableHead className="text-right">Authors</TableHead>
                <TableHead className="text-right">Avg Rating</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead className="text-right">Supernatural</TableHead>
                <TableHead className="text-right">Romance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat) => (
                <TableRow key={stat.genre}>
                  <TableCell className="font-medium">{stat.genre}</TableCell>
                  <TableCell className="text-right">{stat.total_books}</TableCell>
                  <TableCell className="text-right">{stat.unique_authors}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{stat.avg_rating.toFixed(1)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">${stat.avg_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{stat.supernatural_count}</TableCell>
                  <TableCell className="text-right">{stat.romance_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderPriceAnalysis = (prices: PriceBandResult[]) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {prices.map((band) => (
          <Card key={band.price_tier}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{band.price_tier}</span>
                    <Badge variant="secondary">{band.percentage_of_total.toFixed(1)}%</Badge>
                  </div>
                  <div className="text-2xl font-bold">{band.book_count}</div>
                  <div className="text-sm text-muted-foreground">
                    ${band.min_price.toFixed(2)} - ${band.max_price.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Price Tier Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Price Tier</TableHead>
                <TableHead className="text-right">Book Count</TableHead>
                <TableHead className="text-right">Avg Rating</TableHead>
                <TableHead className="text-right">Avg Reviews</TableHead>
                <TableHead className="text-right">Price Range</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((band) => (
                <TableRow key={band.price_tier}>
                  <TableCell className="font-medium">{band.price_tier}</TableCell>
                  <TableCell className="text-right">{band.book_count}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{band.avg_rating.toFixed(1)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{band.avg_review_count.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    ${band.min_price.toFixed(2)} - ${band.max_price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{band.percentage_of_total.toFixed(1)}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
    <div className={`analytics-summary space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {presetType === 'getGenreStats' && <BarChart3 className="h-6 w-6 text-blue-500" />}
            {presetType === 'getPriceAnalysis' && <DollarSign className="h-6 w-6 text-green-500" />}
            {presetType === 'getRatingDistribution' && <Star className="h-6 w-6 text-yellow-500" />}
            {getTitle()}
          </CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
      </Card>
      
      {renderContent()}
    </div>
  );
}