# Category Index Issue & Fix

## Date: October 15, 2025

## 🐛 Problem

The `categories` index in Meilisearch was created but had:

- ❌ `primaryKey: null` (should be `"id"`)
- ❌ 0 documents (empty)

This prevented the category index from working properly in the Meilisearch UI.

## 🔍 Root Cause

The categories index was likely created before the fix that ensures primary keys are set during index creation. When Meilisearch creates an index without any documents, it can't infer the primary key automatically.

## ✅ Solution

### Step 1: Delete the Broken Index

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:7700/indexes/categories
```

### Step 2: Trigger Re-sync

**Go to Admin UI:**

1. Navigate to: `http://localhost:9000/app/settings/meilisearch`
2. Click the **"Sync Data to Meilisearch"** button
3. Wait for the sync to complete (check server logs)

**What happens:**

1. `ensureIndexConfiguration('category')` creates index with `primaryKey: 'id'` ✅
2. Configures filterable attributes, sortable attributes, etc.
3. Syncs all categories from database
4. Categories appear in Meilisearch UI

### Step 3: Verify

**Check indexes:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:7700/indexes | jq '.results[] | {uid, primaryKey}'
```

**Should show:**

```json
{
  "uid": "categories",
  "primaryKey": "id"  ✅
}
{
  "uid": "products",
  "primaryKey": "id"
}
```

**Check category stats:**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:7700/indexes/categories/stats
```

**Should show:**

```json
{
  "numberOfDocuments": 10,  // or whatever count you have
  "isIndexing": false,
  ...
}
```

## 🎯 Expected Result

After the sync button click:

- ✅ Categories index exists with `primaryKey: "id"`
- ✅ All categories are indexed
- ✅ Meilisearch UI shows categories
- ✅ Category search/filtering works

## 📝 Server Logs to Watch For

```
⚙️ Configuring Meilisearch index settings...
📝 Creating index "categories"...
✅ Index "categories" created successfully
✅ Meilisearch category index configuration completed successfully

📂 Starting category sync...
📂 Fetching categories batch: offset=0, limit=50
🔍 Sample transformed category: { id: '...', name: '...', ... }
✓ Indexed 10 categories (Total: 10)
✅ Successfully indexed 10 categories to Meilisearch
```

## 🚨 If Categories Still Don't Show

### Option 1: Check Database

```sql
SELECT COUNT(*) FROM product_category;
```

If 0, you have no categories to sync.

### Option 2: Check Medusa Config

```typescript
// medusa-config.ts should have:
{
  resolve: './src/modules/meilisearch',
  options: {
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_API_KEY,
    productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX || 'products',
    categoryIndexName: process.env.MEILISEARCH_CATEGORY_INDEX || 'categories',  // ✅ Important
  },
}
```

### Option 3: Restart Medusa

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Option 4: Manual Category Index Creation

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"primaryKey": "id"}' \
  http://localhost:7700/indexes/categories
```

## 🔄 Preventing This in the Future

The fix is already in place in `service.ts`:

```typescript
// Lines 78-100 in meilisearch/service.ts
async ensureIndexConfiguration(type: MeilisearchIndexType = 'product') {
  const indexName = await this.getIndexName(type);

  // First, ensure the index exists
  try {
    await this.client.getIndex(indexName);
    console.log(`✅ Index "${indexName}" already exists`);
  } catch (error) {
    // Index doesn't exist, create it
    console.log(`📝 Creating index "${indexName}"...`);
    await this.client.createIndex(indexName, { primaryKey: 'id' });  // ✅ Sets primary key
    console.log(`✅ Index "${indexName}" created successfully`);
  }

  // Configure settings...
}
```

This ensures:

1. Index is checked if it exists
2. If not, created with explicit `primaryKey: 'id'`
3. Then configured with filterable/sortable attributes

## ✅ Resolution

After clicking the sync button, the categories index should work perfectly!
