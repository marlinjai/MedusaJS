# Stock-Aware Shipping Display Implementation

## Date: November 1, 2025

## Overview

Implemented comprehensive stock and shipping information display system for product detail pages with configurable thresholds, quantity selection, and shipping class-based delivery estimates.

---

## Features Implemented

### 1. Admin Inventory Settings

**Location:** Admin → Settings → Inventory Display Settings

**Configurable Options:**
- **Low Stock Threshold** (1-20 units, default: 5)
  - Products at or below this level show "Nur noch wenige verfügbar" warning
- **Show Exact Stock** (toggle)
  - Display precise stock quantities vs. generic availability
- **Hide Stock on Backorder** (toggle)
  - Don't reveal stock quantity for backorder items (recommended for UX)

**Implementation:**
- API Route: `busbasisberlin/src/api/admin/settings/inventory/route.ts`
- Admin Widget: `busbasisberlin/src/admin/widgets/inventory-settings.tsx`
- Settings Storage: `data/inventory-settings.json`

### 2. Stock Display Logic

**Component:** `busbasisberlin-storefront/src/modules/products/components/stock-info/index.tsx`

**Display Rules:**

| Scenario | Display |
|----------|---------|
| Stock > threshold | "X Stück verfügbar" (green) |
| Stock ≤ threshold | "X Stück verfügbar" + "⚠ Nur noch wenige verfügbar" (orange) |
| Backorder (stock = 0) | "● Verfügbar" + "Lieferzeit verlängert" (blue) |
| Out of stock | "✕ Nicht verfügbar" (red) |
| Inventory not managed | "● Verfügbar" (green) |

**Per-Variant Display:**
- Stock info updates automatically when customer selects different variant
- Each variant shows its own stock level
- Backorder status evaluated per variant

### 3. Shipping Time Display

**Component:** `busbasisberlin-storefront/src/modules/products/components/shipping-info/index.tsx`

**Shipping Classes:**

| Profile Type | Delivery Time | Display |
|--------------|---------------|---------|
| Standard | 2-3 Werktage | Green truck icon |
| Längere Lieferzeit | 7-10 Werktage | Orange truck icon + note |
| Sperrgut/Oversized | Auf Anfrage | Handled by QuoteRequest component |
| Backorder (stock=0) | 7-10 Werktage | Orange truck icon + note |

**Logic:**
- Checks shipping profile name for "Längere Lieferzeit"
- Automatically shows extended delivery for backorder items
- Hides shipping info for oversized items (they use quote system)

### 4. Quantity Selector

**Component:** `busbasisberlin-storefront/src/modules/products/components/quantity-selector/index.tsx`

**Features:**
- Dropdown selector for quantities 1-10
- Stock-aware limits:
  - If inventory managed + no backorder: Max = available stock (capped at 10)
  - If backorder allowed: Max = 10 (can add multiple times for higher quantities)
  - If inventory not managed: Max = 10
- Helper text shows max available for limited stock items
- Passes selected quantity to cart

### 5. Meilisearch Integration

**Modified:** `busbasisberlin/src/workflows/steps/sync-products.ts`

**New Indexed Fields:**
- `shipping_profile_id` - Shipping profile ID
- `shipping_profile_name` - Profile name for display
- `shipping_profile_type` - Profile type classification
- `has_extended_delivery` - Boolean flag for "Längere Lieferzeit"
- `estimated_delivery_days` - Calculated delivery estimate

**Filterable Attributes Added:**
- `shipping_profile_name` - Filter by shipping method
- `has_extended_delivery` - Filter extended delivery items
- `estimated_delivery_days` - Sort/filter by delivery time

**Benefits:**
- Enable search filtering by delivery time
- Allow faceted navigation by shipping method
- Support sorting by estimated delivery

---

## Technical Architecture

### Backend Components

#### 1. Settings API (`busbasisberlin/src/api/admin/settings/inventory/route.ts`)
```
GET  /admin/settings/inventory  → Retrieve settings
POST /admin/settings/inventory  → Save settings
```

Validates:
- Threshold range (1-20)
- Required fields present
- Boolean toggles valid

