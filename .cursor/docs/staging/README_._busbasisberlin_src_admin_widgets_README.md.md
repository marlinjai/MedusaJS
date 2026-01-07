# Admin Widgets

This directory contains custom Medusa Admin widgets that enhance the admin UI with additional functionality.

## Available Widgets

### 1. Order Pickup Indicator (`order-pickup-indicator.tsx`)

**Purpose:** Provides clear visual indicators for orders that require pickup with cash payment.

**Location:** Shows on order detail pages (zone: `order.details.before`)

**Features:**
- 🟠 **Orange Alert Box**: Prominent visual indicator for pickup orders
- 📦 **Pickup Badge**: Shows "Abholung" (Pickup) label
- 💵 **Cash Badge**: Shows "Bar" (Cash) payment method
- ⚠️ **Payment Status**: Warning when payment is still awaiting
- 📋 **Action Reminder**: Reminds staff to collect cash payment and update system

**When It Shows:**
- Order shipping method contains "abholung" or "pickup"
- Payment provider is `pp_system` or `pp_system_default`

**Visual Elements:**
```
┌──────────────────────────────────────────────────────┐
│ 🟠 Lagerabholung mit Barzahlung     [Abholung] [Bar] │
│                                                       │
│ 📦 Versandart: Abholung am Lager                      │
│ 💵 Zahlungsart: Barzahlung bei Abholung              │
│                                                       │
│ ⚠️  Wichtig: Zahlung muss bei Abholung bar          │
│     entgegen genommen werden...                       │
└──────────────────────────────────────────────────────┘
```

### 2. Product Suppliers (`product-suppliers.tsx`)

**Purpose:** Manages product-supplier relationships with inline editing.

**Location:** Shows on product detail pages

**Features:**
- Hierarchical supplier view
- Inline editing for pricing and SKUs
- Multiple entries per supplier
- Primary supplier marking
- Drag-and-drop reordering

### 3. Inventory Settings (`inventory-settings.tsx`)

**Purpose:** Configures inventory display settings globally.

**Location:** Shows on store settings pages

**Features:**
- Low stock threshold configuration
- Stock display options
- Backorder handling settings

## Development

### Creating a New Widget

1. Create a new `.tsx` file in this directory
2. Import necessary components from `@medusajs/ui`
3. Define your widget component
4. Export the config using `defineWidgetConfig`

```typescript
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { Container } from '@medusajs/ui';

const MyWidget = ({ data }: { data: any }) => {
  return <Container>My Widget Content</Container>;
};

export const config = defineWidgetConfig({
  zone: 'product.details.before', // Where to show the widget
});

export default MyWidget;
```

### Available Zones

Common zones for widgets:
- `order.details.before` - Before order details
- `order.details.after` - After order details
- `product.details.before` - Before product details
- `product.details.after` - After product details
- `customer.details.before` - Before customer details
- `store.details.before` - In store settings

## Testing

Widgets are automatically discovered by Medusa Admin when placed in this directory with proper exports.

To test:
1. Build the admin: `npm run build:admin`
2. Start Medusa: `npm run dev`
3. Navigate to the relevant page in admin
4. The widget should appear in the configured zone

## Troubleshooting

**Widget not showing:**
- Check that `export const config` is present
- Verify the zone name is correct
- Ensure the widget file is in `/src/admin/widgets/`
- Check for TypeScript/linting errors
- Rebuild admin and restart server

**Data not available:**
- Widgets receive data via the `data` prop
- The data structure depends on the zone
- Use `console.log(data)` to inspect available data

