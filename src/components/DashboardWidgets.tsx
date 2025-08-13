import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Star, DollarSign, BookOpen, Users, Calendar, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import BookCover from './BookCover';
import * as api from '../lib/api';
import type { BookData, GenreStatsResult } from '../lib/api';

interface DashboardWidgetsProps {
  className?: string;
}

/**
 * DashboardWidgets component provides analytics widgets for the home dashboard
 * - Genre distribution chart
 * - Top rated books showcase
 * - Price analysis summary  
 * - Recent additions
 * - Author spotlight
 */
export default function DashboardWidgets({ className = '' }: DashboardWidgetsProps) {
  const [topBooks, setTopBooks] = useState<BookData[]>([]);
  const [genreStats, setGenreStats] = useState<GenreStatsResult[]>([]);
  const [recentBooks, setRecentBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard data on mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load data in parallel
        const [topRated, stats, recent] = await Promise.all([
          api.getHighRatedBooks().then(books => books.slice(0, 6)),
          api.getGenreStats(),
          api.fetchTopRated(undefined, 0, 10) // Recent books (assuming sorted by date)
        ]);

        setTopBooks(topRated);
        setGenreStats(stats);
        setRecentBooks(recent.slice(0, 4));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Calculate insights from genre stats
  const insights = React.useMemo(() => {
    if (!genreStats.length) return null;
    
    const totalBooks = genreStats.reduce((sum, g) => sum + g.total_books, 0);
    const totalAuthors = genreStats.reduce((sum, g) => sum + g.unique_authors, 0);
    const avgRating = genreStats.reduce((sum, g) => sum + g.avg_rating, 0) / genreStats.length;
    const topGenre = genreStats[0]; // Already sorted by total_books desc
    const mostExpensive = genreStats.reduce((max, g) => g.avg_price > max.avg_price ? g : max, genreStats[0]);
    const highestRated = genreStats.reduce((max, g) => g.avg_rating > max.avg_rating ? g : max, genreStats[0]);

    return {
      totalBooks,
      totalAuthors,
      avgRating,
      topGenre,
      mostExpensive,
      highestRated
    };
  }, [genreStats]);

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Key Metrics Row */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{insights.totalBooks.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Books</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{insights.totalAuthors.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Authors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{insights.avgRating.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Avg Rating</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{genreStats.length}</div>
                  <div className="text-sm text-muted-foreground">Genres</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Rated Books Showcase */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Rated Books
            </CardTitle>
            <CardDescription>
              Highest rated books with significant review counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {topBooks.map((book) => (
                <div key={book.asin} className="space-y-2">
                  <BookCover 
                    coverUrl={book.cover_url} 
                    title={book.title}
                    size="large"
                    className="mx-auto"
                  />
                  <div className="text-center space-y-1">
                    <h4 className="font-medium text-sm leading-tight line-clamp-2">
                      {book.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {book.author}
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs font-medium">{book.rating?.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({book.review_count?.toLocaleString()})
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {book.genre}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Genre Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Genre Insights
            </CardTitle>
            <CardDescription>
              Top performing genres by different metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Most Books</span>
                    <Badge variant="outline">{insights.topGenre.total_books}</Badge>
                  </div>
                  <div className="font-medium">{insights.topGenre.genre}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Highest Rated</span>
                    <Badge variant="outline">★ {insights.highestRated.avg_rating.toFixed(1)}</Badge>
                  </div>
                  <div className="font-medium">{insights.highestRated.genre}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Premium Genre</span>
                    <Badge variant="outline">${insights.mostExpensive.avg_price.toFixed(2)}</Badge>
                  </div>
                  <div className="font-medium">{insights.mostExpensive.genre}</div>
                </div>
              </>
            )}

            {/* Top 5 Genres by Book Count */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium">Top Genres</h4>
              {genreStats.slice(0, 5).map((genre, index) => (
                <div key={genre.genre} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{genre.genre}</div>
                    <div className="text-xs text-muted-foreground">
                      {genre.total_books} books
                    </div>
                  </div>
                  <div className="w-16 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(genre.total_books / genreStats[0].total_books) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Additions or Popular Books */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Popular Selections
          </CardTitle>
          <CardDescription>
            Currently trending and popular books
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentBooks.map((book) => (
              <div key={book.asin} className="flex gap-3 p-3 rounded-lg border bg-card/50">
                <BookCover 
                  coverUrl={book.cover_url} 
                  title={book.title}
                  size="small"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-medium text-sm leading-tight line-clamp-2">
                    {book.title}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {book.author}
                  </p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="text-xs">{book.rating?.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {book.genre}
                    </Badge>
                    {book.price !== undefined && (
                      <span className="text-xs font-medium">
                        {book.price === 0 ? 'Free' : `$${book.price.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}