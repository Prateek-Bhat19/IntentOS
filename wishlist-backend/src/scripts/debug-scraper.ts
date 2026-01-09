

import { AmazonPuppeteerAdapter } from "../adapters/metadata/AmazonPuppeteerAdapter";
import { FlipkartPuppeteerAdapter } from "../adapters/metadata/FlipkartPuppeteerAdapter";
import { OpenGraphAdapter } from "../adapters/metadata/OpenGraphAdapter";
import { adapterConfig } from "../adapters/config/adapterConfig";

// ...

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Please provide a URL as an argument");
    process.exit(1);
  }

  console.log(`Testing scraper for URL: ${url}`);

  let adapter;
  if (url.includes("amazon")) {
    adapter = new AmazonPuppeteerAdapter();
  } else if (url.includes("flipkart")) {
    adapter = new FlipkartPuppeteerAdapter();
  } else {
    adapter = new OpenGraphAdapter();
  }

  console.log(`Selected adapter: ${adapter.name}`);

  try {
    const result = await adapter.fetchMetadata(url);
    if (result.success && result.data) {
        console.log("--- SCRAPER SUCCESS ---");
        console.log("Title:", result.data.title);
        console.log("Brand:", result.data.brand);
        console.log("Price:", result.data.price);
        console.log("Image:", result.data.imageUrl);
        console.log("Source:", result.data.source);
        console.log("-----------------------");
        require('fs').writeFileSync('success_log.json', JSON.stringify(result.data, null, 2));
    } else {
        console.log("--- SCRAPER FAILED ---");
        console.log("Error:", result.error?.message);
    }

  } catch (error) {
    console.error("Unhandled error:", error);
  }
}

main();
