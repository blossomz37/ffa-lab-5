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
