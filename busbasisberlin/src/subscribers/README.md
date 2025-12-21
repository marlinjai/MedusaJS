# Event Subscribers

Subscribers handle events emitted in the Medusa application.

> Learn more about Subscribers in [this documentation](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers).

Subscribers are created in TypeScript or JavaScript files under the `src/subscribers` directory.

## Meilisearch Event Subscribers

This project includes comprehensive event-driven Meilisearch synchronization that keeps search indexes updated in real-time when data changes occur.

### Product & Variant Synchronization

#### `product-sync.ts`

**Triggers:** `product.created`, `product.updated`

Syncs products to Meilisearch with all related data (categories, variants, pricing, inventory).

**Use Case:** When a product is created or its base information is updated (title, description, handle, status, etc.).

#### `product-delete.ts`

**Triggers:** `product.deleted`

Removes products from Meilisearch index when permanently deleted.

#### `variant-sync.ts`

**Triggers:** `product_variant.created`, `product_variant.updated`, `product_variant.deleted`

Syncs the parent product to Meilisearch to update variant-related data.

**Why Important:** Variants affect:

- Product availability (`is_available`)
- Price ranges (`min_price`, `max_price`)
- SKU searchability
- Variant count

**Use Cases:**

- New variant added to a product
- Variant pricing changes
- Variant SKU or options change
- Variant deleted

### Inventory Synchronization

#### `inventory-meilisearch.ts`

**Triggers:** Business events that affect inventory

**Important:** Medusa doesn't emit `inventory_level.*` events directly. This subscriber listens to business events that indirectly affect inventory:

- `order.placed` - Order reduces inventory
- `order.updated` - Order changes may affect inventory
- `order.canceled` - Order cancellation releases inventory
- `offer.status_changed` - Offer reservations affect availability
- `product_variant.created/updated/deleted` - Variant changes affect inventory

**Action Flow:**

1. Detects which event type occurred
2. Extracts affected product IDs from:
   - Order items (for order events)
   - Offer items (for offer events)
   - Variant data (for variant events)
3. Syncs all affected products in batches

**Why Important:** These events indirectly affect:

- `is_available` flag (via reservations and actual inventory)
- `total_inventory` count
- Search result filtering by availability

**Note:** This is a workaround for Medusa's lack of inventory events. The offer module uses official Medusa workflows (`createReservationsWorkflow`, etc.) but Medusa doesn't emit events for these operations.

### Category & Collection Synchronization

#### `category-sync.ts`

**Triggers:** `product_category.created`, `product_category.updated`, `product_category.deleted`

**Action Flow:**

1. Syncs the category to the `categories` index
2. Recursively finds ALL subcategories under the updated category
3. Finds all products in the category AND all its subcategories
4. Syncs affected products in batches (10 at a time)

**Why Important:** Category changes affect:

- `category_names` in product index
- `category_paths` (hierarchical navigation)
- `hierarchical_categories.lvl0`, `lvl1`, `lvl2`, `lvl3` (InstantSearch hierarchical menu)
- Category faceting and filtering
- The `categories` index itself

**Critical Feature - Hierarchical Updates:**
When a parent category is renamed or updated, ALL products in the entire category tree are re-synced. This is essential because:

- Products in subcategories inherit the parent category name in their `hierarchical_categories.lvl0` field
- Example: Renaming "Mercedes Benz" to "Mercedes-Benz" updates:
  - Products directly in "Mercedes Benz"
  - Products in "Mercedes Benz > Motor"
  - Products in "Mercedes Benz > Motor > Dichtungen"
  - All other descendant categories

**Use Cases:**

- Category renamed or description changed (syncs entire tree)
- Category hierarchy changes
- Category activated/deactivated
- Category deleted

#### `collection-sync.ts`

**Triggers:** `product_collection.created`, `product_collection.updated`, `product_collection.deleted`

Syncs products when collections are updated to maintain collection relationships in search.

### Manual Sync

#### `meilisearch-sync.ts`

**Triggers:** `meilisearch.sync-all` (custom event)

Performs full re-index of all products. Triggered via:

- Admin UI: Settings → Meilisearch → "Sync All Products"
- Custom event emission: `eventBus.emit('meilisearch.sync-all')`

**Use Cases:**

- Initial index setup
- Recovery from sync failures
- Major schema changes
- Data consistency verification

## Event Flow Architecture

### Product Update Example

```
Admin Updates Product Title
         ↓
product.updated event emitted
         ↓
product-sync.ts subscriber receives event
         ↓
Fetches full product data with relations
         ↓
Transforms to Meilisearch document format
         ↓
Updates Meilisearch index
         ↓
Storefront search results immediately updated
```

### Inventory Change Example

```
Customer Places Order
         ↓
order.placed event emitted
         ↓
inventory-meilisearch.ts subscriber receives event
         ↓
Extracts product IDs from order items
         ↓
Fetches current inventory for each product
         ↓
Syncs products with updated availability
         ↓
Search results reflect new inventory status
```

### Category Change Example

```
Admin Renames Category
         ↓
product_category.updated event emitted
         ↓
category-sync.ts subscriber receives event
         ↓
Updates category in categories index
         ↓
Finds all products in category (with relations)
         ↓
Syncs each product in batches of 10
         ↓
Product search results show new category name
```

## Offer Module Subscribers

### `offer-events.ts`

Handles custom offer module events for business logic integration.

### `offer-status-changed.ts`

Tracks offer status transitions for analytics and audit trails.

**Status Flow:**

```
draft → active → accepted → completed
  ↓       ↓         ↓          ↓
Email  Email    Email      Email
Sent   Sent     Sent       Sent
```

