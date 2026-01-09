"use strict";
/**
 * Test script to verify enhanced scrapers
 * Run with: npx ts-node src/test-scrapers.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAmazon = testAmazon;
exports.testFlipkart = testFlipkart;
const MetadataAdapterFactory_1 = require("./adapters/metadata/MetadataAdapterFactory");
// Initialize adapters
MetadataAdapterFactory_1.MetadataAdapterFactory.initialize();
const testUrls = {
    amazon: 'https://www.amazon.in/dp/B0CTKV1MN9', // Example product
    flipkart: 'https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itmbf14ef54f645d', // Example product
};
async function testAmazon() {
    console.log('\n=== Testing Amazon Scraper ===\n');
    const adapter = MetadataAdapterFactory_1.MetadataAdapterFactory.getAdapter(testUrls.amazon);
    console.log(`Selected adapter: ${adapter.name}`);
    const result = await adapter.fetchMetadata(testUrls.amazon);
    if (result.success && result.data) {
        console.log('\n✅ Amazon scraping successful!\n');
        console.log('Title:', result.data.title);
        console.log('Price:', result.data.price, result.data.currency);
        console.log('Brand:', result.data.brand);
        console.log('Rating:', result.data.rating);
        console.log('Reviews:', result.data.reviewCount);
        console.log('Availability:', result.data.availability);
        console.log('Images:', result.data.images?.length || 0, 'images');
        if (result.data.images && result.data.images.length > 0) {
            console.log('  - Main Image:', result.data.images[0].substring(0, 80) + '...');
        }
        console.log('Description:', result.data.description?.substring(0, 100) + '...');
        console.log('Highlights:', result.data.highlights?.length || 0, 'items');
        console.log('Specifications:', Object.keys(result.data.specifications || {}).length, 'specs');
        if (result.data.specifications) {
            const firstSpecs = Object.entries(result.data.specifications).slice(0, 3);
            firstSpecs.forEach(([key, value]) => {
                console.log(`  - ${key}: ${value}`);
            });
        }
    }
    else {
        console.log('\n❌ Amazon scraping failed!');
        console.log('Error:', result.error?.message);
    }
}
async function testFlipkart() {
    console.log('\n=== Testing Flipkart Scraper ===\n');
    const adapter = MetadataAdapterFactory_1.MetadataAdapterFactory.getAdapter(testUrls.flipkart);
    console.log(`Selected adapter: ${adapter.name}`);
    const result = await adapter.fetchMetadata(testUrls.flipkart);
    if (result.success && result.data) {
        console.log('\n✅ Flipkart scraping successful!\n');
        console.log('Title:', result.data.title);
        console.log('Price:', result.data.price, result.data.currency);
        console.log('Brand:', result.data.brand);
        console.log('Rating:', result.data.rating);
        console.log('Reviews:', result.data.reviewCount);
        console.log('Availability:', result.data.availability);
        console.log('Images:', result.data.images?.length || 0, 'images');
        if (result.data.images && result.data.images.length > 0) {
            console.log('  - Main Image:', result.data.images[0].substring(0, 80) + '...');
        }
        console.log('Description:', result.data.description?.substring(0, 100) + '...');
        console.log('Highlights:', result.data.highlights?.length || 0, 'items');
        console.log('Specifications:', Object.keys(result.data.specifications || {}).length, 'specs');
        if (result.data.specifications) {
            const firstSpecs = Object.entries(result.data.specifications).slice(0, 3);
            firstSpecs.forEach(([key, value]) => {
                console.log(`  - ${key}: ${value}`);
            });
        }
    }
    else {
        console.log('\n❌ Flipkart scraping failed!');
        console.log('Error:', result.error?.message);
    }
}
async function main() {
    try {
        await testAmazon();
        await testFlipkart();
        console.log('\n=== All tests completed ===\n');
        process.exit(0);
    }
    catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}
main();
