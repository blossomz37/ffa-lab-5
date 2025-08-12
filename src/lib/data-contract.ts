/**
 * Data Contract Types and Utilities
 * 
 * Defines the schema and validation rules for the FFA Lab 5 book data pipeline.
 * Handles parsing Excel files from /data_raw/ into clean CSV format for DuckDB.
 */

// Genre key to display name mapping based on filename patterns
export const GENRE_MAPPING: Record<string, string> = {
  '_cozy_mystery': 'Cozy Mystery',
  '_erotica': 'Erotica',
  '_fantasy': 'Fantasy',
  '_gay_romance': 'Gay Romance',
  '_historical_romance': 'Historical Romance',
  '_m_t_s': 'Mystery, Thriller & Suspense',
  '_paranormal': 'Paranormal Romance',
  '_romance_1hr': 'Romance Short Reads (1hr)',
  '_romance': 'Romance',
  '_science_fiction': 'Science Fiction',
  '_science_fiction_romance': 'Science Fiction Romance',
  '_sff': 'Science Fiction & Fantasy',
  '_teen_and_ya': 'Teen & Young Adult',
  '_urban_fantasy': 'Urban Fantasy',
} as const;

// Excel columns to extract (based on ETL Reference TRUE flags)
export const EXCEL_COLUMNS_TO_EXTRACT = [
  'Title',
  'ASIN',
  'Author',
  'Series',
  'nReviews',
  'reviewAverage',
  'price',
  'salesRank',
  'releaseDate',
  'publisher',
  'blurbText',
  'coverImage',
  'bookURL',
  'topicTags',
  'blurbKeyphrases',
  'subcatsList',
  'estimatedBlurbPOV',
  'hasSupernatural',
  'hasRomance',
] as const;

/**
 * Clean row schema for CSV output and DuckDB storage
 */
export interface CleanRow {
  /** Date extracted from filename (YYYY-MM-DD format) */
  ingested_date: string;
  
  /** Human-readable genre name from mapping */
  genre: string;
  
  /** Amazon Standard Identification Number - unique identifier */
  asin: string;
  
  /** Book title */
  title: string;
  
  /** Author name (parsed from hyperlink text) */
  author: string;
  
  /** Author's Amazon store URL (extracted from hyperlink) */
  author_url?: string;
  
  /** Book series name if part of a series */
  series?: string;
  
  /** Book price in USD */
  price?: number;
  
  /** Average review rating (0-5 scale) */
  rating?: number;
  
  /** Total number of reviews */
  review_count?: number;
  
  /** Overall Amazon sales rank */
  rank_overall?: number;
  
  /** Publication/release date (ISO format) */
  release_date?: string;
  
  /** Publisher name */
  publisher?: string;
  
  /** Book description/blurb text */
  blurb_text?: string;
  
  /** Cover image URL */
  cover_url?: string;
  
  /** Amazon product page URL */
  product_url?: string;
  
  /** Topic tags as JSON array string */
  topic_tags?: string;
  
  /** Subcategories as JSON array string */
  subcategories?: string;
  
  /** Key phrases extracted from blurb */
  blurb_keyphrases?: string;
  
  /** Estimated point of view (first person, third person, etc.) */
  estimated_pov?: string;
  
  /** Whether book contains supernatural elements */
  has_supernatural?: boolean;
  
  /** Whether book contains romance elements */
  has_romance?: boolean;
}

/**
 * Raw Excel row interface (before cleaning)
 */
export interface RawExcelRow {
  Title?: string;
  ASIN?: string;
  Author?: string;
  Series?: string;
  nReviews?: string | number;
  reviewAverage?: string | number;
  price?: string | number;
  salesRank?: string | number;
  releaseDate?: string;
  publisher?: string;
  blurbText?: string;
  coverImage?: string;
  bookURL?: string;
  topicTags?: string;
  blurbKeyphrases?: string;
  subcatsList?: string;
  estimatedBlurbPOV?: string;
  hasSupernatural?: string | boolean;
  hasRomance?: string | boolean;
  [key: string]: any; // Allow for additional columns
}

/**
 * Validation result for a single row
 */