## Order Subscribers

### `order-placed.ts`

Handles order placement events:

- Sends order confirmation email
- Triggers inventory updates
- Initiates fulfillment workflows

## Authentication Subscribers

### `user-invited.ts`

Sends user invitation emails when admin invites new team members.

### `handle-reset.ts`

Handles password reset functionality:

- Generates secure reset tokens
- Sends password reset emails
- Validates reset token expiry

## Creating a Custom Subscriber

### Basic Example

Create `src/subscribers/product-created.ts`:

```typescript
import { type SubscriberConfig } from '@medusajs/framework';

// Subscriber function
export default async function productCreateHandler() {
	console.log('A product was created');
}

// Subscriber config
export const config: SubscriberConfig = {
	event: 'product.created',
};
```

A subscriber file must export:

- The subscriber function (async function executed when event triggers)
- A configuration object defining the event to listen to

### With Event Data and Container

```typescript
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

export default async function productCreateHandler({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const productId = data.id;

	// Resolve Medusa services from container
	const productModuleService = container.resolve('product');

	const product = await productModuleService.retrieveProduct(productId);

	console.log(`The product ${product.title} was created`);
}

export const config: SubscriberConfig = {
	event: 'product.created',
};
```

### Subscriber Parameters

A subscriber receives an object with:

- `event`: Object with event details
  - `data`: Event's data payload
- `container`: Medusa container for resolving services

## Best Practices

### 1. Handle Errors Gracefully

```typescript
export default async function mySubscriber({
	event,
	container,
}: SubscriberArgs) {
	try {
		// Your logic here
	} catch (error) {
		console.error('[MY-SUBSCRIBER] Error:', error);
		// Don't throw - prevents other subscribers from running
	}
}
```

### 2. Use Batch Processing for Multiple Items

```typescript
// Process products in batches to avoid overwhelming Meilisearch
const BATCH_SIZE = 10;

for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
	const batch = productIds.slice(i, i + BATCH_SIZE);
	await Promise.all(batch.map(id => syncProduct(id)));
}
```

### 3. Add Logging for Debugging

```typescript
export default async function mySubscriber({ event }: SubscriberArgs) {
	console.log(`[MY-SUBSCRIBER] Received event:`, event.name);
	console.log(`[MY-SUBSCRIBER] Event data:`, event.data);

	// Your logic here

	console.log(`[MY-SUBSCRIBER] Processing complete`);
}
```

### 4. Resolve Services Early

```typescript
export default async function mySubscriber({ container }: SubscriberArgs) {
	// Resolve all needed services at the start
	const productService = container.resolve('product');
	const meilisearchService = container.resolve('meilisearch');

	// Use services
}
```

### 5. Check for Required Data

```typescript
export default async function mySubscriber({ event }: SubscriberArgs) {
	const { id } = event.data;

	if (!id) {
		console.warn('[MY-SUBSCRIBER] No ID in event data, skipping');
		return;
	}

	// Process with ID
}
```

## Available Events

### Core Medusa Events

**Products:**

- `product.created`
- `product.updated`
- `product.deleted`

**Variants:**

- `product_variant.created`
- `product_variant.updated`
- `product_variant.deleted`

**Orders:**

- `order.placed`
- `order.updated`
- `order.canceled`
- `order.completed`

**Categories:**

- `product_category.created`
- `product_category.updated`
- `product_category.deleted`

**Collections:**

- `product_collection.created`
- `product_collection.updated`
- `product_collection.deleted`

**Customers:**

- `customer.created`
- `customer.updated`
- `customer.deleted`

**Authentication:**

- `invite.created`
- `user.password_reset`

### Custom Events

**Offers:**

- `offer.created`
- `offer.status_changed`
- `offer.updated`
- `offer.deleted`

**Meilisearch:**

- `meilisearch.sync-all`

## Troubleshooting

### Subscriber Not Firing

**Check:**

1. File is in `src/subscribers/` directory
2. File exports both handler function and config
3. Event name matches exactly (case-sensitive)
4. Medusa server was restarted after creating subscriber

### Performance Issues

**Symptoms:**

- Events processing slowly
- Application feels sluggish
- Event queue backing up

**Solutions:**

1. Add batch processing (see Best Practices #2)
2. Use `setImmediate()` or `setTimeout()` for expensive operations
3. Consider moving to background jobs for heavy processing
4. Add rate limiting for high-frequency events

### Duplicate Processing

**Cause:** Subscriber registered multiple times or event emitted multiple times.

**Solution:**

```typescript
// Add idempotency check
const processedIds = new Set<string>();

export default async function mySubscriber({ event }: SubscriberArgs) {
	const { id } = event.data;

	if (processedIds.has(id)) {
		console.log(`[MY-SUBSCRIBER] Already processed ${id}, skipping`);
		return;
	}

	processedIds.add(id);

	// Process
}
```

## Monitoring Subscribers

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=debug
```

### Add Performance Tracking

```typescript
export default async function mySubscriber({ event }: SubscriberArgs) {
	const startTime = Date.now();

	try {
		// Your logic
	} finally {
		const duration = Date.now() - startTime;
		console.log(`[MY-SUBSCRIBER] Processed in ${duration}ms`);
	}
}
```

### Test Subscribers Locally

```typescript
// In your test file or script
import { eventBus } from '@medusajs/framework';

// Emit test event
eventBus.emit('product.created', { id: 'test-product-id' });
```

## Additional Resources

- [Medusa Events & Subscribers Documentation](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers)
- [Medusa Container & Dependency Injection](https://docs.medusajs.com/learn/fundamentals/container)
- [Meilisearch Integration Guide](https://docs.meilisearch.com)
