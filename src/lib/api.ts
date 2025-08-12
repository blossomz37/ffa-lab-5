/**
 * API client for communicating with the Express backend
 * Handles all HTTP requests and provides typed responses
 */

export interface BookData {
  ingested_date: string;
  genre: string;
  asin: string;
  title: string;
  author: string;
  author_url?: string;
  series?: string;
  price?: number;
  rating?: number;
  review_count?: number;
  rank_overall?: number;
  release_date?: string;
  publisher?: string;
  blurb_text?: string;
  cover_url?: string;
  product_url?: string;
  topic_tags?: string;
  subcategories?: string;
  has_supernatural?: boolean;
  has_romance?: boolean;
  cover_ok?: boolean;
}

export interface TopRatedResult extends BookData {
  rank_position: number;
}

export interface MoversResult {
  asin: string;
  title: string;
  author: string;
  genre: string;
  current_rank: number;
  previous_rank: number;
  rank_change: number;
  current_date: string;
  previous_date: string;
  rating?: number;
  review_count?: number;
  price?: number;
}

export interface PriceBandResult {
  price_tier: string;
  book_count: number;
  avg_rating: number;
  avg_review_count: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  percentage_of_total: number;
}

export interface AuthorSearchResult extends BookData {
  total_books: number;
  avg_rating: number;
}

export interface NewTitlesResult extends BookData {
  is_new_release?: boolean;
  days_since_release?: number;
}

export interface GenreStatsResult {
  genre: string;
  total_books: number;
  unique_authors: number;
  avg_rating: number;
  avg_price: number;
  avg_reviews: number;
  earliest_date: string;
  latest_date: string;
  supernatural_count: number;
  romance_count: number;
}

// Base API URL - Express server
const API_BASE_URL = 'http://localhost:3001';

/**
 * Generic API request handler with error handling
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

/**
 * Query API functions - these will call the Express endpoints
 * For now, they return mock data until the Express server is implemented
 */

export async function fetchTopRated(
  genre?: string,
  minReviews: number = 100,
  limit: number = 50
): Promise<TopRatedResult[]> {
  const params = new URLSearchParams();
  if (genre) params.append('genre', genre);
  params.append('minReviews', minReviews.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/query/top-rated?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch top-rated books');
  }
  
  const result = await response.json();
  return result.data;
}

export async function fetchMovers(
  genre?: string,
  minDeltaRank: number = 50,
  limit: number = 25
): Promise<MoversResult[]> {
  const params = new URLSearchParams();
  if (genre) params.append('genre', genre);
  params.append('minDeltaRank', minDeltaRank.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/query/movers?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch movers data');
  }
  
  const result = await response.json();
  return result.data;
}

export async function fetchPriceBands(genre?: string): Promise<PriceBandResult[]> {
  const params = new URLSearchParams();
  if (genre) params.append('genre', genre);

  const response = await fetch(`${API_BASE_URL}/query/price-bands?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch price bands data');
  }
  
  const result = await response.json();
  return result.data;
}

export async function fetchAuthorSearch(
  author: string,
  minBooks: number = 1,
  limit: number = 50
): Promise<AuthorSearchResult[]> {
  const params = new URLSearchParams();
  params.append('author', author);
  params.append('minBooks', minBooks.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/query/author-search?${params}`);
  if (!response.ok) {
    throw new Error('Failed to search authors');
  }
  
  const result = await response.json();
  return result.data;
}

export async function fetchNewTitles(
  genre?: string,
  daysBack: number = 30,
  limit: number = 50
): Promise<NewTitlesResult[]> {
  const params = new URLSearchParams();
  if (genre) params.append('genre', genre);
  params.append('daysBack', daysBack.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/query/new-titles?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch new titles');
  }
  
  const result = await response.json();
  return result.data;
}

