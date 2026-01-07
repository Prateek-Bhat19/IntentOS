# Adapter Configuration Guide

## Environment Variables

Add these variables to your `.env` file:

```bash
# Adapter Configuration
ENABLE_REAL_ADAPTERS=false  # Set to true to use real adapters instead of mocks

# API Keys (optional - only needed for specific adapters)
CANOPY_API_KEY=your-canopy-api-key-here

# Adapter Settings
ADAPTER_TIMEOUT_MS=10000      # Request timeout in milliseconds
ADAPTER_MAX_RETRIES=3         # Maximum retry attempts
ADAPTER_RATE_LIMIT_RPM=60     # Rate limit (requests per minute)
```

## Adapter System Overview

The adapter system follows the **ports & adapters (hexagonal architecture)** pattern:

- **Workers** depend on **interfaces** (`IMetadataAdapter`, `IPriceAdapter`)
- **Adapters** are swappable based on configuration
- **Errors** are classified as retryable or unrecoverable
- **Mocks** remain available for development/testing

## Current Adapters

### Metadata Adapters
- **MockMetadataAdapter**: Always available, returns mock data
- **OpenGraphAdapter**: (TODO) Generic adapter for any website
- **CanopyAdapter**: (TODO) Unified API for Amazon/Flipkart

### Price Adapters
- **MockPriceAdapter**: Always available, returns random prices
- **CanopyPriceAdapter**: (TODO) Real price checking

## Adapter Selection

The factory automatically selects the best adapter:

1. **Specific adapter** (Canopy/Amazon/Flipkart) - if URL matches
2. **Generic adapter** (OpenGraph) - fallback for any URL
3. **Mock adapter** - last resort or when `ENABLE_REAL_ADAPTERS=false`

## Error Handling

Errors are classified into two categories:

### Unrecoverable (No Retry)
- Invalid URL
- Product not found
- Authentication failed
- Unsupported source

### Retryable (Will Retry)
- Network errors
- Timeouts
- Rate limiting
- Server errors (5xx)
- Parsing errors

## Next Steps

1. Implement `OpenGraphAdapter` for generic metadata fetching
2. Integrate Canopy API for Amazon/Flipkart support
3. Add rate limiting middleware
4. Implement priority-based price check scheduling
