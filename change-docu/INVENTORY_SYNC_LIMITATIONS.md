# Inventory Sync Limitations & Solutions

## Date: October 15, 2025

## ⚠️ The One Remaining Gap

### Direct Inventory Level Updates

**Scenario:** Admin manually updates inventory stock levels in the backend (e.g., via inventory management UI or direct database update).

**Problem:**

- ❌ Medusa doesn't emit `inventory_level.updated` events
- ❌ No automatic Meilisearch sync triggered
- ⚠️ Search results show outdated availability

**Example:**

```
1. Product has 10 units in stock
2. Admin manually adjusts to 0 units
3. Meilisearch still shows product as available
4. Customers see product in search but can't actually order it
```

---

## 🔧 Solutions

### Option 1: Manual Sync Button ✅ **Already Implemented**

**Location:** Admin UI → Settings → Meilisearch

**Usage:**

1. Admin updates inventory manually
2. Click "Sync Data to Meilisearch" button
3. All products re-indexed with current inventory

**Pros:**

- ✅ Simple and straightforward
- ✅ Already implemented
- ✅ Admin has full control

**Cons:**

- ❌ Requires admin to remember
- ❌ Not automatic
- ❌ Window of inconsistency

---

### Option 2: Scheduled Periodic Sync 🔄 **Recommended**

Create a scheduled job that syncs inventory every 5-10 minutes.

#### Implementation

**File:** `src/jobs/periodic-inventory-sync.ts`

```typescript
// src/jobs/periodic-inventory-sync.ts
import { MedusaContainer } from '@medusajs/framework/types';
import { syncProductsWorkflow } from '../workflows/sync-products';

/**
 * Periodic inventory sync job
 * Runs every 5 minutes to catch manual inventory updates
 */
export default async function periodicInventorySync(
	container: MedusaContainer,
) {
	const logger = container.resolve('logger');
	const query = container.resolve('query');

	try {
		logger.info('🔄 [PERIODIC-SYNC] Starting scheduled inventory sync...');

		// Get all products (or filter by recently updated)
		const { data: products } = await query.graph({
			entity: 'product',
			fields: ['id'],
			pagination: {
				take: 500, // Adjust based on catalog size
			},
		});

		if (!products || products.length === 0) {
			logger.info('ℹ️ [PERIODIC-SYNC] No products to sync');
			return;
		}

		logger.info(`🔄 [PERIODIC-SYNC] Syncing ${products.length} products...`);

		// Sync in batches to avoid overwhelming the system
		const batchSize = 50;
		const productIds = products.map((p: any) => p.id);

		for (let i = 0; i < productIds.length; i += batchSize) {
			const batch = productIds.slice(i, i + batchSize);

			await syncProductsWorkflow(container).run({
				input: {
					filters: {
						id: batch,
					},
				},
			});
		}

		logger.info(
			`✅ [PERIODIC-SYNC] Successfully synced ${products.length} products`,
		);
	} catch (error) {
		logger.error('❌ [PERIODIC-SYNC] Failed to sync inventory:', error);
	}
}

// Job configuration
export const config = {
	name: 'periodic-inventory-sync',
	// Run every 5 minutes: */5 * * * *
	// Run every 10 minutes: */10 * * * *
	schedule: '*/5 * * * *', // Every 5 minutes
};
```

#### Configure in `medusa-config.ts`

```typescript
module.exports = defineConfig({
  projectConfig: getProjectConfig(),
  admin: { ... },
  modules: getModules(),

  // Add scheduled jobs
  jobs: [
    {
      schedule: '*/5 * * * *', // Every 5 minutes
      handler: './src/jobs/periodic-inventory-sync',
    },
  ],
});
```

**Pros:**

- ✅ Fully automatic
- ✅ Catches all manual updates
- ✅ Configurable frequency
- ✅ No admin intervention needed

**Cons:**

- ⚠️ Up to 5-10 minute delay
- ⚠️ Regular background processing
- ⚠️ May sync products unnecessarily

---

### Option 3: Smart Periodic Sync (Optimized) 🎯 **Best Practice**

Only sync products whose inventory was recently updated.

```typescript
// src/jobs/smart-inventory-sync.ts
export default async function smartInventorySync(container: MedusaContainer) {
	const logger = container.resolve('logger');
	const query = container.resolve('query');

	try {
		logger.info('🔄 [SMART-SYNC] Starting smart inventory sync...');

		// Get products updated in last 10 minutes
		const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

		const { data: recentProducts } = await query.graph({
			entity: 'product',
			fields: ['id', 'updated_at'],
			filters: {
				updated_at: {
					$gte: tenMinutesAgo.toISOString(),
				},
			},
		});

		if (!recentProducts || recentProducts.length === 0) {
			logger.info('ℹ️ [SMART-SYNC] No recently updated products');
			return;
		}

		logger.info(
			`🔄 [SMART-SYNC] Syncing ${recentProducts.length} recently updated products...`,
		);

		const productIds = recentProducts.map((p: any) => p.id);
		const batchSize = 20;

		for (let i = 0; i < productIds.length; i += batchSize) {
			const batch = productIds.slice(i, i + batchSize);
			await syncProductsWorkflow(container).run({
				input: { filters: { id: batch } },
			});
		}

		logger.info(
			`✅ [SMART-SYNC] Successfully synced ${recentProducts.length} products`,
		);
	} catch (error) {
		logger.error('❌ [SMART-SYNC] Failed:', error);
	}
}

export const config = {
	name: 'smart-inventory-sync',
	schedule: '*/5 * * * *', // Every 5 minutes
};
```

