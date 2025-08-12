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

// Base API URL - will be Express server when implemented
const API_BASE_URL = 'http://localhost:3001/api';

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
  // Mock data for now - replace with real API call
  return mockTopRated.slice(0, limit);
}

export async function fetchMovers(
  genre?: string,
  minDeltaRank: number = 50,
  windowDays: number = 7
): Promise<MoversResult[]> {
  // Mock data for now
  return mockMovers;
}

export async function fetchPriceBands(genre?: string): Promise<PriceBandResult[]> {
  // Mock data for now
  return mockPriceBands;
}

export async function fetchAuthorSearch(
  query: string,
  limit: number = 50
): Promise<AuthorSearchResult[]> {
  // Mock data for now
  return mockAuthorResults.filter(book => 
    book.author.toLowerCase().includes(query.toLowerCase())
  ).slice(0, limit);
}

export async function fetchNewTitles(
  date: string,
  genre?: string
): Promise<NewTitlesResult[]> {
  // Mock data for now
  return mockNewTitles;
}

export async function fetchGenreStats(): Promise<GenreStatsResult[]> {
  // Mock data for now
  return mockGenreStats;
}

/**
 * Export functions for DOCX generation
 */
export async function exportToDocx(books: BookData[]): Promise<Blob> {
  // Mock implementation for Phase 4 - replace with real API call in Phase 5
  console.log('Mock DOCX export for', books.length, 'books');
  
  // Create a mock DOCX file content
  const mockDocxContent = `Book Export Report
Generated: ${new Date().toLocaleDateString()}

Selected Books (${books.length} total):

${books.map((book, index) => `
${index + 1}. ${book.title}
   Author: ${book.author}
   Genre: ${book.genre}
   Rating: ${book.rating ? book.rating.toFixed(1) + '★' : 'No rating'}
   Price: ${book.price ? '$' + book.price.toFixed(2) : 'No price'}
   Reviews: ${book.review_count || 'No reviews'}
   ${book.blurb_text ? 'Description: ' + book.blurb_text.substring(0, 200) + '...' : ''}
`).join('\n')}

End of Report`;

  // Create a blob with the mock content
  const blob = new Blob([mockDocxContent], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  
  // Simulate network delay for realistic experience
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return blob;
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
