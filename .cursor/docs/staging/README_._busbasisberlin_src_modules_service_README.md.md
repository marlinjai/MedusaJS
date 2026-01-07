# Service Module

Service management system for offering services alongside products in offers and orders.

## Overview

The Service module provides a service catalog system for managing services that can be offered to customers. Services can be included in offers alongside products and have flexible pricing models.

## Features

### Core Functionality

- **Service Catalog**: Complete CRUD operations for services
- **Flexible Pricing**: Base price or hourly rate pricing
- **Service Categories**: Categorize services (e.g., "Wartung", "Reparatur", "Beratung")
- **Service Types**: Different service types (e.g., "Stunden", "Pauschal", "Material")
- **Duration Tracking**: Estimated duration in minutes
- **Status Management**: Active/inactive status
- **Featured Services**: Mark services as featured

### Service Requirements

- Requires vehicle
- Requires diagnosis
- Requires approval

## Data Models

### Service

```typescript
{
	id: string;
	title: string;
	description: string | null;
	short_description: string | null;
	category: string | null; // e.g., "Wartung", "Reparatur"
	service_type: string | null; // e.g., "Stunden", "Pauschal", "Material"

	// Pricing
	base_price: number | null; // in cents
	hourly_rate: number | null; // in cents
	currency_code: string; // default: 'EUR'

	// Service Details
	estimated_duration: number | null; // in minutes
	is_active: boolean; // default: true
	is_featured: boolean; // default: false

	// Requirements
	requires_vehicle: boolean; // default: false
	requires_diagnosis: boolean; // default: false
	requires_approval: boolean; // default: false

	// Additional Information
	requirements: string | null;
	notes: string | null;
	status: 'active' | 'inactive' | 'draft'; // default: 'active'
}
```

## API Endpoints

### Admin Endpoints

- `GET /admin/services` - List services
- `POST /admin/services` - Create service
- `GET /admin/services/:id` - Get service details
- `PUT /admin/services/:id` - Update service
- `DELETE /admin/services/:id` - Delete service

### Search Endpoints

- `GET /admin/offers/search/services` - Search services (used in offer module)

## Usage Examples

### Creating a Service

```typescript
const serviceService = req.scope.resolve(SERVICE_MODULE);
const service = await serviceService.createServices({
	title: 'Ölwechsel',
	category: 'Wartung',
	service_type: 'Pauschal',
	base_price: 5000, // €50.00 in cents
	requires_vehicle: true,
	is_active: true,
});
```

### Getting Active Services

```typescript
const activeServices = await serviceService.getActiveServices();
```

### Getting Featured Services

```typescript
const featuredServices = await serviceService.getFeaturedServices();
```

## Integration with Offers

Services can be added to offers alongside products:

```typescript
// In offer creation
items: [
	{
		item_type: 'service',
		service_id: 'service_123',
		quantity: 1,
		unit_price: 5000, // €50.00 in cents
	},
];
```

## Admin UI

The service module includes admin UI with:

- Service list with filtering
- Service detail page with full editing
- Category and type management
- Pricing configuration
- Requirement flags

## Migration

Run migrations to create database tables:

```bash
npx medusa db:migrate
```

The module includes migrations for schema creation.

## Related Documentation

- See [Offer Module](../offer/README.md) for how services are used in offers
- See backend [README](../../README.md) for general setup instructions
