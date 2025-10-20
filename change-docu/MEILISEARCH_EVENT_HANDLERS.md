# Meilisearch Event Handlers

## Date: October 15, 2025

## Overview

Comprehensive event-driven synchronization system that keeps Meilisearch indexes updated in real-time when data changes occur in Medusa.

## Event Subscribers

### 1. Product Events

**File:** `src/subscribers/product-sync.ts`

**Triggers:**

- `product.created`
- `product.updated`

**Action:** Syncs the specific product to Meilisearch with all related data (categories, variants, pricing, inventory).

**Use Case:** When a product is created or its base information is updated (title, description, handle, status, etc.).

---

### 2. Product Deletion

**File:** `src/subscribers/product-delete.ts`

**Triggers:**

- `product.deleted`

**Action:** Removes the product from Meilisearch index.

**Use Case:** When a product is permanently deleted from the system.

---

### 3. Variant Events

**File:** `src/subscribers/variant-sync.ts`

**Triggers:**

- `product_variant.created`
- `product_variant.updated`
- `product_variant.deleted`

**Action:** Syncs the parent product to Meilisearch to update variant-related data (pricing, SKUs, inventory availability).

**Use Case:**

- New variant added to a product
- Variant pricing changes
- Variant SKU or options change
- Variant deleted

**Why Important:** Variants affect:

- Product availability (`is_available`)
- Price ranges (`min_price`, `max_price`)
- SKU searchability
- Variant count

---

### 4. Inventory-Affecting Events

**File:** `src/subscribers/inventory-meilisearch.ts`

**Important:** Medusa doesn't emit `inventory_level.*` events. Instead, we listen to business events that affect inventory.

**Triggers:**

- `order.placed` - Order reduces inventory
- `order.updated` - Order changes may affect inventory
- `order.canceled` - Order cancellation releases inventory
- `offer.status_changed` - Offer reservations affect availability
- `product_variant.created/updated/deleted` - Variant changes affect inventory

**Action:**

1. Detects which event type occurred
2. Extracts affected product IDs from:
   - Order items (for order events)
   - Offer items (for offer events)
   - Variant data (for variant events)
3. Syncs all affected products in batches

**Use Case:**

- Customer places order (inventory reduced)
- Offer becomes active (inventory reserved)
- Offer cancelled (inventory released)
- Order cancelled (inventory restored)
- Variant inventory settings changed

**Why Important:** These events indirectly affect:

- `is_available` flag (via reservations and actual inventory)
- `total_inventory` count
- Search result filtering by availability

**Note:** This is a **workaround** for Medusa's lack of inventory events. The offer module uses official Medusa workflows (`createReservationsWorkflow`, etc.) but Medusa doesn't emit events for these operations.

---

### 5. Category Events

**File:** `src/subscribers/category-sync.ts`

**Triggers:**

- `product_category.created`
- `product_category.updated`
- `product_category.deleted`

**Action:**

1. Syncs the category to the `categories` index
2. Finds all products in that category
3. Syncs affected products in batches (10 at a time)

**Use Case:**

- Category renamed or description changed
- Category hierarchy changes
- Category activated/deactivated
- Category deleted

**Why Important:** Category changes affect:

- `category_names` in product index
- `category_paths` (hierarchical navigation)
- Category faceting and filtering
- The `categories` index itself

---

### 6. Collection Events

**File:** `src/subscribers/collection-sync.ts`

**Triggers:**

- `product_collection.created`
- `product_collection.updated`
- `product_collection.deleted`

**Action:**

1. Finds all products in the collection
2. Syncs affected products in batches (10 at a time)

**Use Case:**

- Collection title or metadata changes
- Products need updated collection information

**Why Important:** Collection changes affect:

- `collection_title` (now a filterable attribute)
- `collection_id`
- `collection_handle`
- Collection-based filtering and faceting

---

### 7. Manual Sync Trigger

**File:** `src/subscribers/meilisearch-sync.ts`

**Triggers:**

- `meilisearch.sync` (custom event)

**Action:**

1. Configures both `products` and `categories` indexes
2. Syncs all categories in batches
3. Syncs all products in batches

**Use Case:**

- Initial setup
- Full re-index after configuration changes
- Recovery from sync failures
- Triggered from admin UI

---

## Data Flow

### Example: Inventory Update

```
1. User updates inventory quantity
   ↓
2. Medusa emits "inventory_level.updated" event
   ↓
3. inventory-sync.ts subscriber receives event
   ↓
4. Finds variant_id from inventory_item_id
   ↓
5. Finds product_id from variant_id
   ↓
6. Calls syncProductsWorkflow with product_id filter
   ↓
7. Workflow queries product with full data
   ↓
8. Calculates real-time inventory availability
   ↓
9. Updates Meilisearch with new availability status
   ↓
10. Search results immediately reflect new availability
```