#### 2. Helper Utilities (`busbasisberlin/src/utils/inventory-helper.ts`)

**Functions:**
- `getInventorySettings()` - Read settings from file
- `getInventorySettingsSync()` - Sync version for non-async contexts
- `getStockDisplayInfo(variant, settings)` - Calculate stock display
- `getShippingTimeInfo(shippingProfile, isBackorder)` - Calculate shipping info
- `calculateDeliveryDays(shippingProfile)` - Get delivery estimate

**Stock Display Logic:**
```typescript
if (!manageInventory) return 'Verfügbar'
else if (stock > threshold) return 'X Stück verfügbar'
else if (stock <= threshold && stock > 0) return 'X Stück + Nur noch wenige'
else if (allowBackorder && stock === 0) return 'Verfügbar' (hide quantity)
else return 'Nicht verfügbar'
```

#### 3. Workflow Integration

**Modified:** `busbasisberlin/src/workflows/sync-products.ts`
- Added shipping_profile fields to product query expansion
- Fields: `shipping_profile.id`, `shipping_profile.name`, `shipping_profile.type`

**Modified:** `busbasisberlin/src/workflows/steps/sync-products.ts`
- Import `calculateDeliveryDays` helper
- Add shipping fields to transformed product document
- Calculate `has_extended_delivery` flag
- Compute `estimated_delivery_days`

**Modified:** `busbasisberlin/src/modules/meilisearch/service.ts`
- Added 3 new filterable attributes to product index configuration

### Storefront Components

#### 1. StockInfo Component
**Path:** `busbasisberlin-storefront/src/modules/products/components/stock-info/index.tsx`

**Props:**
- `variant` - Current selected variant
- `lowStockThreshold` - Threshold from settings (default: 5)

**Displays:**
- Color-coded availability badges (green/orange/blue/red)
- Exact quantity or generic message based on settings
- Low stock warnings
- Backorder status indicators

#### 2. ShippingInfo Component
**Path:** `busbasisberlin-storefront/src/modules/products/components/shipping-info/index.tsx`

**Props:**
- `shippingProfile` - Product shipping profile
- `isBackorder` - Whether item is on backorder

**Features:**
- Truck icon with color coding
- Delivery time estimate
- Extended delivery explanation
- Auto-detects "Längere Lieferzeit" profile
- Hides for oversized items (handled separately)

#### 3. QuantitySelector Component
**Path:** `busbasisberlin-storefront/src/modules/products/components/quantity-selector/index.tsx`

**Props:**
- `quantity` - Current selected quantity
- `setQuantity` - State setter
- `variant` - Current variant for stock limits
- `disabled` - Disable state

**Logic:**
- Max 10 in dropdown for UX
- Respects stock limits if inventory managed
- Shows helper text for limited stock
- Allows 1-99 for backorder items (dropdown capped at 10)

#### 4. Integration Point
**Modified:** `busbasisberlin-storefront/src/modules/products/components/product-actions/index.tsx`

**Changes:**
- Added quantity state management
- Imported new components
- Replaced old stock display with StockInfo component
- Added ShippingInfo component
- Added QuantitySelector component
- Updated handleAddToCart to use selected quantity
- Accepts lowStockThreshold prop

**Modified:** `busbasisberlin-storefront/src/modules/products/templates/product-actions-wrapper/index.tsx`

**Changes:**
- Fetches inventory settings via `getInventorySettings()`
- Passes lowStockThreshold to ProductActions
- Shipping profile already expanded in query

---

## Data Flow

### Stock Display Flow
```
1. User views product page
2. ProductActionsWrapper fetches inventory settings from backend
3. Settings passed to ProductActions component
4. User selects variant
5. StockInfo calculates display based on:
   - variant.inventory_quantity
   - variant.allow_backorder
   - variant.manage_inventory
   - settings.low_stock_threshold
6. Appropriate message and styling displayed
```

### Shipping Info Flow
```
1. Product query expands shipping_profile relation
2. ShippingInfo component receives profile data
3. Checks profile name for "Längere Lieferzeit"
4. Checks if backorder (stock = 0, allow_backorder = true)
5. Displays appropriate delivery time:
   - Standard: 2-3 Werktage
   - Extended: 7-10 Werktage
   - Oversized: Hidden (uses quote request)
```