export interface ValidationResult {
  /** Whether the row passed validation */
  ok: boolean;
  
  /** Cleaned row data (if validation passed) */
  row?: CleanRow;
  
  /** List of validation errors (if validation failed) */
  errors?: string[];
}

/**
 * Filename parsing result
 */
export interface FilenameInfo {
  /** Extracted date in YYYY-MM-DD format */
  date: string;
  
  /** Genre key from filename */
  genreKey: string;
  
  /** Human-readable genre name */
  genreName: string;
}

/**
 * Maps genre key to human-readable display name
 * @param key - Genre key from filename (e.g., "_fantasy")
 * @returns Human-readable genre name or the key itself if not found
 */
export function genreKeyToName(key: string): string {
  return GENRE_MAPPING[key] || key;
}

/**
 * Parses filename to extract date and genre information
 * @param filename - Excel filename (e.g., "20250811_fantasy_raw_data.xlsx")
 * @returns Parsed filename information
 */
export function parseFilename(filename: string): FilenameInfo {
  // Extract date (first 8 characters)
  const dateStr = filename.substring(0, 8);
  const date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  
  // Extract genre key (between date and "_raw_data.xlsx")
  const afterDate = filename.substring(8);
  const genreKey = afterDate.replace('_raw_data.xlsx', '');
  
  return {
    date,
    genreKey,
    genreName: genreKeyToName(genreKey),
  };
}

/**
 * Parses author hyperlink to extract name and URL
 * @param authorField - Raw author field (e.g., "[Jessamine Chan](https://amazon.com/...)")
 * @returns Object with author name and optional URL
 */
export function parseAuthorField(authorField: string): { name: string; url?: string } {
  // Match markdown-style link: [Author Name](URL)
  const linkMatch = authorField.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  
  if (linkMatch) {
    return {
      name: linkMatch[1].trim(),
      url: linkMatch[2].trim(),
    };
  }
  
  // If no link format, return as plain text
  return {
    name: authorField.trim(),
  };
}

/**
 * Validates and normalizes a URL
 * @param url - URL string to validate
 * @returns Cleaned URL or null if invalid
 */
export function validateUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  try {
    const parsed = new URL(trimmed);
    return parsed.href;
  } catch {
    // Try adding https:// if missing protocol
    try {
      const withProtocol = `https://${trimmed}`;
      const parsed = new URL(withProtocol);
      return parsed.href;
    } catch {
      return null;
    }
  }
}

/**
 * Parses topic tags from pipe-separated string
 * @param tagsString - Pipe-separated tags (e.g., "tag1|tag2|tag3")
 * @returns Array of cleaned tag strings
 */
export function parseTopicTags(tagsString: string): string[] {
  if (!tagsString || typeof tagsString !== 'string') return [];
  
  return tagsString
    .split('|')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * Converts string or number to boolean
 * @param value - Value to convert
 * @returns Boolean value or null if cannot determine
 */
export function parseBoolean(value: any): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === 'yes' || lower === '1') return true;
    if (lower === 'false' || lower === 'no' || lower === '0' || lower === '') return false;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return null;
}

/**
 * Validates and cleans a raw Excel row
 * @param raw - Raw row data from Excel
 * @param fileInfo - Parsed filename information
 * @returns Validation result with cleaned row or errors
 */
