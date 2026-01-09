/**
 * Simple diagnostic script to test scrapers
 * Run with: npx ts-node src/diagnose-scrapers.ts <amazon_or_flipkart_url>
 */

import { MetadataAdapterFactory } from './adapters/metadata/MetadataAdapterFactory';

async function diagnose(url: string) {
  console.log('='.repeat(60));
  console.log('SCRAPER DIAGNOSTIC TEST');
  console.log('='.repeat(60));
  console.log(`URL: ${url}\n`);
  
  try {
    // Initialize factory
    console.log('1. Initializing adapter factory...');
    MetadataAdapterFactory.initialize();
    console.log('   ✓ Factory initialized\n');
    
    // Get adapter
    console.log('2. Getting adapter for URL...');
    const adapter = MetadataAdapterFactory.getAdapter(url);
    console.log(`   ✓ Selected: ${adapter.name}\n`);
    
    // Fetch metadata
    console.log('3. Fetching metadata (this may take 10-30 seconds)...');
    const startTime = Date.now();
    
    const result = await adapter.fetchMetadata(url);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ⏱️  Took ${elapsed}s\n`);
    
    // Check result
    console.log('4. Checking result...\n');
    
    if (result.success && result.data) {
      console.log('✅ SUCCESS!');
      console.log('='.repeat(60));
      console.log(`Title: ${result.data.title || 'N/A'}`);
      console.log(`Price: ${result.data.price || 'N/A'} ${result.data.currency || ''}`);
      console.log(`Brand: ${result.data.brand || 'N/A'}`);
      console.log(`Images: ${result.data.images?.length || 0} found`);
      console.log(`Description: ${result.data.description ? result.data.description.substring(0, 80) + '...' : 'N/A'}`);
      console.log(`Highlights: ${result.data.highlights?.length || 0} items`);
      console.log(`Specifications: ${Object.keys(result.data.specifications || {}).length} specs`);
      console.log(`Rating: ${result.data.rating || 'N/A'}`);
      console.log(`Reviews: ${result.data.reviewCount || 'N/A'}`);
      console.log(`Availability: ${result.data.availability || 'N/A'}`);
      console.log(`Source: ${result.data.source}`);
      console.log('='.repeat(60));
    } else {
      console.log('❌ FAILED!');
      console.log('='.repeat(60));
      console.log(`Error Type: ${result.error?.type || 'UNKNOWN'}`);
      console.log(`Error Message: ${result.error?.message || 'No error message'}`);
      console.log(`Is Retryable: ${result.error?.isRetryable ? 'Yes' : 'No'}`);
      console.log('='.repeat(60));
      
      // Additional debugging
      if (result.error?.originalError) {
        console.log('\nOriginal Error:');
        console.log(result.error.originalError);
      }
    }
    
  } catch (error: any) {
    console.log('\n❌ UNEXPECTED ERROR!');
    console.log('='.repeat(60));
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
    console.log('='.repeat(60));
  }
  
  process.exit(0);
}

// Get URL from command line
const url = process.argv[2];

if (!url) {
  console.error('❌ Please provide a URL as argument');
  console.error('Usage: npx ts-node src/diagnose-scrapers.ts <url>');
  console.error('\nExample:');
  console.error('  npx ts-node src/diagnose-scrapers.ts https://www.amazon.in/dp/B0CTKV1MN9');
  process.exit(1);
}

diagnose(url);
