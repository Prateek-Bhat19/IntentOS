# Testing Guide: Adapter System with Postman

## Prerequisites

✅ Server running: `npm run dev` (port 8000)
✅ Worker running: `npm run worker:buy`
✅ PostgreSQL running
✅ Redis running

## Step 1: Authentication

### 1.1 Register a User

**Request:**
```
POST http://localhost:8000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "securepassword123"
}
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com"
  }
}
```

### 1.2 Login (if already registered)

**Request:**
```
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "securepassword123"
}
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**⚠️ Important:** Copy the token! You'll need it for all subsequent requests.

---

## Step 2: Create Buy Item with Real URL

### 2.1 Set Authorization Header

In Postman, for all requests below:
- Go to **Authorization** tab
- Type: **Bearer Token**
- Token: `<paste your token here>`

### 2.2 Create Buy Item

**Request:**
```
POST http://localhost:8000/api/buy
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "title": "Test Product",
  "priority": "HIGH",
  "link": "https://www.amazon.in/dp/B0CX59SMVQ",
  "targetPrice": 50000,
  "notes": "Testing OpenGraph adapter"
}
```

**Test URLs you can use:**
- Amazon: `https://www.amazon.in/dp/B0CX59SMVQ`
- Flipkart: `https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485bb3a84`
- Any e-commerce site with Open Graph tags

**Expected Response:**
```json
{
  "id": "uuid-here",
  "title": "Test Product",
  "priority": "HIGH",
  "status": "PLANNED",
  "link": "https://www.amazon.in/dp/B0CX59SMVQ",
  "targetPrice": 50000,
  "notes": "Testing OpenGraph adapter",
  "metadata": null,
  "createdAt": "2026-01-07T04:30:00.000Z",
  "updatedAt": "2026-01-07T04:30:00.000Z"
}
```

---

## Step 3: Watch the Magic Happen! 🎉

### 3.1 Check Worker Logs

In your worker terminal, you should see:

```
{"level":30,"time":...,"adapter":"Mock","url":"https://...","itemId":"...","msg":"Fetching metadata"}
{"level":30,"time":...,"itemId":"...","source":"Mock","msg":"Metadata attached successfully"}
{"level":30,"time":...,"jobId":"...","jobName":"FETCH_METADATA","msg":"Job completed"}
```

**With ENABLE_REAL_ADAPTERS=false:**
- Adapter: "Mock"
- Returns mock data

**With ENABLE_REAL_ADAPTERS=true:**
- Adapter: "OpenGraph"
- Fetches real data from the URL!

### 3.2 Enable Real Adapters (Optional)

To test with **real OpenGraph adapter**:

1. **Update `.env`:**
   ```bash
   ENABLE_REAL_ADAPTERS=true
   ```

2. **Restart both terminals** (Ctrl+C and run again)

3. **Create another buy item** with a real URL

4. **Watch worker logs** - you'll see:
   ```
   {"adapter":"OpenGraph","url":"https://...","msg":"Fetching metadata"}
   ```

---

## Step 4: Verify Metadata Was Saved

### 4.1 List Buy Items

**Request:**
```
GET http://localhost:8000/api/buy?page=1&limit=10&sort=createdAt&order=desc
Authorization: Bearer <your-token>
```

**Expected Response:**
```json
{
  "items": [
    {
      "id": "uuid-here",
      "title": "Test Product",
      "priority": "HIGH",
      "status": "PLANNED",
      "link": "https://www.amazon.in/dp/B0CX59SMVQ",
      "targetPrice": 50000,
      "metadata": {
        "title": "Mock Product Title",
        "description": "This is a mock product description for testing",
        "imageUrl": "https://via.placeholder.com/300",
        "price": 5432,
        "currency": "INR",
        "availability": "IN_STOCK",
        "brand": "Mock Brand",
        "source": "Mock",
        "fetchedAt": "2026-01-07T04:30:15.123Z"
      },
      "createdAt": "2026-01-07T04:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

**With Real Adapter:**
The `metadata` field will contain real data extracted from the URL!

---

## Step 5: Test Price Checking (Manual Trigger)

Price checking normally runs via cron (every 6 hours for MEDIUM priority), but you can test it manually:

### 5.1 Wait for Cron or Trigger Manually

The cron job runs automatically based on priority:
- HIGH: Every 2 hours
- MEDIUM: Every 6 hours
- LOW: Every 24 hours

**To test immediately:**
You'd need to manually enqueue a price check job (not exposed via API yet).

---

## Step 6: Testing Different Scenarios

### 6.1 Test Invalid URL

**Request:**
```json
{
  "title": "Invalid URL Test",
  "priority": "LOW",
  "link": "not-a-valid-url",
  "targetPrice": 1000
}
```

**Expected:**
- Worker logs: "Invalid URL – permanent failure"
- Job moves to failed queue (no retry)

### 6.2 Test 404 URL

**Request:**
```json
{
  "title": "404 Test",
  "priority": "LOW",
  "link": "https://www.amazon.in/dp/INVALID123",
  "targetPrice": 1000
}
```

**Expected:**
- Worker logs: "Product not found"
- Job moves to failed queue (no retry)

### 6.3 Test Network Timeout

Set a very short timeout in `.env`:
```bash
ADAPTER_TIMEOUT_MS=100
```

**Expected:**
- Worker logs: "Request timed out"
- Job retries with exponential backoff

---

## Debugging Tips

### Check Job Queue Status

You can use Redis CLI to inspect jobs:

```bash
redis-cli
> KEYS *buy-jobs*
> LLEN bull:buy-jobs:wait
> LLEN bull:buy-jobs:active
> LLEN bull:buy-jobs:failed
```

### Check Worker Health

Worker logs should show:
```
MetadataAdapterFactory initialized
PriceAdapterFactory initialized
```

If you see errors, check:
1. `.env` file has all required variables
2. PostgreSQL is running
3. Redis is running

### Check Adapter Selection

In worker logs, look for:
```
{"adapter":"Mock",...}  // Using mock
{"adapter":"OpenGraph",...}  // Using real adapter
```

---

## Expected Flow

```
1. User creates buy item with URL
   ↓
2. API saves to database
   ↓
3. API enqueues FETCH_METADATA job
   ↓
4. Worker picks up job
   ↓
5. Factory selects adapter (Mock or OpenGraph)
   ↓
6. Adapter fetches metadata
   ↓
7. Worker saves metadata to database
   ↓
8. Job completes
   ↓
9. User fetches item and sees metadata!
```

---

## Quick Test Checklist

- [ ] Register/Login successful
- [ ] Create buy item returns 201
- [ ] Worker logs show job processing
- [ ] Metadata appears in database
- [ ] List endpoint returns metadata
- [ ] Real adapter works (when enabled)
- [ ] Invalid URLs fail gracefully
- [ ] Retries work for network errors

---

## Next Steps

Once basic testing works:

1. **Enable real adapters** (`ENABLE_REAL_ADAPTERS=true`)
2. **Test with various e-commerce sites**
3. **Monitor extraction quality**
4. **Add Canopy API** for better data
5. **Implement rate limiting**
6. **Add price change notifications**

Happy testing! 🚀
