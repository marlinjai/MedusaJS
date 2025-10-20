# Testing Meilisearch Event-Driven Sync

## Date: October 15, 2025

## 🎯 What to Look For in Logs

All Meilisearch sync operations now have **clear, prefixed logging** for easy tracking:

| Prefix                                | Subscriber               | What It Tracks           |
| ------------------------------------- | ------------------------ | ------------------------ |
| `[PRODUCT-SYNC]`                      | product-sync.ts          | Product create/update    |
| `[PRODUCT-DELETE]`                    | product-delete.ts        | Product deletion         |
| `[INVENTORY-SYNC]`                    | inventory-meilisearch.ts | Orders, offers, variants |
| `🔄 Syncing category`                 | category-sync.ts         | Category changes         |
| `🔄 Syncing products in collection`   | collection-sync.ts       | Collection changes       |
| `🔄 Syncing product...due to variant` | variant-sync.ts          | Variant changes          |

---

## 🧪 Test Scenarios

### Test 1: Update a Product ✅

**Action:**

1. Go to Admin UI → Products
2. Select any product
3. Change the title or description
4. Click "Save"

**Expected Logs:**

```
🔄 [PRODUCT-SYNC] Event product.updated: Syncing product prod_XXX
✅ [PRODUCT-SYNC] Product prod_XXX synced to Meilisearch
```

**Verify:**

- Logs appear within 1-2 seconds
- Product updated in Meilisearch

---

### Test 2: Change Offer Status ✅

**Action:**

1. Go to Offers (if you have the custom route)
2. Change offer status: draft → active
3. OR: accepted → completed

**Expected Logs:**

**For draft → active:**

```
🔄 [INVENTORY-SYNC] Event detected: offer.status_changed - syncing affected products
🔄 [INVENTORY-SYNC] Syncing N products to Meilisearch
✅ [INVENTORY-SYNC] Successfully synced N products
```

**For accepted → completed:**

```
[OFFER-FULFILLMENT] Reducing inventory levels for offer ANG-00001
[OFFER-FULFILLMENT] Reduced inventory for SKU-XXX: 10 units
[OFFER-FULFILLMENT] Releasing reservations for offer ANG-00001
🔄 [INVENTORY-SYNC] Event detected: offer.status_changed - syncing affected products
🔄 [INVENTORY-SYNC] Syncing N products to Meilisearch
✅ [INVENTORY-SYNC] Successfully synced N products
```

**Verify:**

- Inventory sync triggered by offer status change
- Products reflect updated availability

---

### Test 3: Update a Variant ✅

**Action:**

1. Go to product → Variants tab
2. Edit a variant (change price, SKU, or inventory settings)
3. Click "Save"

**Expected Logs:**

```
🔄 Syncing product prod_XXX due to variant variant_XXX change
✅ Product prod_XXX synced to Meilisearch

AND

🔄 [INVENTORY-SYNC] Event detected: product_variant.updated - syncing affected products
🔄 [INVENTORY-SYNC] Syncing 1 products to Meilisearch
✅ [INVENTORY-SYNC] Successfully synced 1 products
```

**Note:** Variant updates trigger **TWO** subscribers:

1. `variant-sync.ts` - Updates variant-related data
2. `inventory-meilisearch.ts` - Checks inventory impact

**Verify:**

- Dual logging (both subscribers)
- Prices/SKUs updated in search

---

### Test 4: Place an Order ✅

**Action:**

1. Create/place an order via admin or storefront
2. Complete the order

**Expected Logs:**

```
🔄 [INVENTORY-SYNC] Event detected: order.placed - syncing affected products
🔄 [INVENTORY-SYNC] Syncing N products to Meilisearch
✅ [INVENTORY-SYNC] Successfully synced N products
```

**Verify:**

- Products in order get synced
- Availability updated if inventory reduced

---

### Test 5: Update a Category ✅

**Action:**

1. Go to Categories
2. Rename a category or change its description
3. Click "Save"

**Expected Logs:**

```
🔄 Syncing category pcat_XXX to Meilisearch
✅ Category pcat_XXX synced to Meilisearch
🔄 Syncing 25 products affected by category change
✅ Synced 25 products to Meilisearch
```

**Verify:**

- Category synced first
- All products in category re-synced
- Category names updated in product search

---

### Test 6: Manual Inventory Update (Periodic Sync) ⏱️

**Action:**

1. Go to product → Inventory tab
2. Change inventory quantity (e.g., 10 → 5)
3. **Don't click any sync button**
4. Wait 5 minutes

**Expected Logs (after 5 min):**

```
🔄 [SMART-SYNC] Starting smart inventory sync...
🔄 [SMART-SYNC] Found 1 products updated in last 10 minutes
✓ [SMART-SYNC] Synced batch 1 (1 products)
✅ [SMART-SYNC] Completed: 1/1 products synced to Meilisearch
```

**Verify:**

- Logs appear automatically every 5 minutes
- Product availability updated

---

## 📋 Complete Log Pattern Reference