### Quantity Selection Flow
```
1. User selects variant
2. QuantitySelector calculates max quantity:
   - If managed + no backorder: min(stock, 10)
   - If backorder: 10
   - If not managed: 10
3. User selects quantity from dropdown
4. Selected quantity passed to addToCart
```

---

## Configuration

### Default Settings (No File)
```json
{
  "low_stock_threshold": 5,
  "show_exact_stock": true,
  "hide_stock_on_backorder": true
}
```

### Example Custom Settings
```json
{
  "settings": {
    "low_stock_threshold": 3,
    "show_exact_stock": true,
    "hide_stock_on_backorder": true
  },
  "updatedAt": "2025-11-01T20:00:00.000Z",
  "version": "1.0"
}
```

Stored in: `busbasisberlin/data/inventory-settings.json`

---

## Meilisearch Sync

### Auto-Sync Triggers

Shipping profile data syncs automatically via existing subscribers:
- `product.created`
- `product.updated`
- `product_variant.*`
- Manual sync via admin UI

### New Fields Available for Search/Filter

```javascript
{
  // ... existing fields ...

  // NEW: Shipping profile fields
  shipping_profile_id: "sp_123",
  shipping_profile_name: "Längere Lieferzeit",
  shipping_profile_type: "default",
  has_extended_delivery: true,
  estimated_delivery_days: "7-10"
}
```

### Filterable Attributes
- `shipping_profile_name` - Facet by shipping method
- `has_extended_delivery` - Filter extended delivery products
- `estimated_delivery_days` - Sort/filter by delivery time

---

## Usage Examples

### Admin: Configure Settings

1. Navigate to Admin → Settings
2. Find "Inventory Display Settings" widget
3. Set low stock threshold (e.g., 3 units)
4. Toggle display options
5. Click "Save Settings"

### Customer: View Product

**Example 1: In-Stock Product**
```
Stock: 15 Stück verfügbar ✓
Shipping: Lieferzeit: 2-3 Werktage 🚚
Quantity: [Dropdown: 1-10]
[In den Warenkorb Button]
```

**Example 2: Low Stock Product**
```
Stock: 2 Stück verfügbar ⚠
       Nur noch wenige verfügbar
Shipping: Lieferzeit: 2-3 Werktage 🚚
Quantity: [Dropdown: 1-2]
[In den Warenkorb Button]
```

**Example 3: Backorder Product**
```
Stock: ● Verfügbar
       Lieferzeit verlängert
Shipping: Lieferzeit: 7-10 Werktage 🚚
Quantity: [Dropdown: 1-10]
[In den Warenkorb Button]
```

**Example 4: Extended Shipping Profile**
```
Stock: 8 Stück verfügbar ✓
Shipping: Lieferzeit: 7-10 Werktage 🚚
          Längere Lieferzeit aufgrund von Sonderbestellung
Quantity: [Dropdown: 1-10]
[In den Warenkorb Button]
```

---

## Files Created

### Backend (6 files)
1. `busbasisberlin/src/api/admin/settings/inventory/route.ts` - Settings API
2. `busbasisberlin/src/admin/widgets/inventory-settings.tsx` - Admin UI widget
3. `busbasisberlin/src/utils/inventory-helper.ts` - Helper functions

### Storefront (4 files)
4. `busbasisberlin-storefront/src/modules/products/components/stock-info/index.tsx`
5. `busbasisberlin-storefront/src/modules/products/components/shipping-info/index.tsx`
6. `busbasisberlin-storefront/src/modules/products/components/quantity-selector/index.tsx`
7. `busbasisberlin-storefront/src/lib/data/inventory-settings.ts`

### Configuration (1 file)
8. `data/inventory-settings.json` - Created on first save

---

## Files Modified

### Backend (3 files)
1. `busbasisberlin/src/workflows/sync-products.ts` - Added shipping_profile fields
2. `busbasisberlin/src/workflows/steps/sync-products.ts` - Added shipping data to index
3. `busbasisberlin/src/modules/meilisearch/service.ts` - Added filterable attributes

