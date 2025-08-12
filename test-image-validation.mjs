/**
 * Test Image Validation functionality
 */

import { probeImage, probeImages } from '../src/etl/imageValidation.js';

async function testImageValidation() {
  console.log('🧪 Testing Image Validation...\n');

  // Test valid image URLs
  const validUrls = [
    'https://picsum.photos/200/300', // Lorem Picsum - should work
    'https://via.placeholder.com/150', // Placeholder service - should work
  ];

  // Test invalid URLs
  const invalidUrls = [
    'https://example.com/nonexistent.jpg', // 404 error
    'invalid-url', // Invalid URL format
    '', // Empty string
  ];

  console.log('Testing valid image URLs:');
  for (const url of validUrls) {
    const result = await probeImage(url);
    console.log(`  ${url}: ${result ? '✅ Valid' : '❌ Invalid'}`);
  }

  console.log('\nTesting invalid image URLs:');
  for (const url of invalidUrls) {
    const result = await probeImage(url);
    console.log(`  ${url || '(empty)'}: ${result ? '✅ Valid' : '❌ Invalid'}`);
  }

  console.log('\nTesting batch validation:');
  const allUrls = [...validUrls, ...invalidUrls];
  const results = await probeImages(allUrls);
  results.forEach((result, index) => {
    console.log(`  ${allUrls[index] || '(empty)'}: ${result ? '✅' : '❌'}`);
  });

  console.log('\n🎉 Image validation tests completed!');
}

// Run the test
testImageValidation().catch(console.error);