export function validateRow(raw: RawExcelRow, fileInfo: FilenameInfo): ValidationResult {
  const errors: string[] = [];
  const row: Partial<CleanRow> = {};
  
  // Required fields
  if (!raw.ASIN || typeof raw.ASIN !== 'string' || !raw.ASIN.trim()) {
    errors.push('ASIN is required');
  } else {
    row.asin = raw.ASIN.trim();
  }
  
  if (!raw.Title || typeof raw.Title !== 'string' || !raw.Title.trim()) {
    errors.push('Title is required');
  } else {
    row.title = raw.Title.trim();
  }
  
  if (!raw.Author || typeof raw.Author !== 'string' || !raw.Author.trim()) {
    errors.push('Author is required');
  } else {
    const authorInfo = parseAuthorField(raw.Author);
    row.author = authorInfo.name;
    if (authorInfo.url) {
      const validUrl = validateUrl(authorInfo.url);
      if (validUrl) {
        row.author_url = validUrl;
      }
    }
  }
  
  // Set required metadata
  row.ingested_date = fileInfo.date;
  row.genre = fileInfo.genreName;
  
  // Optional fields with validation
  if (raw.Series && typeof raw.Series === 'string') {
    row.series = raw.Series.trim() || undefined;
  }
  
  if (raw.price !== undefined && raw.price !== null && raw.price !== '') {
    const priceNum = typeof raw.price === 'number' ? raw.price : parseFloat(String(raw.price));
    if (!isNaN(priceNum) && priceNum >= 0) {
      row.price = priceNum;
    }
  }
  
  if (raw.reviewAverage !== undefined && raw.reviewAverage !== null && raw.reviewAverage !== '') {
    const ratingNum = typeof raw.reviewAverage === 'number' ? raw.reviewAverage : parseFloat(String(raw.reviewAverage));
    if (!isNaN(ratingNum) && ratingNum >= 0 && ratingNum <= 5) {
      row.rating = ratingNum;
    }
  }
  
  if (raw.nReviews !== undefined && raw.nReviews !== null && raw.nReviews !== '') {
    const reviewsNum = typeof raw.nReviews === 'number' ? raw.nReviews : parseInt(String(raw.nReviews), 10);
    if (!isNaN(reviewsNum) && reviewsNum >= 0) {
      row.review_count = reviewsNum;
    }
  }
  
  if (raw.salesRank !== undefined && raw.salesRank !== null && raw.salesRank !== '') {
    const rankNum = typeof raw.salesRank === 'number' ? raw.salesRank : parseInt(String(raw.salesRank), 10);
    if (!isNaN(rankNum) && rankNum > 0) {
      row.rank_overall = rankNum;
    }
  }
  
  // URL fields
  if (raw.coverImage && typeof raw.coverImage === 'string') {
    const validUrl = validateUrl(raw.coverImage);
    if (validUrl) row.cover_url = validUrl;
  }
  
  if (raw.bookURL && typeof raw.bookURL === 'string') {
    const validUrl = validateUrl(raw.bookURL);
    if (validUrl) row.product_url = validUrl;
  }
  
  // Text fields
  if (raw.publisher && typeof raw.publisher === 'string') {
    row.publisher = raw.publisher.trim() || undefined;
  }
  
  if (raw.blurbText && typeof raw.blurbText === 'string') {
    row.blurb_text = raw.blurbText.trim() || undefined;
  }
  
  if (raw.blurbKeyphrases && typeof raw.blurbKeyphrases === 'string') {
    row.blurb_keyphrases = raw.blurbKeyphrases.trim() || undefined;
  }
  
  if (raw.estimatedBlurbPOV && typeof raw.estimatedBlurbPOV === 'string') {
    row.estimated_pov = raw.estimatedBlurbPOV.trim() || undefined;
  }
  
  // Date field
  if (raw.releaseDate && typeof raw.releaseDate === 'string') {
    const dateStr = raw.releaseDate.trim();
    if (dateStr) {
      // Try to parse date and convert to ISO format
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        row.release_date = parsed.toISOString().split('T')[0];
      }
    }
  }
  
  // Array fields (stored as JSON strings)
  if (raw.topicTags && typeof raw.topicTags === 'string') {
    const tags = parseTopicTags(raw.topicTags);
    if (tags.length > 0) {
      row.topic_tags = JSON.stringify(tags);
    }
  }
  
  if (raw.subcatsList && typeof raw.subcatsList === 'string') {
    // Split subcategories (assuming comma or semicolon separated)
    const subcats = raw.subcatsList
      .split(/[,;]/)
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);
    if (subcats.length > 0) {
      row.subcategories = JSON.stringify(subcats);
    }
  }
  
  // Boolean fields
  const supernatural = parseBoolean(raw.hasSupernatural);
  if (supernatural !== null) row.has_supernatural = supernatural;
  
  const romance = parseBoolean(raw.hasRomance);
  if (romance !== null) row.has_romance = romance;
  
  // Return result
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  
  return { ok: true, row: row as CleanRow };
}
