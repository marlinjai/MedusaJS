# Offer Item Availability Check Fix

## Problem

When a product with 1 unit in stock was added to an active offer:

1. A reservation was created (reducing available stock from 1 to 0)
2. The availability check looked at **raw available stock** instead of checking for existing reservations
3. The system marked the item as "not available" even though it had a valid reservation linked via `reservation_id`

This caused confusion in the admin UI where items showed as unavailable despite being properly reserved for the offer.

## Root Cause

The `checkOfferInventoryAvailability()` method in `OfferService` only checked raw inventory levels:

```typescript
const availableQuantity = inventoryMap[item.variant_id] || 0;
const isAvailable = availableQuantity >= requiredQuantity;
```

This ignored the fact that offer items with `reservation_id` already have inventory allocated to them.

## Solution

Modified the availability check logic to prioritize reservation status:

### Backend Fix (`busbasisberlin/src/modules/offer/service.ts`)

```typescript
// ✅ FIX: If item has a reservation_id, it means inventory is already reserved
const hasReservation = Boolean(item.reservation_id);
const availableQuantity = inventoryMap[item.variant_id] || 0;
const requiredQuantity = item.quantity;

// If there's a reservation, the item is available regardless of raw stock
const isAvailable = hasReservation || availableQuantity >= requiredQuantity;

let stockStatus = 'available';
if (hasReservation) {
	// Item has reservation - it's available
	stockStatus = 'reserved';
} else if (availableQuantity <= 0) {
	stockStatus = 'out_of_stock';
} else if (availableQuantity < requiredQuantity) {
	stockStatus = 'insufficient';
} else if (availableQuantity <= 5) {
	stockStatus = 'low_stock';
}
```

### UI Fix (`busbasisberlin/src/admin/routes/offers/[id]/page.tsx`)

Added visual indicator for reserved items:

```typescript
case 'reserved':
    return (
        <Badge color="purple" size="small">
            Reserviert
        </Badge>
    );
```

## How It Works

1. **Draft offers**: Check raw inventory availability (no reservations yet)
2. **Active offers**:
   - Items with `reservation_id` → marked as "reserved" (always available)
   - Items without `reservation_id` → check raw inventory
3. **Accepted/Completed offers**: Same as active (reservations maintained)

## Status Flow

```
Draft → Active:
  ✅ Creates reservations
  ✅ Sets reservation_id on offer items
  ✅ Items show as "Reserviert" (purple badge)

Active → Accepted:
  ✅ Maintains reservations
  ✅ Items remain "Reserviert"

Active/Accepted → Completed:
  ✅ Fulfills reservations
  ✅ Reduces actual inventory

Active → Cancelled:
  ✅ Releases reservations
  ✅ Returns stock to pool
```

## Benefits

1. **Accurate availability**: Items with reservations are correctly marked as available
2. **Clear visual feedback**: Purple "Reserviert" badge shows reservation status
3. **Prevents double-counting**: Raw stock vs reserved stock distinction is clear
4. **Logical behavior**: Reservation proves the item is allocated to this offer

## Testing

To test this fix:

1. Create product with 1 unit in stock
2. Add to draft offer
3. Transition offer to Active
4. Check availability - should show "Reserviert" (purple badge)
5. Item should be marked as available for this offer
6. Other new offers should see 0 availability for this product

## Files Changed

- `busbasisberlin/src/modules/offer/service.ts` - Availability check logic
- `busbasisberlin/src/admin/routes/offers/[id]/page.tsx` - UI badge display

## Additional UI Improvements

### Problem: Visual Indicators Not Updated

Even after fixing the availability logic, the UI still showed:

- "Artikel nicht verfügbar" badge in header
- "0" stock quantity in item cards
- Red warning badges despite valid reservations

### Solution: Enhanced UI Display

**1. Overall Status Calculation** (`service.ts`)

```typescript
// Reserved items can be completed, so check if all items are either available or reserved
const canComplete = itemStatuses.every(
	item =>
		item.stock_status === 'available' ||
		item.stock_status === 'reserved' ||
		item.stock_status === 'low_stock' ||
		item.stock_status === 'service',
);
```

**2. Inventory Status Section** (`page.tsx`)

- Added purple info box: "🔒 Artikel sind für dieses Angebot reserviert"
- Only shows when `offer.has_reservations` is true
- Provides clear feedback that items are allocated

**3. Item Card Display** (`page.tsx`)

```typescript
if (inventoryItem.stock_status === 'reserved') {
	return `🔒 Reserviert (${item.quantity} Stk.)`;
}
```

Now reserved items show:

- "🔒 Reserviert (X Stk.)" instead of "Lager: 0"
- Purple "Reserviert" badge
- No false "Artikel nicht verfügbar" warnings

## Critical Bug: Duplicate Logic in API Endpoint

### The Real Problem

The fix initially didn't work because the `/admin/offers/:id/check-inventory` API endpoint had **duplicate inventory check logic** instead of using the service method.

**Before**:

```typescript
// check-inventory/route.ts - DUPLICATE LOGIC
const itemStatuses = offer.items.map(item => {
	const availableQuantity = inventoryMap[item.variant_id] || 0;
	const isAvailable = availableQuantity >= requiredQuantity; // ❌ Ignores reservations
	// ...
});
```

**After**:

```typescript
// check-inventory/route.ts - USE SERVICE METHOD
const query = req.scope.resolve('query');
const inventoryStatus = await offerService.checkOfferInventoryAvailability(
	offerId,
	query,
);
```

### Additional Fix: Inventory Reduction

When fulfilling offers, inventory wasn't being reduced because the logic was:

```typescript
const availableToReduce = Math.min(
	level.stocked_quantity - level.reserved_quantity, // ❌ This becomes 0!
	item.quantity,
);
```

With a reservation: `stocked=1, reserved=1` → `availableToReduce = 0` → No reduction!

**Fixed**:

```typescript
const quantityToReduce = Math.min(
	level.stocked_quantity, // ✅ Reduce from total stock
	item.quantity,
);
```

### Invoice Generation on Completion

When fulfilling an offer (completing it), the system now:

1. Reduces inventory from total stock (not available stock)
2. Releases reservations
3. Updates status to "completed"
4. **Emits event** to trigger invoice PDF generation and customer email

Previously, the fulfill workflow didn't emit the `offer.status_changed` event, so no invoice was sent to the customer.

## Files Changed

- `busbasisberlin/src/modules/offer/service.ts` - Availability check logic with reservation support
- `busbasisberlin/src/api/admin/offers/[id]/check-inventory/route.ts` - Use service method instead of duplicate logic
- `busbasisberlin/src/workflows/fulfill-offer-reservations.ts` - Fix inventory reduction + emit event for invoice
- `busbasisberlin/src/admin/routes/offers/[id]/page.tsx` - UI badge display for reserved items

## Date

October 20, 2025