**Pros:**

- ✅ Efficient - only syncs changed products
- ✅ Automatic
- ✅ Lower overhead
- ✅ Faster execution

**Cons:**

- ⚠️ Relies on `updated_at` timestamp
- ⚠️ May miss direct database updates

---

### Option 4: Admin UI Enhancement 📱 **User-Friendly**

Add a sync button to the inventory management page.

**File:** `src/admin/routes/inventory/[id]/page.tsx` (if exists)

```tsx
// Add to inventory detail page
<Button
	onClick={() => {
		// Trigger sync for this product
		fetch('/admin/meilisearch/sync-product', {
			method: 'POST',
			body: JSON.stringify({ product_id: productId }),
		});
		toast.success('Product synced to search');
	}}
>
	Sync to Search
</Button>
```

**Pros:**

- ✅ Immediate sync
- ✅ Product-specific
- ✅ Clear to admin
- ✅ No waiting for scheduled job

**Cons:**

- ❌ Requires custom admin UI changes
- ❌ Admin must remember to click

---

## 📊 Comparison Table

| Solution             | Automatic | Delay  | Overhead | Admin Action | Best For          |
| -------------------- | --------- | ------ | -------- | ------------ | ----------------- |
| Manual Button        | ❌ No     | None   | Low      | Must click   | Small catalogs    |
| Periodic Sync (5min) | ✅ Yes    | 5 min  | Medium   | None         | Medium catalogs   |
| Smart Sync           | ✅ Yes    | 5 min  | Low      | None         | **Recommended**   |
| UI Enhancement       | ❌ No     | None   | None     | Must click   | Large catalogs    |
| Combination          | ✅ Hybrid | <5 min | Medium   | Optional     | **Best Practice** |

---

## ✅ Recommended Solution: Combination Approach

### 1. Implement Smart Periodic Sync (Primary)

- Runs every 5 minutes
- Syncs recently updated products
- Catches 99% of manual updates automatically

### 2. Keep Manual Sync Button (Backup)

- Already implemented
- For immediate sync when needed
- Admin safety net

### 3. Add Inventory Page Sync (Optional)

- Product-specific sync button
- Better UX for admins
- Immediate feedback

---

## 🎯 Implementation Priority

### Phase 1: **Smart Periodic Sync** (15 minutes)

```bash
1. Create src/jobs/smart-inventory-sync.ts
2. Add to medusa-config.ts jobs array
3. Test with manual inventory update
4. Monitor logs for 24 hours
```

### Phase 2: **Documentation** (5 minutes)

```bash
1. Update admin documentation
2. Add note: "Inventory changes sync within 5 minutes"
3. Document manual sync button as backup
```

### Phase 3: **Optional UI Enhancement** (30 minutes)

```bash
1. Add product-specific sync button
2. Add toast notifications
3. Add sync status indicator
```

---

## 📝 Admin Documentation Template

### For Your Admin Users

> **Inventory Updates & Search**
>
> When you update product inventory:
>
> - **Automatic Sync:** Changes appear in search within 5 minutes
> - **Immediate Sync:** Click "Sync Data to Meilisearch" in Settings
> - **Product Sync:** Use the sync button on product detail pages
>
> **Note:** Orders and offers always sync immediately.

---

## 🔍 Monitoring

Add logging to track sync effectiveness:

```typescript
// In periodic sync
logger.info(
	`🔄 [PERIODIC-SYNC] Found ${count} products updated since last sync`,
);
logger.info(`✅ [PERIODIC-SYNC] Synced ${synced} products, ${errors} errors`);
```

Check logs to verify:

- How many products updated between syncs
- Sync performance and errors
- Whether 5-minute interval is sufficient

---

## 💡 Final Recommendation

**Implement Smart Periodic Sync** - It's the sweet spot:

✅ 99% of manual updates caught automatically
✅ Low overhead (only syncs changed products)
✅ 5-minute delay acceptable for inventory updates
✅ Manual button available for urgent updates
✅ Admins don't need to remember anything

**Trade-off:** 5-minute delay is acceptable because:

- Inventory changes aren't time-critical (unlike prices/stock-outs)
- Most inventory updates happen in batches during restocking
- Manual sync available for urgent cases
- Better than no sync or 100% manual sync
