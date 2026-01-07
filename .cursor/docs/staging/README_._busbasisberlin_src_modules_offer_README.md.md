# Offer Module

Complete ERP offer/quotation management system with inventory reservation, PDF generation, email notifications, and status workflow management.

## Overview

The Offer module provides a full-featured quote and offer management system integrated with Medusa's inventory system. It handles the complete lifecycle from draft creation through acceptance and fulfillment, with automatic inventory management and customer communication.

## Features

### Core Functionality

- **Automatic Offer Numbering**: Sequential offer numbers (e.g., ANG-00001, ANG-00002)
- **Status Workflow**: Draft → Active → Accepted → Completed/Cancelled
- **Bidirectional Transitions**: Can transition between Active ↔ Accepted states
- **Product & Service Items**: Support for both products and services in offers
- **Price Snapshotting**: Prices and tax rates are captured at offer creation for integrity
- **Inventory Integration**: Automatic reservation management with stock tracking

### Inventory Management

- **Manual Reservation**: Reserve inventory via button click (available for draft/active statuses)
- **Manual Release**: Release reservations without changing status (available for active/accepted statuses)
- **Automatic Release**: Reservations released when offer is cancelled or completed
- **Reservation Tracking**: Each reservation includes offer number in description for easy identification
- **Stock Availability**: Real-time inventory availability checking

### PDF Generation

- **DIN 5008 Compliant**: German standard compliant PDF generation
- **Automatic Caching**: PDFs are cached and can be regenerated on demand
- **Template-Based**: Uses Handlebars templates for customization
- **S3 Storage**: PDFs stored in S3 for long-term access

### Email Notifications

- **Status-Based Templates**: Different email templates for each status
  - Active: "Ihr Angebot ist bereit"
  - Accepted: "Angebot angenommen - Bestätigung"
  - Completed: "Angebot erfolgreich abgeschlossen"
  - Cancelled: "Angebot storniert"
- **Preview Functionality**: Preview email and PDF before sending
- **PDF Attachments**: PDF automatically attached to emails
- **Granular Control**: Per-offer email notification preferences

### Search Integration

- **Product Search**: Enhanced search by SKU, handle, or product name
- **Customer Search**: Searchable dropdown for customer selection
- **Service Search**: Searchable dropdown for service selection

## Status Workflow

### Valid Transitions

```
draft → active → accepted → completed
  ↓       ↓         ↓          ↓
  ↓       ↓         ↓          ↓
  ↓       ↓         ↓          ↓
cancelled (from any status)
```

**Bidirectional Transitions:**

- `active` ↔ `accepted` (maintains reservations)
- `active` → `draft` (releases reservations)

### Status Descriptions

- **draft**: Initial state, no inventory impact
- **active**: Offer is active, can have reservations
- **accepted**: Customer has accepted, reservations maintained
- **completed**: Order fulfilled, inventory reduced, reservations released
- **cancelled**: Offer cancelled, reservations released

## Inventory Operations

### Reservation Flow

1. **Manual Reservation**: User clicks "Inventar reservieren" button

   - Available when: status is `draft` or `active`, no existing reservations
   - Creates reservations for all product items that don't already have reservations
   - Prevents duplicate reservations: If an item already has a `reservation_id`, it's skipped
   - Sets `has_reservations` flag to `true` after successful reservation
   - Reservation description: "Reservierung für Angebot ANG-00009"
   - **Note**: Multiple rapid clicks are prevented - items with existing reservations are skipped

2. **Status Transition Impact**:

   - `draft` → `active`: No automatic reservation (manual only)
   - `active` → `accepted`: Reservations maintained
   - `accepted` → `active`: Reservations maintained (bidirectional)
   - `active` → `draft`: Reservations released
   - Any → `cancelled`: Reservations released
   - `accepted` → `completed`: Inventory reduced, reservations released

3. **Manual Release**: User clicks "Reservierungen freigeben" button
   - Available when: status is `active` or `accepted`, `has_reservations === true`
   - Releases all reservations for product items without changing offer status
   - Sets `has_reservations` flag to `false` after successful release
   - Clears `reservation_id` from all offer items
   - **Important**: This action only releases reservations - it does NOT change the offer status
   - **Use Case**: Useful when you need to free up inventory without cancelling or completing the offer

### Reservation Metadata

Each reservation includes:

- `type`: 'offer'
- `offer_id`: Offer UUID
- `offer_number`: Human-readable offer number (e.g., ANG-00009)
- `offer_item_id`: Related offer item ID
- `variant_id`: Product variant ID
- `sku`: Product SKU
- `created_at`: Timestamp

**Description Field**: "Reservierung für Angebot {offer_number}"

## API Endpoints

### Admin Endpoints

