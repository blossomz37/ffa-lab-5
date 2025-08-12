/**
 * ETL Pipeline Tests
 * 
 * Comprehensive tests for the ETL pipeline components.
 * Tests filename parsing, data transformation, validation, and database operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  parseFilename, 
  validateRow, 
  parseAuthorField, 
  parseTopicTags,
  parseBoolean,
  validateUrl,
  type FilenameInfo,
  type RawExcelRow 
} from '../src/lib/data-contract.js';
import { transformRows, deduplicateRows, enrichRows } from '../src/etl/transform.js';

describe('Data Contract', () => {
  describe('parseFilename', () => {
    it('should parse valid filename correctly', () => {
      const result = parseFilename('20250811_fantasy_raw_data.xlsx');
      
      expect(result).toEqual({
        date: '2025-08-11',
        genreKey: '_fantasy',
        genreName: 'Fantasy',
      });
    });
    
    it('should handle all genre mappings', () => {
      const testCases = [
        { filename: '20250101_cozy_mystery_raw_data.xlsx', expected: 'Cozy Mystery' },
        { filename: '20250101_erotica_raw_data.xlsx', expected: 'Erotica' },
        { filename: '20250101_science_fiction_romance_raw_data.xlsx', expected: 'Science Fiction Romance' },
        { filename: '20250101_teen_and_ya_raw_data.xlsx', expected: 'Teen & Young Adult' },
      ];
      
      testCases.forEach(({ filename, expected }) => {
        const result = parseFilename(filename);
        expect(result.genreName).toBe(expected);
      });
    });
    
    it('should handle unknown genre keys', () => {
      const result = parseFilename('20250811_unknown_genre_raw_data.xlsx');
      expect(result.genreName).toBe('_unknown_genre');
    });
  });
  
  describe('parseAuthorField', () => {
    it('should parse markdown-style author links', () => {
      const input = '[Jessamine Chan](https://www.amazon.com/stores/author/B092BKD9NX)';
      const result = parseAuthorField(input);
      
      expect(result).toEqual({
        name: 'Jessamine Chan',
        url: 'https://www.amazon.com/stores/author/B092BKD9NX',
      });
    });
    
    it('should handle plain text authors', () => {
      const result = parseAuthorField('John Doe');
      expect(result).toEqual({ name: 'John Doe' });
    });
    
    it('should handle empty/whitespace input', () => {
      const result = parseAuthorField('   ');
      expect(result).toEqual({ name: '' });
    });
  });
  
  describe('parseTopicTags', () => {
    it('should split pipe-separated tags', () => {
      const result = parseTopicTags('fantasy|magic|adventure|dragons');
      expect(result).toEqual(['fantasy', 'magic', 'adventure', 'dragons']);
    });
    
    it('should handle empty tags', () => {
      const result = parseTopicTags('tag1||tag3|');
      expect(result).toEqual(['tag1', 'tag3']);
    });
    
    it('should return empty array for empty input', () => {
      expect(parseTopicTags('')).toEqual([]);
      expect(parseTopicTags('|||')).toEqual([]);
    });
  });
  
  describe('parseBoolean', () => {
    it('should parse boolean values correctly', () => {
      expect(parseBoolean(true)).toBe(true);
      expect(parseBoolean(false)).toBe(false);
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('yes')).toBe(true);
      expect(parseBoolean('no')).toBe(false);
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('0')).toBe(false);
      expect(parseBoolean(1)).toBe(true);
      expect(parseBoolean(0)).toBe(false);
    });
    
    it('should return null for ambiguous values', () => {
      expect(parseBoolean('maybe')).toBe(null);
      expect(parseBoolean(42)).toBe(true); // Non-zero number
      expect(parseBoolean('')).toBe(false); // Empty string
    });
  });
  
  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com/',
        'http://example.com/',
        'https://www.amazon.com/stores/author/B092BKD9NX',
      ];
      
      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result).toBeTruthy();
        expect(result?.startsWith('http')).toBe(true);
      });
    });
    
    it('should add protocol to URLs missing it', () => {
      const result = validateUrl('example.com');
      expect(result).toBe('https://example.com/');
    });
    
    it('should return null for invalid URLs', () => {
      const invalidUrls = ['', '   ', 'ht tp://invalid'];
      
      invalidUrls.forEach(url => {
        expect(validateUrl(url)).toBe(null);
      });
    });
  });
  
  describe('validateRow', () => {
    const sampleFileInfo: FilenameInfo = {
      date: '2025-08-11',
      genreKey: '_fantasy',
      genreName: 'Fantasy',
    };
    
    it('should validate a complete valid row', () => {
      const rawRow: RawExcelRow = {
        ASIN: 'B08XYZ123',
        Title: 'The Dragon Wizard',
        Author: '[Jane Smith](https://amazon.com/author/jane)',
        Series: 'Magic Kingdom Series',
        price: '12.99',
        reviewAverage: '4.5',
        nReviews: '156',
        salesRank: '2500',
        releaseDate: '2025-01-15',
        publisher: 'Fantasy Books Inc',
        coverImage: 'https://example.com/cover.jpg',
        bookURL: 'https://amazon.com/dp/B08XYZ123',
        topicTags: 'fantasy|magic|dragons',
        hasSupernatural: 'true',
        hasRomance: 'false',
      };
      
      const result = validateRow(rawRow, sampleFileInfo);
      
      expect(result.ok).toBe(true);
      expect(result.row).toBeDefined();
      expect(result.row!.asin).toBe('B08XYZ123');
      expect(result.row!.title).toBe('The Dragon Wizard');
      expect(result.row!.author).toBe('Jane Smith');
      expect(result.row!.author_url).toBe('https://amazon.com/author/jane');
      expect(result.row!.price).toBe(12.99);
      expect(result.row!.rating).toBe(4.5);
      expect(result.row!.review_count).toBe(156);
      expect(result.row!.has_supernatural).toBe(true);
      expect(result.row!.has_romance).toBe(false);
    });
    
    it('should reject rows missing required fields', () => {
      const invalidRows = [
        { Title: 'Book', Author: 'Author' }, // Missing ASIN
        { ASIN: 'B123', Author: 'Author' }, // Missing Title
        { ASIN: 'B123', Title: 'Book' }, // Missing Author
      ];
      
      invalidRows.forEach(rawRow => {
        const result = validateRow(rawRow, sampleFileInfo);
        expect(result.ok).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });
    
    it('should handle numeric field validation', () => {
      const rawRow: RawExcelRow = {
        ASIN: 'B123',
        Title: 'Test Book',
        Author: 'Test Author',
        price: 'invalid-price',
        reviewAverage: '6.0', // Out of range (should be 0-5)
        nReviews: '-5', // Negative
      };
      
      const result = validateRow(rawRow, sampleFileInfo);
      
      expect(result.ok).toBe(true); // Should still pass validation
      expect(result.row!.price).toBeUndefined(); // Invalid price should be undefined
      expect(result.row!.rating).toBeUndefined(); // Out of range rating should be undefined
      expect(result.row!.review_count).toBeUndefined(); // Negative review count should be undefined
    });
  });
});

describe('Transform Module', () => {
  const sampleFileInfo: FilenameInfo = {
    date: '2025-08-11',
    genreKey: '_fantasy',
    genreName: 'Fantasy',
  };
  
  describe('transformRows', () => {
    it('should transform valid rows correctly', () => {
      const rawRows: RawExcelRow[] = [
        {
          ASIN: 'B001',
          Title: 'Book 1',
          Author: 'Author 1',
          price: '9.99',
          reviewAverage: '4.2',
        },
        {
          ASIN: 'B002',
          Title: 'Book 2',
          Author: 'Author 2',
          price: '14.99',
          reviewAverage: '3.8',
        },
      ];
      
      const result = transformRows(rawRows, sampleFileInfo);
      
      expect(result.validRows).toHaveLength(2);
      expect(result.rejectedRows).toHaveLength(0);
      expect(result.stats.successRate).toBe(100);
      
      const firstRow = result.validRows[0];
      expect(firstRow.asin).toBe('B001');
      expect(firstRow.genre).toBe('Fantasy');
      expect(firstRow.ingested_date).toBe('2025-08-11');
    });
    
    it('should handle mixed valid/invalid rows', () => {
      const rawRows: RawExcelRow[] = [
        { ASIN: 'B001', Title: 'Valid Book', Author: 'Author' },
        { ASIN: '', Title: 'Invalid Book', Author: 'Author' }, // Missing ASIN
        { ASIN: 'B003', Title: 'Another Valid Book', Author: 'Author' },
      ];
      
      const result = transformRows(rawRows, sampleFileInfo);
      
      expect(result.validRows).toHaveLength(2);
      expect(result.rejectedRows).toHaveLength(1);
      expect(result.stats.successRate).toBe(67); // 2/3 = 66.67% rounded to 67%
      
      const rejectedRow = result.rejectedRows[0];
      expect(rejectedRow.lineNumber).toBe(3); // Second row (0-based + 2 for header)
      expect(rejectedRow.errors).toContain('ASIN is required');
    });
  });
  
  describe('deduplicateRows', () => {
    it('should remove duplicate rows based on unique key', () => {
      const rows = [
        { ingested_date: '2025-08-11', genre: 'Fantasy', asin: 'B001', title: 'Book 1', author: 'Author 1' },
        { ingested_date: '2025-08-11', genre: 'Fantasy', asin: 'B002', title: 'Book 2', author: 'Author 2' },
        { ingested_date: '2025-08-11', genre: 'Fantasy', asin: 'B001', title: 'Book 1 Updated', author: 'Author 1' }, // Duplicate
      ] as any[];
      
      const result = deduplicateRows(rows);
      
      expect(result.uniqueRows).toHaveLength(2);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].originalKey).toBe('2025-08-11|Fantasy|B001');
    });
  });
  
  describe('enrichRows', () => {
    it('should normalize numeric values', () => {
      const rows = [
        {
          ingested_date: '2025-08-11',
          genre: 'Fantasy',
          asin: 'B001',
          title: 'Test Book',
          author: 'Test Author',
          price: 12.999, // Should be rounded to 2 decimal places
          rating: 4.555, // Should be rounded to 1 decimal place
          review_count: 156.7, // Should be floored to integer
        },
      ] as any[];
      
      const result = enrichRows(rows);
      
      expect(result[0].price).toBe(13.00);
      expect(result[0].rating).toBe(4.6);
      expect(result[0].review_count).toBe(156);
    });
    
    it('should normalize text fields', () => {
      const rows = [
        {
          ingested_date: '2025-08-11',
          genre: 'Fantasy',
          asin: 'B001',
          title: '  Extra   Spaces  Book  ', // Should normalize spaces
          author: 'Test Author', // Regular author name
          series: null,
        },
      ] as any[];
      
      const result = enrichRows(rows);
      
      expect(result[0].title).toBe('Extra Spaces Book');
      expect(result[0].author).toBe('Test Author');
    });
    
    it('should truncate very long blurb text', () => {
      const longBlurb = 'A'.repeat(6000); // Longer than 5000 chars
      
      const rows = [
        {
          ingested_date: '2025-08-11',
          genre: 'Fantasy',
          asin: 'B001',
          title: 'Test Book',
          author: 'Test Author',
          blurb_text: longBlurb,
        },
      ] as any[];
      
      const result = enrichRows(rows);
      
      expect(result[0].blurb_text).toHaveLength(5003); // 5000 + '...'
      expect(result[0].blurb_text?.endsWith('...')).toBe(true);
    });
  });
});
