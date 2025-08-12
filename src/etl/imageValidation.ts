/**
 * Image Validation Module
 * 
 * Provides functions to validate image URLs during ETL processing.
 * Validates cover image URLs by probing them and sets cover_ok field.
 */

import fetch from 'node-fetch';

/**
 * Probes an image URL to check if it's accessible and valid
 * @param url The image URL to probe
 * @returns Promise<boolean> true if image is accessible, false otherwise
 */
export async function probeImage(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return false;
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading the full image
      timeout: 5000,  // 5 second timeout
      headers: {
        'User-Agent': 'BookETL/1.0 (Image Validator)'
      }
    });

    // Check if response is successful and content type is an image
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      return contentType ? contentType.startsWith('image/') : false;
    }

    return false;
  } catch (error) {
    console.warn(`Image probe failed for ${url}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Probes multiple images in parallel with concurrency limit
 * @param urls Array of image URLs to probe
 * @param concurrency Maximum number of concurrent requests (default: 10)
 * @returns Promise<boolean[]> Array of results corresponding to input URLs
 */
export async function probeImages(urls: string[], concurrency: number = 10): Promise<boolean[]> {
  const results: boolean[] = new Array(urls.length);
  
  // Process URLs in batches to respect concurrency limit
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(url => probeImage(url));
    const batchResults = await Promise.all(batchPromises);
    
    // Store results in the correct positions
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
    
    // Small delay between batches to be respectful to servers
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Validates cover images for an array of CleanRow objects
 * @param rows Array of clean rows to validate images for
 * @param concurrency Maximum number of concurrent requests (default: 10)
 * @returns Promise<CleanRow[]> Rows with cover_ok field updated
 */
export async function validateCoverImages(
  rows: CleanRow[], 
  concurrency: number = 10
): Promise<CleanRow[]> {
  console.log(`🖼️  Validating ${rows.length} cover images...`);
  
  // Extract unique cover URLs
  const urlMap = new Map<string, number[]>(); // URL -> array of row indices
  
  rows.forEach((row, index) => {
    if (row.cover_url) {
      if (!urlMap.has(row.cover_url)) {
        urlMap.set(row.cover_url, []);
      }
      urlMap.get(row.cover_url)!.push(index);
    }
  });
  
  const uniqueUrls = Array.from(urlMap.keys());
  console.log(`🔍 Found ${uniqueUrls.length} unique URLs to validate...`);
  
  // Validate unique URLs
  const validationResults = await probeImages(uniqueUrls, concurrency);
  
  // Create URL to validity mapping
  const urlValidityMap = new Map<string, boolean>();
  uniqueUrls.forEach((url, index) => {
    urlValidityMap.set(url, validationResults[index]);
  });
  
  // Update rows with validation results
  const updatedRows = rows.map(row => {
    const updatedRow = { ...row };
    
    if (row.cover_url) {
      updatedRow.cover_ok = urlValidityMap.get(row.cover_url) || false;
    } else {
      updatedRow.cover_ok = false;
    }
    
    return updatedRow;
  });
  
  // Log summary
  const validImages = updatedRows.filter(row => row.cover_ok).length;
  const totalImages = updatedRows.filter(row => row.cover_url).length;
  console.log(`✅ Image validation complete: ${validImages}/${totalImages} images valid`);
  
  return updatedRows;
}