- `GET /admin/offers` - List offers with filtering
- `POST /admin/offers` - Create new offer
- `GET /admin/offers/:id` - Get offer details
- `PUT /admin/offers/:id` - Update offer
- `DELETE /admin/offers/:id` - Delete offer
- `POST /admin/offers/:id/transition-status` - Change offer status
- `POST /admin/offers/:id/reserve-inventory` - Manually reserve inventory
- `POST /admin/offers/:id/release-reservations` - Manually release reservations
- `POST /admin/offers/:id/generate-pdf` - Generate PDF
- `POST /admin/offers/:id/preview-email` - Preview email and PDF
- `POST /admin/offers/:id/send-email` - Send email with PDF attachment
- `POST /admin/offers/:id/update-reservations` - Update reservations when items change
- `POST /admin/offers/:id/check-inventory` - Check inventory availability

### Search Endpoints

- `GET /admin/offers/search/products` - Search products (supports SKU, handle, name)
- `GET /admin/offers/search/services` - Search services
- `GET /admin/offers/search/customers` - Search customers

## Data Models

### Offer

```typescript
{
	id: string;
	offer_number: string; // e.g., "ANG-00009"
	offer_number_seq: number; // Sequential number
	status: 'draft' | 'active' | 'accepted' | 'completed' | 'cancelled';
	customer_name: string | null;
	customer_email: string | null;
	customer_phone: string | null;
	subtotal: number; // in cents
	tax_amount: number; // in cents
	total_amount: number; // in cents
	currency_code: string; // default: 'EUR'
	valid_until: Date | null;
	has_reservations: boolean;
	pdf_url: string | null;
	email_notifications: object | null; // Per-offer preferences
	// ... timestamps and other fields
}
```

### Offer Item

```typescript
{
	id: string;
	offer_id: string;
	item_type: 'product' | 'service';
	product_id: string | null;
	service_id: string | null;
	variant_id: string | null;
	reservation_id: string | null;
	sku: string | null;
	title: string;
	quantity: number;
	unit_price: number; // in cents (snapshot)
	total_price: number; // in cents
	tax_rate: number; // snapshot
	// ... other fields
}
```

## Workflows

### Status Transition Workflow

`transition-offer-status.ts` handles all status changes with:

- Validation of allowed transitions
- Inventory operations (reserve/release/maintain)
- Status history tracking
- Event emission for notifications

### Inventory Workflows

- `reserve-offer-inventory.ts`: Creates reservations for product items
- `release-offer-reservations.ts`: Releases all reservations
- `update-offer-reservations.ts`: Updates reservations when items change
- `fulfill-offer-reservations.ts`: Completes offer and reduces inventory

## Email Templates

Located in `src/modules/resend/emails/`:

- `offer-active.tsx`: Active offer notification
- `offer-accepted.tsx`: Acceptance confirmation
- `offer-completed.tsx`: Completion notification
- `offer-cancelled.tsx`: Cancellation notification

All templates use React Email and include:

- Company branding
- Offer details
- PDF attachment
- Customer information

## Usage Examples

### Creating an Offer

```typescript
const offerService = resolveOfferService(container);
const offer = await offerService.createOfferWithItems({
	customer_name: 'ACME Corp',
	customer_email: 'contact@acme.com',
	items: [
		{
			item_type: 'product',
			product_id: 'prod_123',
			variant_id: 'variant_456',
			quantity: 2,
			unit_price: 5000, // €50.00 in cents
		},
	],
});
```

### Reserving Inventory

```typescript
// Via API endpoint
POST / admin / offers / { offer_id } / reserve - inventory;

// Or via workflow
await reserveOfferInventoryWorkflow(container).run({
	input: { offer_id: 'offer_123' },
});
```

### Transitioning Status

```typescript
// Via API endpoint
POST /admin/offers/{offer_id}/transition-status
{
  "offer_id": "offer_123",
  "new_status": "accepted",
  "user_id": "user_456"
}

// Or via workflow
await transitionOfferStatusWorkflow(container).run({
  input: {
    offer_id: "offer_123",
    new_status: "accepted",
    user_id: "user_456",
  },
});
```

## Admin UI

The offer module includes a complete admin UI with:

- Offer list with filtering and search
- Offer detail page with full editing capabilities
- Status management dropdown
- Inventory reservation/release buttons
- PDF generation and preview
- Email preview and sending
- Item management (add/edit/remove products and services)
- Customer selection with searchable dropdown
- Product selection with SKU/handle search

## Related Documentation

- [Offer Inventory Flow](../../../change-docu/OFFER_INVENTORY_FLOW.md): Detailed inventory reservation flow diagram
- [Offer Complete Flow](../../../change-docu/OFFER_COMPLETE_FLOW.md): Complete fulfillment process documentation

## Configuration

### Environment Variables

No specific environment variables required (uses standard Medusa configuration).

### Module Registration

The module is registered in `medusa-config.ts`:

```typescript
modules: [
	{
		resolve: './src/modules/offer',
	},
];
```

## Migration

Run migrations to create database tables:

```bash
npx medusa db:migrate
```

The module includes multiple migrations for schema evolution.

## Future Enhancements

- [ ] Offer templates/presets
- [ ] Bulk offer operations
- [ ] Offer comparison features
- [ ] Advanced reporting and analytics
- [ ] Integration with external ERP systems
