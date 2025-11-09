# BusBasisBerlin - Medusa Backend

<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-c6af37f087bf.svg">
    </picture>
  </a>
</p>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>

## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`.

## Getting Started

Visit the [Quickstart Guide](https://docs.medusajs.com/learn/installation) to set up a server.

Visit the [Docs](https://docs.medusajs.com/learn/installation#get-started) to learn more about our system requirements.

## Features

- **Meilisearch Integration**: Advanced product search with category faceting and real-time sync
- **Automatic Product Sync**: Products sync to Meilisearch on create/update via event subscribers
- **Custom Modules**: Complete ERP functionality with Offer, Supplier, Manual Customer, and Service modules
- **Transactional Emails**: Pre-configured email templates for orders, offers, and customer communications
- **Tax-Inclusive Pricing**: German tax-inclusive pricing with "inkl. MwSt." display
- **Stripe Payment Integration**: Best practices compliant with webhook-driven order completion
- **PDF Generation**: DIN 5008 compliant PDFs for offers and invoices using Puppeteer

## Custom Modules

This backend includes several custom modules built for ERP functionality:

### [Offer Module](./src/modules/offer/README.md)

Complete offer/quotation management system with:

- Automatic offer numbering (ANG-00001, ANG-00002, etc.)
- Status workflow management (draft → active → accepted → completed)
- Inventory reservation and release (manual and automatic)
- PDF generation (DIN 5008 compliant)
- Email notifications with preview functionality
- Product and service item support
- Bidirectional status transitions

### [Supplier Module](./src/modules/supplier/README.md)

Comprehensive supplier management with:

- Supplier information and contact management
- Multiple addresses per supplier
- Product-supplier relationships with pricing
- Lead time and delivery time tracking
- CSV import support (JTL VAP format compatible)

### [Manual Customer Module](./src/modules/manual-customer/README.md)

Flexible customer management for:

- Legacy customers from other systems
- Walk-in customers without email addresses
- Business customers with incomplete information
- Customer linking to core Medusa customers
- Purchase history tracking

### [Service Module](./src/modules/service/README.md)

Service catalog management with:

- Service categorization and types
- Flexible pricing (base price or hourly rate)
- Service requirements tracking
- Integration with offers

## Search Integration

### Meilisearch Configuration

Advanced product search powered by Meilisearch with:

- Real-time product synchronization via subscribers
- Category faceting and hierarchical filtering
- SKU and handle search support
- Product availability integration
- Automatic index management

### Required Environment Variables

For the backend (Medusa server), set these in GitHub repository secrets:

```bash
# Meilisearch connection (use internal Docker network URL)
MEILISEARCH_HOST=http://medusa_meilisearch:7700

# Master key for full access (backend needs write permissions)
MEILISEARCH_API_KEY=<your-master-key>
MEILISEARCH_MASTER_KEY=<same-master-key>

# Index names (optional, defaults to 'products' and 'categories')
MEILISEARCH_PRODUCT_INDEX_NAME=products
MEILISEARCH_CATEGORY_INDEX_NAME=categories

# Storefront URL for Meilisearch CORS (SINGLE domain only - no commas!)
STOREFRONT_URL=https://medusa-js-busbasisberlin-storefront.vercel.app
```

**Important:** `MEILISEARCH_API_KEY` and `MEILISEARCH_MASTER_KEY` must match for the backend to have full read/write access.

For the storefront (Vercel), set these in Vercel environment variables:

```bash
# Public Meilisearch endpoint (use public domain)
NEXT_PUBLIC_MEILISEARCH_HOST=https://your-domain.de/meilisearch

# Read-only search API key (never use master key in frontend!)
NEXT_PUBLIC_MEILISEARCH_API_KEY=<read-only-search-key>
```

### Creating a Search-Only API Key

To create a read-only key for the storefront, run in Meilisearch container:

```bash
curl -X POST 'http://localhost:7700/keys' \
  -H 'Authorization: Bearer <MASTER_KEY>' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "description": "Search-only key for storefront",
    "actions": ["search"],
    "indexes": ["products", "categories"],
    "expiresAt": null
  }'
```

### Event-Driven Sync Architecture

Product data flows to Meilisearch automatically:

```
Product Update → product.updated event → OfferModule Subscriber → Meilisearch Index
```

Subscribers are located in [`src/subscribers/`](./src/subscribers/) and handle:
- Product creation and updates
- Inventory changes
- Category modifications
- Automatic index updates

See [`src/subscribers/README.md`](./src/subscribers/README.md) for detailed subscriber documentation.

## Transactional Emails

The backend includes pre-configured transactional email templates using React Email and Resend.

### Quick Start

**Preview all templates** (recommended first step):

```bash
npm run dev:email
# Open browser to: http://localhost:3000
```

### Email Templates

**Order Lifecycle (4):**
1. ✅ **order-placed** - Order confirmation
2. ✅ **order-shipped** - Shipping confirmation with tracking
3. ✅ **order-delivered** - Delivery confirmation
4. ✅ **order-cancelled** - Cancellation & refund

**User Management (2):**
5. ✅ **reset-password** - Password reset link
6. ✅ **user-invited** - Admin team invitation

**Offers (4):**
7. ✅ **offer-active** - Offer ready notification
8. ✅ **offer-accepted** - Offer acceptance confirmation
9. ✅ **offer-completed** - Completion notification
10. ✅ **offer-cancelled** - Cancellation notice

All emails include:

- Company branding and styling
- Responsive design
- German language support
- PDF attachments (for offers and invoices)
- Unified branding with configurable colors

### Email Configuration

Configure notification preferences via Admin UI:

1. Navigate to: **Settings** → **Offer Email Notifications**
2. Toggle notifications ON/OFF for each status
3. Default settings:
   - Offer Active: ON ✅
   - Offer Accepted: ON ✅
   - Offer Completed: ON ✅
   - Offer Created: OFF
   - Offer Cancelled: OFF

### Required Environment Variables

```bash
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Company branding (for emails and PDFs)
COMPANY_NAME="Your Company Name"
COMPANY_EMAIL=info@yourdomain.com
COMPANY_PHONE="+49 30 12345678"
COMPANY_ADDRESS="Street 123"
COMPANY_POSTAL_CODE="12345"
COMPANY_CITY="Berlin"
COMPANY_LOGO_URL=https://yourdomain.com/logo.png
BRAND_PRIMARY_COLOR="#000000"
BRAND_SECONDARY_COLOR="#666666"
```

See all email templates in [`src/modules/resend/emails/`](./src/modules/resend/emails/).

## Payment Integration

### Stripe Configuration

The backend uses Stripe for payment processing with best practices:

**✅ Webhook as Source of Truth:**
- Webhooks are authoritative for payment status
- Handles race conditions between webhook and redirect
- Redirect callback provides UX fallback only

**✅ Payment Intent Lifecycle:**
- Handles all PaymentIntent states correctly
- Never attempts to cancel succeeded intents
- Webhook processes async state changes

**Required Environment Variables:**

```bash
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Required Webhook Events** (configure in Stripe Dashboard):

```
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.amount_capturable_updated
payment_intent.requires_action
payment_intent.processing
```

**Webhook URL:** `https://your-domain.de/hooks/payment/stripe`

The redirect callback at `/api/capture-payment/[cartId]` handles:
- Payment validation before order placement
- Race conditions with webhook completion
- Graceful error handling for async payment methods

### Capture Strategy

Current configuration: **Auto-capture enabled** (`capture: true`)

This is appropriate for:
- Standard card payments
- Immediate payment confirmation
- Real-time order fulfillment

For delayed confirmation methods (bank transfer, etc.), the system:
- Places order immediately
- Webhook completes payment when confirmed
- Order status updates automatically

## Tax Configuration

### German Tax-Inclusive Pricing

All prices display with "inkl. MwSt." (including VAT):

**Implementation:**
- Product prices use `calculated_amount_with_tax`
- `country_code` parameter ensures correct tax calculation
- Tax rates: 19% standard, 7% reduced (books, food)

**Key Files:**
- `src/lib/data/products.ts` - Adds `country_code` to API calls
- `src/lib/util/get-product-price.ts` - Uses tax-inclusive amounts
- Price components display "inkl. MwSt." label

**Cart Tax Calculation:**
- Medusa calculates taxes with full address
- Until checkout, estimated tax shown
- Final tax calculated at payment step

**Tax Provider:**
- Uses Medusa's built-in tax calculation
- Configured per region (Germany: 19%, 7%)
- Automatic tax code assignment

## PDF Generation

### DIN 5008 Compliant Documents

Offers and invoices generate as professional PDFs:

**Features:**
- German DIN 5008 business letter standard
- Company branding and logo
- Line item tables with SKU and pricing
- Terms and conditions footer
- Privacy policy footer
- Automatic PDF attachment to emails

**Implementation:**
- Uses Puppeteer with Alpine Chromium
- HTML templates rendered to PDF
- Async generation with error handling
- Proper resource cleanup (prevents zombie processes)

**Environment Variables:**

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# PDF footer content
PDF_FOOTER_TEXT="Impressum: ..."
COMPANY_TAX_ID="DE123456789"
COMPANY_BANK_INFO="Bank Details..."
```

**Resource Management:**
- Pages explicitly closed after generation
- Browser instances properly disposed
- Prevents zombie Chromium processes
- Docker Alpine image includes Chromium + dependencies

See [`src/utils/pdf-generator.ts`](./src/utils/pdf-generator.ts) for implementation.

## Maintenance Scripts

### Pre-Deployment Testing

**⚠️ Always run this before deploying** to catch nginx configuration issues early (saves 20+ minutes per failed deployment):

```bash
./scripts/test-nginx-config.sh
```

This validates:

- ✅ CORS map directive exists
- ✅ Using `$cors_origin` variable (not comma-separated list)
- ✅ X-Meilisearch-Client header allowed
- ✅ /search/ location properly configured
- ✅ Nginx syntax is valid

### Deployment Scripts

- `scripts/setup-vps.sh` - Complete VPS setup including SSL and Docker
- `scripts/deploy.sh` - Blue-green deployment with rollback support
- `scripts/deploy-with-domain.sh` - Domain-specific deployment wrapper
- `scripts/cleanup-disk.sh` - Automated disk space management

### Database Scripts

Execute scripts using Medusa CLI:

```bash
# Assign default shipping profiles to all products
npx medusa exec ./src/scripts/assign-default-shipping-profile.js

# Clean up orphaned S3 files
npx medusa exec ./src/scripts/cleanup-s3-files.ts
```

**Available Scripts:**
- `assign-default-shipping-profile.ts` - Fixes products without shipping profiles
- `cleanup-s3-files.ts` - Removes orphaned Supabase Storage files
- `import-products-with-relations.ts` - CSV import with categories and suppliers

See [`src/scripts/README.md`](./src/scripts/README.md) for detailed script documentation.

### Cleanup Orphaned S3 Files

To clean up orphaned files in your Supabase Storage that are no longer referenced by any product:

```bash
npx medusa exec ./src/scripts/cleanup-s3-files.ts
```

This script:
- Scans all products for image references
- Compares with files in storage bucket
- Removes unreferenced files
- Logs all deletions for audit trail

## Deployment

### Blue-Green Deployment Strategy

The backend uses blue-green deployments for zero-downtime updates:

**Architecture:**
- Two identical environments (blue/green)
- Only one active at a time
- Health checks before switching
- Automatic rollback on failure

**Deployment Flow:**

1. **Build Phase** (~19 minutes with Phase 1 optimizations)
   - Docker image build with BuildKit
   - Production dependencies only
   - Multi-stage build for optimization

2. **Deploy Phase**
   - Start new environment (blue or green)
   - Wait for health checks (max 12 minutes)
   - Switch Nginx to new environment
   - Stop old environment

3. **Rollback** (if needed)
   - Automatic on health check failure
   - Manual via `./scripts/deploy.sh rollback`
   - Switches back to previous environment

**Current Optimization:** Phase 1 applied (19 min deployments, 13% faster)

See [Deployment Optimization Docs](../deployment/) for Phase 2 strategies.

### Deployment Sequencing

To prevent frontend build failures, the deployment is sequenced:

1. **Backend deploys first** (blue-green, ~19 mins)
2. **Vercel auto-deploys after** backend completes via deploy hook

### Setup Vercel Deploy Hook

1. Go to Vercel → Project Settings → Git → Deploy Hooks
2. Create a new deploy hook (name: "Backend Deploy Trigger")
3. Copy the webhook URL
4. Add to GitHub Secrets as `VERCEL_DEPLOY_HOOK`
5. **Disable auto-deploy in Vercel:** Settings → Git → Ignored Build Step → `exit 1`

This ensures frontend always builds against a stable backend.

### Required GitHub Secrets

Complete list of required secrets for deployment:

```bash
# Domain & SSL
DOMAIN_NAME=your-domain.de
SSL_CERT_NAME=fullchain.pem
SSL_KEY_NAME=privkey.pem

# Database
POSTGRES_PASSWORD=secure_password

# Medusa Core
JWT_SECRET=jwt_secret_key
COOKIE_SECRET=cookie_secret_key

# Email
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@your-domain.de

# Storage (Supabase)
S3_ACCESS_KEY_ID=xxxxx
S3_SECRET_ACCESS_KEY=xxxxx
S3_REGION=eu-central-1
S3_BUCKET=your-bucket
S3_ENDPOINT=https://xxxxx.supabase.co/storage/v1
S3_FILE_URL=https://xxxxx.supabase.co/storage/v1/object/public/

# Meilisearch
MEILISEARCH_HOST=http://medusa_meilisearch:7700
MEILISEARCH_MASTER_KEY=your_master_key
MEILISEARCH_API_KEY=your_api_key
MEILISEARCH_PRODUCT_INDEX_NAME=products

# Payment
STRIPE_API_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Company Info
COMPANY_NAME="Your Company"
COMPANY_EMAIL=info@your-domain.de
COMPANY_PHONE="+49 30 12345678"
COMPANY_ADDRESS="Street 123"
COMPANY_POSTAL_CODE="12345"
COMPANY_CITY="Berlin"
COMPANY_TAX_ID="DE123456789"
COMPANY_BANK_INFO="Bank Details"
COMPANY_LOGO_URL=https://your-domain.de/logo.png
COMPANY_SUPPORT_EMAIL=support@your-domain.de
BRAND_PRIMARY_COLOR="#000000"
BRAND_SECONDARY_COLOR="#666666"

# URLs
MEDUSA_BACKEND_URL=https://your-domain.de
STOREFRONT_URL=https://storefront.vercel.app
STORE_CORS=https://storefront.vercel.app,http://localhost:8000
ADMIN_CORS=https://your-domain.de
AUTH_CORS=https://your-domain.de

# Email Content
PDF_FOOTER_TEXT="Your footer text"
EMAIL_SIGNATURE="Your signature"
EMAIL_FOOTER="Your email footer"

# Vercel Integration
VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/xxxxx
```

Use `./setup-deployment/set-github-secrets.sh` to set all secrets at once.

## What is Medusa

Medusa is a set of commerce modules and tools that allow you to build rich, reliable, and performant commerce applications without reinventing core commerce logic. The modules can be customized and used to build advanced ecommerce stores, marketplaces, or any product that needs foundational commerce primitives. All modules are open-source and freely available on npm.

Learn more about [Medusa's architecture](https://docs.medusajs.com/learn/introduction/architecture) and [commerce modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules) in the Docs.

## Community & Contributions

The community and core team are available in [GitHub Discussions](https://github.com/medusajs/medusa/discussions), where you can ask for support, discuss roadmap, and share ideas.

Join our [Discord server](https://discord.com/invite/medusajs) to meet other community members.

## Other channels

- [GitHub Issues](https://github.com/medusajs/medusa/issues)
- [Twitter](https://twitter.com/medusajs)
- [LinkedIn](https://www.linkedin.com/company/medusajs)
- [Medusa Blog](https://medusajs.com/blog/)
