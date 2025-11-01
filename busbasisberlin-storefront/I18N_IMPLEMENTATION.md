# i18n Implementation Summary

## Overview
This document summarizes the internationalization (i18n) implementation for the Bus Basis Berlin storefront. The application now supports German (primary) and English translations using a custom lightweight i18n solution.

## Implementation Approach

### Why Custom Solution?
- **Simpler integration** with Medusa's existing country code routing
- **No routing conflicts** - Medusa handles `/de/`, `/us/` routes
- **Lightweight** - Only translates UI, no complex routing logic
- **Server-first** - Translations loaded on server, hydrated to client

### Configuration Files

#### `src/lib/i18n/get-dictionary.ts`
- Server-side dictionary loader using Next.js recommendations
- Supports `'en'` and `'de'` locales
- Default locale: `de` (German)
- Dynamic imports for optimal bundle size

#### `src/lib/i18n/translations-context.tsx`
- Client-side React Context for translations
- `TranslationsProvider` component wraps the app
- `useTranslations(namespace)` hook for components
- Supports nested translation keys

#### `src/app/layout.tsx`
- Loads German translations using `getDictionary('de')`
- Wraps app with `TranslationsProvider`
- Provides messages to all client components

## Translation Files

### Location
- `/messages/de.json` - German translations (primary language)
- `/messages/en.json` - English translations

### Translation Structure
The translation files are organized into logical sections:

1. **common** - Shared translations (buttons, labels, etc.)
2. **nav** - Navigation elements
3. **hero** - Homepage hero section
4. **services** - Service descriptions
5. **contact** - Contact form and information
6. **cart** - Shopping cart
7. **checkout** - Checkout process (addresses, shipping, payment, review)
8. **account** - Account pages (login, profile, orders, etc.)
9. **products** - Product pages
10. **store** - Store/shop page
11. **order** - Order confirmation and details
12. **footer** - Footer content
13. **search** - Search functionality
14. **errors** - Error messages
15. **metadata** - SEO metadata

## Translated Components

### Cart Components
- ✅ `cart/components/sign-in-prompt` - Sign-in prompt
- ✅ `cart/components/empty-cart-message` - Empty cart message
- ✅ `cart/templates/summary` - Cart summary

### Checkout Components
- ✅ `checkout/components/addresses` - Shipping and billing addresses
- ✅ `checkout/components/payment` - Payment selection
- ✅ `checkout/components/discount-code` - Discount code input

### Home Page Components
- ✅ `home/components/hero` - Hero section with video
- ✅ `home/components/services` - Services section with 3 service cards

### Contact Page
- ✅ `contact/templates/contact-section` - Complete contact form and information

### Account Components
- ✅ `account/components/login` - Login form
- ✅ `account/templates/account-layout` - Account layout with footer

### Layout Components
- ✅ `layout/templates/footer` - Footer with contact info, links, and opening hours

## Usage in Components

### Client Components
For client components, use the `useTranslations` hook:

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('cart.empty');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

### Server Components
For server components, use `getTranslations`:

```typescript
import { getTranslations } from 'next-intl/server';

export async function MyServerComponent() {
  const t = await getTranslations('cart.empty');

  return (
    <div>
      <h1>{t('title')}</h1>
    </div>
  );
}
```

## Key Features

### 1. Nested Translation Keys
Translations are organized hierarchically for better organization:
```
cart.empty.title → "Ihr Warenkorb ist leer"
cart.signInPrompt.button → "Anmelden"
```

### 2. Feature-Specific Translations
Each major feature has its own translation namespace:
- Services with multiple features per service type
- Contact form with form-specific fields
- Checkout with step-specific content

### 3. Consistent Terminology
Common terms are centralized in the `common` namespace:
- Buttons (save, edit, delete, etc.)
- Form labels (name, email, phone, etc.)
- Status messages

## Testing Checklist

### Pages to Verify
- [ ] Home page (`/`)
  - Hero section
  - Services section
  - Contact section

- [ ] Cart page (`/cart`)
  - Empty cart message
  - Sign-in prompt
  - Cart summary

- [ ] Checkout page (`/checkout`)
  - Address form
  - Shipping selection
  - Payment selection

- [ ] Store page (`/store`)
  - Product listings
  - Filters

- [ ] Contact page (`/contact`)
  - Contact form
  - Location information

- [ ] Account pages (`/account/`)
  - Login
  - Registration
  - Profile
  - Orders

- [ ] Footer (all pages)
  - Company information
  - Quick links
  - Contact details
  - Opening hours

## Remaining Work

### Components Not Yet Translated
Some components may still contain hardcoded text that needs translation:
1. Navigation menu items
2. Product detail pages
3. Store search and filter components
4. Order confirmation pages
5. Account-specific subpages (order details, addresses, etc.)

### Future Enhancements
1. Add more languages (e.g., French, Spanish)
2. Implement language switcher component
3. Add locale-specific formatting (dates, currency, numbers)
4. Store user language preference
5. Add RTL language support if needed

## Notes

### Medusa Integration
- The i18n implementation works alongside Medusa's country code routing
- Country codes (e.g., `/de/`, `/us/`) remain separate from locale codes
- Translation is independent of the Medusa region system

### Performance
- Messages are loaded once at the app level
- No impact on initial page load
- Client-side translations are instant

### Maintenance
- All translation strings are centralized in JSON files
- Easy to add new languages by duplicating and translating JSON files
- Type-safe translations with TypeScript support

## Migration Guide

When adding new text to the application:
1. Add the English and German text to respective JSON files
2. Use nested keys for organization (e.g., `section.subsection.key`)
3. Use `useTranslations` hook in client components
4. Use `getTranslations` in server components
5. Test both languages

## Contact
For questions or issues with the i18n implementation, refer to the [Next-intl documentation](https://next-intl-docs.vercel.app/).

