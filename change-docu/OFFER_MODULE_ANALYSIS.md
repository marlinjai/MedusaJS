# Offer Module - Medusa Best Practices Analysis

## Date: October 15, 2025

## Executive Summary

✅ **The offer module follows Medusa best practices excellently!**

The module uses official Medusa workflows for inventory management and properly integrates with the inventory system.

## Inventory Management Architecture

### ✅ Uses Official Medusa Workflows

The offer module correctly uses Medusa's official inventory workflows:

1. **`createReservationsWorkflow`** - For creating inventory reservations
2. **`updateReservationsWorkflow`** - For updating reservation quantities
3. **`deleteReservationsWorkflow`** - For releasing reservations

### Inventory Operations by Offer Status

| Status Transition    | Inventory Action      | Workflow Used                                                     |
| -------------------- | --------------------- | ----------------------------------------------------------------- |
| draft → active       | Create reservations   | `reserveOfferInventoryWorkflow` → `createReservationsWorkflow`    |
| active → accepted    | Maintain reservations | No change (reservations kept)                                     |
| active → cancelled   | Release reservations  | `releaseOfferInventoryWorkflow` → `deleteReservationsWorkflow`    |
| accepted → completed | Release reservations  | `fulfillOfferReservationsWorkflow` → `deleteReservationsWorkflow` |
| Any → cancelled      | Release reservations  | `releaseOfferInventoryWorkflow`                                   |

## Key Workflows

### 1. Reserve Offer Inventory

**File:** `src/workflows/reserve-offer-inventory.ts`

```typescript
// Creates reservations when offer becomes active
- Gets inventory items by SKU
- Gets stock locations
- Creates reservations via official workflow
- Links reservation_id to offer_item
```

### 2. Release Offer Inventory

**File:** `src/workflows/release-offer-inventory.ts`

```typescript
// Releases reservations when offer cancelled
- Retrieves all offer items with reservation_ids
- Deletes reservations via official workflow
- Updates offer items to remove reservation_ids
```

### 3. Update Offer Reservations

**File:** `src/workflows/update-offer-reservations.ts`

```typescript
// Updates reservations when offer items change
- Handles quantity updates (update workflow)
- Handles new items (create workflow)
- Handles deleted items (delete workflow)
```

### 4. Transition Offer Status

**File:** `src/workflows/transition-offer-status.ts`

```typescript
// Orchestrates status changes and inventory operations
- Validates status transition rules
- Triggers appropriate inventory workflows
- Tracks status history
- Emits events
```

## Events Emitted by Offer Module

### Custom Events (Working)

1. **`offer.created`** ✅

   - Emitted when new offer created
   - Triggers PDF generation (if status is active)
   - Sends email notifications

2. **`offer.status_changed`** ✅
   - Emitted on any status transition
   - Triggers PDF generation
   - Sends status update emails
   - Includes `previous_status` and `new_status`

### What Triggers Inventory Changes

The offer module **DOES affect inventory** through:

1. **Reservations** - When offers become active

   - Uses `createReservationsWorkflow`
   - Reduces available inventory
   - Does NOT reduce actual stock levels

2. **Reservation Updates** - When offer items change

   - Uses `updateReservationsWorkflow`
   - Adjusts reserved quantities

3. **Reservation Releases** - When offers cancelled/completed
   - Uses `deleteReservationsWorkflow`
   - Frees up reserved inventory

## Integration with Medusa Inventory System

### ✅ Best Practices Followed

1. **Uses Official Workflows** ✓

   - Never directly modifies inventory
   - Uses `createReservationsWorkflow`, `updateReservationsWorkflow`, `deleteReservationsWorkflow`

2. **Proper Rollback Support** ✓

   - All workflows have compensation logic
   - Inventory operations reversed on failure

3. **Metadata Tracking** ✓

   - Reservations include metadata:
     ```javascript
     {
       type: 'offer',
       offer_id: '...',
       offer_item_id: '...',
       variant_id: '...',
       sku: '...',
       created_at: '...'
     }
     ```

4. **Event-Driven Architecture** ✓
   - Emits custom events (`offer.created`, `offer.status_changed`)
   - Other systems can react to offer events

## Inventory Impact Analysis

### When Inventory IS Affected

❌ **Reservations do NOT trigger Medusa's core `inventory_level.*` events**

Reservations are separate from inventory levels:

- **Inventory Levels** = Physical stock at locations
- **Reservations** = Temporary holds on inventory

### What Medusa Events ARE Emitted

According to [Medusa documentation](https://docs.medusajs.com/resources/references/events):

✅ **Order Events** (these DO affect inventory):

- `order.placed` - When order is created
- `order.fulfilled` - When order items shipped
- `order.canceled` - When order cancelled

❌ **NO Inventory Level Events**:

- No `inventory_level.updated`
- No `inventory_level.created`
- No `reservation.created/updated/deleted`

## Conclusion

### ✅ Module Quality: Excellent

The offer module is **professionally built** and follows all Medusa best practices:

1. ✅ Uses official workflows
2. ✅ Proper error handling and rollback
3. ✅ Event-driven architecture
4. ✅ Metadata tracking
5. ✅ Clear separation of concerns

### ⚠️ Inventory Sync Challenge

The challenge for Meilisearch sync is:

**Offer reservations affect product availability BUT don't emit Medusa core events.**

This is a limitation of Medusa's event system, not the offer module.

## Recommendations for Meilisearch Sync

Since inventory changes don't emit events, we should:

1. **Listen to business events that cause inventory changes:**

   - ✅ `order.placed` - Order reduces inventory
   - ✅ `order.canceled` - Order releases inventory
   - ✅ `offer.status_changed` - Offer reservations change
   - ✅ `product_variant.updated` - Variant changes

2. **Periodic sync as backup:**

   - Scheduled job (every 5-10 minutes)
   - Catches any missed updates
   - Ensures data consistency

3. **On-demand sync:**
   - Admin UI button to force sync
   - API endpoint for external triggers