export async function fetchGenreStats(): Promise<GenreStatsResult[]> {
  const response = await fetch(`${API_BASE_URL}/query/genre-stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch genre statistics');
  }
  
  const result = await response.json();
  return result.data;
}

// Search function for the frontend
export async function searchBooks(
  query?: string,
  filters?: {
    genre?: string;
    minRating?: number;
    maxRating?: number;
    minReviews?: number;
    minPrice?: number;
    maxPrice?: number;
    hasSupernatural?: boolean;
    hasRomance?: boolean;
  },
  limit: number = 100
): Promise<BookData[]> {
  const params = new URLSearchParams();
  
  if (query) params.append('q', query);
  if (filters?.genre) params.append('genre', filters.genre);
  if (filters?.minRating !== undefined) params.append('minRating', filters.minRating.toString());
  if (filters?.maxRating !== undefined) params.append('maxRating', filters.maxRating.toString());
  if (filters?.minReviews !== undefined) params.append('minReviews', filters.minReviews.toString());
  if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
  if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
  if (filters?.hasSupernatural !== undefined) params.append('hasSupernatural', filters.hasSupernatural.toString());
  if (filters?.hasRomance !== undefined) params.append('hasRomance', filters.hasRomance.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${API_BASE_URL}/query/search?${params}`);
  if (!response.ok) {
    throw new Error('Failed to search books');
  }
  
  const result = await response.json();
  return result.data;
}

/**
 * Export functions for DOCX generation
 */
export async function exportToDocx(books: BookData[]): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/export/docx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ books }),
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return await response.blob();
}

// Mock data for development/testing
const mockTopRated: TopRatedResult[] = [
  {
    ingested_date: '2025-08-11',
    genre: 'Fantasy',
    asin: 'B001',
    title: 'Dragon Wizard Supreme',
    author: 'Jane Fantasy',
    author_url: 'https://amazon.com/author/jane',
    series: 'Dragon Magic Series',
    price: 9.99,
    rating: 4.5,
    review_count: 250,
    rank_overall: 1500,
    release_date: '2025-08-01',
    publisher: 'Fantasy Books Inc',
    blurb_text: 'An epic fantasy adventure',
    cover_url: 'https://example.com/cover1.jpg',
    product_url: 'https://amazon.com/dp/B001',
    topic_tags: '["fantasy", "magic", "dragons"]',
    has_supernatural: true,
    has_romance: false,
    rank_position: 1,
  },
  {
    ingested_date: '2025-08-11',
    genre: 'Romance',
    asin: 'B002',
    title: 'Love in Paris',
    author: 'Sarah Romance',
    price: 3.99,
    rating: 4.8,
    review_count: 1200,
    rank_overall: 800,
    release_date: '2025-07-15',
    publisher: 'Romance Publishers',
    topic_tags: '["romance", "paris", "contemporary"]',
    has_supernatural: false,
    has_romance: true,
    rank_position: 2,
  },
];

const mockMovers: MoversResult[] = [
  {
    asin: 'B003',
    title: 'Rising Star Novel',
    author: 'New Author',
    genre: 'Fantasy',
    current_rank: 500,
    previous_rank: 1000,
    rank_change: 500,
    current_date: '2025-08-11',
    previous_date: '2025-08-04',
    rating: 4.2,
    review_count: 89,
    price: 7.99,
  },
];

const mockPriceBands: PriceBandResult[] = [
  {
    price_tier: 'Free',
    book_count: 45,
    avg_rating: 4.1,
    avg_review_count: 123,
    min_price: 0,
    max_price: 0,
    avg_price: 0,
    percentage_of_total: 15.2,
  },
  {
    price_tier: 'Budget',
    book_count: 78,
    avg_rating: 4.3,
    avg_review_count: 156,
    min_price: 0.99,
    max_price: 2.99,
    avg_price: 1.99,
    percentage_of_total: 26.4,
  },
];

const mockAuthorResults: AuthorSearchResult[] = mockTopRated.map(book => ({
  ...book,
  total_books: 3,
  avg_rating: 4.5,
}));

const mockNewTitles: NewTitlesResult[] = mockTopRated.map(book => ({
  ...book,
  is_new_release: true,
  days_since_release: 10,
}));

const mockGenreStats: GenreStatsResult[] = [
  {
    genre: 'Fantasy',
    total_books: 156,
    unique_authors: 89,
    avg_rating: 4.2,
    avg_price: 8.99,
    avg_reviews: 234,
    earliest_date: '2025-08-01',
    latest_date: '2025-08-11',
    supernatural_count: 145,
    romance_count: 23,
  },
  {
    genre: 'Romance',
    total_books: 203,
    unique_authors: 134,
    avg_rating: 4.4,
    avg_price: 5.99,
    avg_reviews: 189,
    earliest_date: '2025-08-01',
    latest_date: '2025-08-11',
    supernatural_count: 12,
    romance_count: 203,
  },
];