### Storefront (2 files)
4. `busbasisberlin-storefront/src/modules/products/components/product-actions/index.tsx` - Integrated components
5. `busbasisberlin-storefront/src/modules/products/templates/product-actions-wrapper/index.tsx` - Fetches settings

---

## Testing Checklist

### Backend Tests
- [ ] GET /admin/settings/inventory returns defaults
- [ ] POST /admin/settings/inventory saves successfully
- [ ] Settings validation rejects invalid thresholds
- [ ] Inventory helper functions return correct stock status
- [ ] Meilisearch sync includes shipping profile data
- [ ] Filterable attributes work in search

### Storefront Tests
- [ ] Product with stock > 5 shows exact quantity
- [ ] Product with stock ≤ 5 shows low stock warning
- [ ] Backorder product (stock=0) shows "Verfügbar" without quantity
- [ ] Standard shipping shows "2-3 Werktage"
- [ ] "Längere Lieferzeit" profile shows "7-10 Werktage"
- [ ] Quantity selector limits to available stock
- [ ] Quantity selector allows 1-10 for backorder items
- [ ] Add to cart uses selected quantity
- [ ] Variant selection updates stock display
- [ ] Variant selection updates quantity limits

---

## Migration Notes

### No Database Changes Required
- Uses existing `inventory_quantity` field on variants
- Uses existing `allow_backorder` flag
- Uses existing `manage_inventory` flag
- Uses existing shipping_profile relation

### Automatic Sync
- Existing products will sync shipping data on next:
  - Product update
  - Manual Meilisearch sync
  - Variant change
  - Inventory update event

### Initial Setup
1. Deploy backend changes
2. Admin configures inventory settings (optional, uses defaults)
3. Trigger Meilisearch full re-sync to populate shipping profile data
4. Deploy storefront changes
5. Test on product pages

---

## Future Enhancements

### Potential Improvements
1. **Dynamic Delivery Estimates**
   - Calculate based on supplier lead times
   - Factor in stock location distance
   - Real-time carrier API integration

2. **Advanced Stock Display**
   - Show incoming stock dates
   - Display next restock ETA
   - Warehouse location-based availability

3. **Quantity Input Enhancement**
   - Text input for quantities > 10
   - Bulk order requests for large quantities
   - Tiered pricing display based on quantity

4. **Shipping Profile Extensions**
   - Custom delivery time per profile
   - Multiple shipping options
   - Express shipping availability

---

## API Documentation

### GET /admin/settings/inventory

**Response:**
```json
{
  "settings": {
    "low_stock_threshold": 5,
    "show_exact_stock": true,
    "hide_stock_on_backorder": true
  },
  "lastModified": "2025-11-01T20:00:00.000Z"
}
```

### POST /admin/settings/inventory

**Request:**
```json
{
  "settings": {
    "low_stock_threshold": 3,
    "show_exact_stock": true,
    "hide_stock_on_backorder": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inventory settings saved successfully",
  "settings": { ... }
}
```

**Validation:**
- `low_stock_threshold`: Must be 1-20
- `show_exact_stock`: Must be boolean
- `hide_stock_on_backorder`: Must be boolean

---

## Component Props Reference

### StockInfo
```typescript
{
  variant?: HttpTypes.StoreProductVariant
  lowStockThreshold?: number  // Default: 5
}
```

### ShippingInfo
```typescript
{
  shippingProfile?: any
  isBackorder?: boolean  // Default: false
}
```

### QuantitySelector
```typescript
{
  quantity: number
  setQuantity: (qty: number) => void
  variant?: HttpTypes.StoreProductVariant
  disabled?: boolean  // Default: false
}
```

---

## Notes

- Settings cached on storefront for 5 minutes (via Next.js revalidate)
- Shipping profile data already expanded in product queries (no additional query needed)
- Components are client-side for interactivity
- Stock info updates immediately on variant change
- Graceful fallback to defaults if settings unavailable
- No impact on existing cart/checkout flow
- Compatible with existing offer and quote request systems