### Successful Operations

```bash
# Product Update
🔄 [PRODUCT-SYNC] Event product.updated: Syncing product prod_XXX
✅ [PRODUCT-SYNC] Product prod_XXX synced to Meilisearch

# Variant Update
🔄 Syncing product prod_XXX due to variant variant_XXX change
✅ Product prod_XXX synced to Meilisearch
🔄 [INVENTORY-SYNC] Event detected: product_variant.updated
✅ [INVENTORY-SYNC] Successfully synced 1 products

# Order Placed
🔄 [INVENTORY-SYNC] Event detected: order.placed
🔄 [INVENTORY-SYNC] Syncing 3 products to Meilisearch
✅ [INVENTORY-SYNC] Successfully synced 3 products

# Offer Status Changed
🔄 [INVENTORY-SYNC] Event detected: offer.status_changed
🔄 [INVENTORY-SYNC] Syncing 2 products to Meilisearch
✅ [INVENTORY-SYNC] Successfully synced 2 products

# Category Update
🔄 Syncing category pcat_XXX to Meilisearch
✅ Category pcat_XXX synced to Meilisearch
🔄 Syncing 15 products affected by category change
✅ Synced 15 products to Meilisearch

# Periodic Sync (every 5 min)
🔄 [SMART-SYNC] Starting smart inventory sync...
🔄 [SMART-SYNC] Found 5 products updated in last 10 minutes
✓ [SMART-SYNC] Synced batch 1 (5 products)
✅ [SMART-SYNC] Completed: 5/5 products synced
```

### Error Patterns

```bash
# Product Sync Failed
❌ [PRODUCT-SYNC] Failed to sync product prod_XXX: [error message]

# Inventory Sync Failed
❌ [INVENTORY-SYNC] Failed to sync products: [error message]

# Category Sync Failed
❌ Failed to sync category: [error message]

# Periodic Sync Failed
❌ [SMART-SYNC] Failed: [error message]
```

---

## 🔍 Quick Diagnostic Commands

### Check if subscribers are loaded

```bash
# In terminal logs, search for:
grep "Subscriber.*loaded"

# Should show:
# info: Subscriber product-sync.ts loaded
# info: Subscriber product-delete.ts loaded
# info: Subscriber variant-sync.ts loaded
# info: Subscriber inventory-meilisearch.ts loaded
# info: Subscriber category-sync.ts loaded
# info: Subscriber collection-sync.ts loaded
# info: Subscriber meilisearch-sync.ts loaded
```

### Check if scheduled job is running

```bash
# Look for periodic sync logs every 5 minutes:
grep "SMART-SYNC"

# Should show every 5 minutes:
# 🔄 [SMART-SYNC] Starting smart inventory sync...
```

### Filter only Meilisearch events

```bash
# In your terminal (if using tail or log file):
tail -f logs.txt | grep -E "(PRODUCT-SYNC|INVENTORY-SYNC|SMART-SYNC|Category.*synced)"
```

---

## ✅ Logging Summary

All subscribers now have **consistent, searchable logging**:

| Event Type            | Start Log                            | Success Log                               | Error Log                    |
| --------------------- | ------------------------------------ | ----------------------------------------- | ---------------------------- |
| Product update        | `🔄 [PRODUCT-SYNC] Event`            | `✅ [PRODUCT-SYNC] Product synced`        | `❌ [PRODUCT-SYNC] Failed`   |
| Product delete        | `🗑️ [PRODUCT-DELETE] Deleting`       | `✅ [PRODUCT-DELETE] Removed`             | `❌ [PRODUCT-DELETE] Failed` |
| Variant update        | `🔄 Syncing product...variant`       | `✅ Product...synced`                     | `❌ Failed to sync`          |
| Order/Offer/Inventory | `🔄 [INVENTORY-SYNC] Event detected` | `✅ [INVENTORY-SYNC] Successfully synced` | `❌ [INVENTORY-SYNC] Failed` |
| Category update       | `🔄 Syncing category`                | `✅ Category...synced`                    | `❌ Failed to sync category` |
| Collection update     | `🔄 Syncing products in collection`  | `✅ Synced...products`                    | `❌ Failed to sync`          |
| Periodic sync         | `🔄 [SMART-SYNC] Starting`           | `✅ [SMART-SYNC] Completed`               | `❌ [SMART-SYNC] Failed`     |

---

## 🚀 Ready to Test!

**Now when you:**

- ✅ Update a product → Logs show `[PRODUCT-SYNC]`
- ✅ Change offer status → Logs show `[INVENTORY-SYNC]` with offer event
- ✅ Update variant → Logs show both variant-sync AND inventory-sync
- ✅ Place order → Logs show `[INVENTORY-SYNC]` with order event
- ✅ Update category → Logs show category sync + affected products
- ✅ Update inventory manually → Logs show `[SMART-SYNC]` within 5 min

**All operations are now fully traceable!** 🎯

Try updating a product or changing an offer status and watch the logs!