### Example: Category Update

```
1. Admin updates category name
   ↓
2. Medusa emits "product_category.updated" event
   ↓
3. category-sync.ts subscriber receives event
   ↓
4. Syncs category to categories index
   ↓
5. Queries all products in this category
   ↓
6. Syncs products in batches of 10
   ↓
7. Each product gets updated category_names and category_paths
   ↓
8. Search and facets reflect new category name
```

## Performance Considerations

### Batching

- Category/collection changes sync products in batches of 10
- Prevents overwhelming the system with too many concurrent syncs
- Balances speed with resource usage

### Selective Updates

- Only affected products are synced
- Uses filters to target specific products
- Avoids unnecessary full re-indexes

### Real-time Inventory

- Inventory calculations happen during sync
- Uses `getVariantAvailability` for accurate stock data
- Respects sales channel and location settings

## Configuration

All subscribers are automatically loaded by Medusa. No configuration needed.

### Verify Subscribers are Loaded

Check server logs on startup for:

```
info: Subscriber meilisearch-sync.ts loaded
info: Subscriber product-sync.ts loaded
info: Subscriber product-delete.ts loaded
info: Subscriber variant-sync.ts loaded
info: Subscriber inventory-sync.ts loaded
info: Subscriber category-sync.ts loaded
info: Subscriber collection-sync.ts loaded
```

## Testing Event Handlers

### Test Product Sync

```bash
# Update a product via API or Admin UI
# Check logs for: "🔄 Syncing product {id} due to..."
# Verify in Meilisearch that product data updated
```

### Test Variant Sync

```bash
# Add or update a variant
# Check logs for: "🔄 Syncing product {id} due to variant {variant_id} change"
# Verify price ranges and SKUs updated in search
```

### Test Inventory Sync

```bash
# Change inventory quantity
# Check logs for: "🔄 Syncing product {id} due to inventory change"
# Verify is_available flag updated
# Verify product appears/disappears in availability filter
```

### Test Category Sync

```bash
# Update a category name
# Check logs for: "🔄 Syncing category {id}"
# Check logs for: "🔄 Syncing X products affected by category change"
# Verify category name updated in product search results
# Verify category facets reflect new name
```

## Troubleshooting

### Products Not Syncing After Update

**Check:**

1. Are subscribers loaded? (Check startup logs)
2. Are events being emitted? (Check event logs)
3. Any errors in subscriber logs?
4. Is Meilisearch running and accessible?

### Inventory Changes Not Reflected

**Check:**

1. Is `inventory-sync.ts` subscriber active?
2. Check logs for "Could not find variant for inventory update"
3. Verify inventory_item_id → variant → product chain
4. Check if sales channel is configured correctly

### Category Updates Not Syncing Products

**Check:**

1. Is `category-sync.ts` subscriber active?
2. Check if products are actually linked to the category
3. Check batch processing logs
4. May need to increase batch size for large catalogs

## Best Practices

1. **Monitor Logs**: Watch for sync errors in production
2. **Batch Size**: Adjust batch sizes based on catalog size
3. **Error Handling**: All subscribers have try-catch blocks
4. **Performance**: Consider debouncing rapid changes
5. **Full Sync**: Run manual sync after major data changes

## Event Coverage Matrix

| Data Type  | Create | Update | Delete | Notes                                               |
| ---------- | ------ | ------ | ------ | --------------------------------------------------- |
| Product    | ✅     | ✅     | ✅     | Direct sync via product events                      |
| Variant    | ✅     | ✅     | ✅     | Syncs parent product + inventory check              |
| Inventory  | ✅\*   | ✅\*   | ✅\*   | Via order/offer events (no direct inventory events) |
| Category   | ✅     | ✅     | ✅     | Syncs category index + affected products            |
| Collection | ✅     | ✅     | ✅     | Syncs affected products                             |
| Order      | ✅     | ✅     | ✅     | Syncs products (affects inventory)                  |
| Offer      | -      | ✅     | -      | Via status changes (affects reservations)           |
| Price      | -      | -      | -      | Covered by variant.updated                          |
| Tags       | -      | -      | -      | Covered by product.updated                          |

**\* Note:** Medusa doesn't emit `inventory_level` events. We track inventory changes through `order` and `offer` events that affect inventory.

## Future Enhancements

Potential additions:

- Debouncing for rapid successive changes
- Priority queue for high-value products
- Partial field updates (not full re-index)
- Real-time sync status dashboard
- Sync retry logic with exponential backoff
- Webhook support for external triggers
