# Custom Subscribers

Subscribers handle events emitted in the Medusa application.

> Learn more about Subscribers in [this documentation](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers).

The subscriber is created in a TypeScript or JavaScript file under the `src/subscribers` directory.

## Meilisearch Event Subscribers

This project includes comprehensive event-driven Meilisearch synchronization:

### Product & Variant Synchronization

- **product-sync.ts** - Syncs products when created/updated
- **product-delete.ts** - Removes products from Meilisearch when deleted
- **variant-sync.ts** - Syncs products when variants change (pricing, SKUs, availability)

### Inventory Synchronization

- **inventory-meilisearch.ts** - Syncs products when business events affect inventory (orders, offers, variants)

### Category & Collection Synchronization

- **category-sync.ts** - Syncs categories and affected products when category data changes
- **collection-sync.ts** - Syncs products when collections are updated

### Manual Sync

- **meilisearch-sync.ts** - Full re-index triggered via admin UI or custom event

### Other Subscribers

- **offer-events.ts** - Handles custom offer module events
- **offer-status-changed.ts** - Tracks offer status transitions
- **order-placed.ts** - Handles order placement events
- **user-invited.ts** - Sends user invitation emails
- **handle-reset.ts** - Password reset functionality

See [MEILISEARCH_EVENT_HANDLERS.md](../../../change-docu/MEILISEARCH_EVENT_HANDLERS.md) for detailed Meilisearch sync documentation.

For example, create the file `src/subscribers/product-created.ts` with the following content:

```ts
import { type SubscriberConfig } from '@medusajs/framework';

// subscriber function
export default async function productCreateHandler() {
	console.log('A product was created');
}

// subscriber config
export const config: SubscriberConfig = {
	event: 'product.created',
};
```

A subscriber file must export:

- The subscriber function that is an asynchronous function executed whenever the associated event is triggered.
- A configuration object defining the event this subscriber is listening to.

## Subscriber Parameters

A subscriber receives an object having the following properties:

- `event`: An object holding the event's details. It has a `data` property, which is the event's data payload.
- `container`: The Medusa container. Use it to resolve modules' main services and other registered resources.

```ts
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';

export default async function productCreateHandler({
	event: { data },
	container,
}: SubscriberArgs<{ id: string }>) {
	const productId = data.id;

	const productModuleService = container.resolve('product');

	const product = await productModuleService.retrieveProduct(productId);

	console.log(`The product ${product.title} was created`);
}

export const config: SubscriberConfig = {
	event: 'product.created',
};
```
