# Assign Uncategorized Products - Execution Guide

## Overview

This workflow assigns all 226 uncategorized products to the default "Ohne Kategorie" category, making them visible in the frontend category tree and backend management.

## Steps to Execute

### 1. Create the Default Category

**Option A: Using Admin API Endpoint (Authenticated)**

If you have admin authentication, you can use the API endpoint:

```bash
curl -X POST "https://basiscamp-berlin.de/admin/categories/create-default" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Option B: Use Medusa Admin Panel (Recommended - Easier)**

1. Log into Medusa admin at `https://basiscamp-berlin.de/app`
2. Navigate to **Products** → **Categories**
3. Click **"+ Create Category"**
4. Fill in:
   - **Name**: `Ohne Kategorie`
   - **Handle**: `ohne-kategorie`
   - **Description**: `Produkte ohne zugewiesene Kategorie`
   - **Status**: Active
5. Click **Save**

**Expected Result:**

- Category created with handle `ohne-kategorie`
- Category will be used by the workflow to assign uncategorized products

### 2. Check Current Status (Optional)

Before running the workflow, check how many uncategorized products exist:

```bash
curl "https://basiscamp-berlin.de/admin/products/assign-uncategorized"
```

**Note:** This endpoint also requires authentication. You can skip this step and proceed directly to executing the workflow.

### 3. Run Dry Run (Optional - Recommended)

Test the workflow without making changes:

```bash
curl -X POST "https://basiscamp-berlin.de/admin/products/assign-uncategorized" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"dryRun": true, "syncToMeilisearch": false}'
```

Check the backend logs to see what would be updated.

### 4. Execute the Workflow

Assign all uncategorized products to the default category:

```bash
curl -X POST "https://basiscamp-berlin.de/admin/products/assign-uncategorized" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"dryRun": false, "syncToMeilisearch": true}'
```

**Response:**

```json
{
	"message": "Product assignment started in background",
	"status": "processing"
}
```

The workflow will:

1. Find all 226 uncategorized products
2. Assign them to "Ohne Kategorie" in batches of 50
3. Sync all products to Meilisearch (~2-3 minutes)

### 5. Monitor Progress

Check the backend logs to monitor progress:

- Look for `[ASSIGN-UNCATEGORIZED]` log messages
- Wait for "✅ Process completed successfully"
- Full process takes approximately 3-5 minutes

### 6. Verify Results

#### Frontend:

- Visit: https://basiscampberlin.de/de/store
- Check category tree on left side
- "Ohne Kategorie" should appear with 226 products
- Click it to see all uncategorized products

#### Backend:

- Navigate to Products by Category
- "Ohne Kategorie" category should now exist with 226 products

## Expected Timeline

- **Deployment**: ~5 minutes (auto)
- **Category Creation**: ~5 seconds
- **Workflow Execution**: ~3-5 minutes
- **Total Time**: ~10 minutes

## Rollback

If needed, you can manually remove products from the category using the admin panel, or reassign them to correct categories.

## Next Steps

After verification:

1. Products in "Ohne Kategorie" can be manually reassigned to proper categories
2. New products without categories will still need manual categorization
3. Consider running this workflow periodically to catch new uncategorized products
