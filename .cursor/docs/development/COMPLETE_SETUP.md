# Complete Development Setup Guide

**Last Updated**: January 7, 2026
**Status**: Consolidated from 3 README files and module documentation

Complete guide for setting up the BusBasisBerlin monorepo for local development and understanding the project structure.

---

## Project Overview

BusBasisBerlin is a full-stack e-commerce application built with MedusaJS (backend) and Next.js (frontend), featuring advanced search via Meilisearch, custom ERP modules, and complete German e-commerce compliance.

**Live Application**: https://basiscamp-berlin.de

### Key Features

**Backend (MedusaJS)**:
- **Custom ERP Modules**: Supplier, Offer, Service, Manual Customer management
- **Meilisearch Integration**: Advanced product search with category faceting and real-time sync
- **Transactional Emails**: Pre-configured email templates for orders, offers, and communications
- **Tax-Inclusive Pricing**: German tax-inclusive pricing with "inkl. MwSt." display
- **Stripe Integration**: Best practices compliant with webhook-driven order completion
- **PDF Generation**: DIN 5008 compliant PDFs for offers and invoices using Puppeteer

**Frontend (Next.js)**:
- **Next.js 15**: Full App Router support with Server Components and streaming
- **Advanced Search**: Meilisearch integration for fast product search with faceting
- **German Language Support**: Full i18n implementation with next-intl
- **Legal Compliance**: Dedicated pages for Terms, Privacy Policy, Imprint
- **Responsive Design**: Mobile-first design with Tailwind CSS

---

## Prerequisites

### Required Software
- **Node.js**: 18+ (20 recommended)
- **PostgreSQL**: 14+
- **Redis**: 6+ (7 recommended)
- **Git**: Latest version

### Recommended Tools
- **Docker & Docker Compose**: For external services (optional)
- **VS Code**: With TypeScript and Tailwind CSS extensions
- **Postman/Insomnia**: For API testing

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space
- **OS**: macOS, Linux, or Windows with WSL2

---

## Project Structure

```
MedusaJS/
├── busbasisberlin/              # MedusaJS Backend API
│   ├── src/
│   │   ├── admin/               # Admin UI routes & components
│   │   │   ├── components/      # Shared UI components
│   │   │   ├── hooks/          # React hooks (useColumnVisibility)
│   │   │   ├── routes/         # Custom admin pages
│   │   │   └── widgets/        # Admin dashboard widgets
│   │   ├── api/                 # API routes
│   │   │   ├── admin/          # Admin API endpoints
│   │   │   └── store/          # Store API endpoints
│   │   ├── modules/             # Custom business modules
│   │   │   ├── offer/          # Offer/quotation management
│   │   │   ├── supplier/       # Supplier management
│   │   │   ├── manual-customer/ # Manual customer management
│   │   │   ├── service/        # Service catalog
│   │   │   └── resend/         # Email templates
│   │   ├── workflows/          # Business logic workflows
│   │   ├── subscribers/        # Event handlers
│   │   ├── utils/              # Shared utilities
│   │   └── scripts/            # Database and maintenance scripts
│   ├── docker-compose.*.yml     # Container orchestration
│   ├── Dockerfile              # Production container
│   └── package.json            # Backend dependencies
├── busbasisberlin-storefront/   # Next.js Frontend
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   │   ├── [countryCode]/  # Internationalized routes
│   │   │   └── globals.css     # Global styles
│   │   ├── modules/            # UI components and templates
│   │   │   ├── layout/         # Header, footer, navigation
│   │   │   ├── products/       # Product display components
│   │   │   ├── cart/           # Shopping cart
│   │   │   ├── checkout/       # Checkout flow
│   │   │   └── account/        # User account pages
│   │   ├── lib/                # Utilities and data fetching
│   │   │   ├── data/           # API client functions
│   │   │   └── util/           # Helper utilities
│   │   └── types/              # TypeScript type definitions
│   └── package.json            # Frontend dependencies
├── .cursor/                     # Documentation and rules
│   ├── docs/                   # Consolidated documentation
│   └── rules/                  # Cursor AI rules
└── scripts/                    # Deployment and setup scripts
```

---

## Backend Setup (MedusaJS)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/marlinjai/MedusaJS.git
cd MedusaJS/busbasisberlin

# Install dependencies (project uses npm)
npm install
```

### 2. Environment Configuration

**Create `.env` file**:
```bash
cp .env.example .env
```

**Configure essential variables**:
```env
# Database (adjust for your local PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/medusa_dev

# Redis (adjust for your local Redis)
REDIS_URL=redis://localhost:6379

# Medusa Core
JWT_SECRET=supersecret_jwt_key_for_development
COOKIE_SECRET=supersecret_cookie_key_for_development

# Storage (Supabase - get from project dashboard)
S3_ACCESS_KEY_ID=your_supabase_key
S3_SECRET_ACCESS_KEY=your_supabase_secret
S3_REGION=eu-central-1
S3_BUCKET=your_bucket_name
S3_ENDPOINT=https://xxxxx.supabase.co/storage/v1
S3_FILE_URL=https://xxxxx.supabase.co/storage/v1/object/public/

# Search (Meilisearch - optional for development)
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=development_key
MEILISEARCH_PRODUCT_INDEX_NAME=products

# Email (Resend - optional for development)
RESEND_API_KEY=re_your_development_key
RESEND_FROM_EMAIL=dev@yourdomain.com

# Company Information (for PDFs and emails)
COMPANY_NAME="Your Company Dev"
COMPANY_EMAIL=dev@yourdomain.com
COMPANY_PHONE="+49 30 12345678"
COMPANY_ADDRESS="Dev Street 123"
COMPANY_POSTAL_CODE="12345"
COMPANY_CITY="Berlin"
COMPANY_LOGO_URL=http://localhost:3000/logo.png

# Payment (Stripe - use test keys)
STRIPE_API_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_secret
```

### 3. Database Setup

**Option A: Local PostgreSQL**
```bash
# Create database
createdb medusa_dev

# Run migrations
npx medusa migrations run

# Create admin user
npx medusa user --email admin@example.com --password supersecret

# Seed data (optional)
npx medusa exec src/scripts/seed.ts
```

**Option B: Docker PostgreSQL**
```bash
# Start PostgreSQL in Docker
docker run -d \
  --name medusa_postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=medusa_dev \
  -p 5432:5432 \
  postgres:15

# Update .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/medusa_dev
```

### 4. External Services

**Redis** (required):
```bash
# Option A: Local Redis
brew install redis  # macOS
redis-server

# Option B: Docker Redis
docker run -d --name medusa_redis -p 6379:6379 redis:7-alpine
```

**Meilisearch** (optional for development):
```bash
# Docker Meilisearch
docker run -d \
  --name medusa_meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=development_master_key \
  getmeili/meilisearch:latest
```

### 5. Import Sample Data

**Custom modules data**:
```bash
# Import suppliers
npx medusa exec src/scripts/import-suppliers.ts

# Import services
npx medusa exec src/scripts/import-services.ts

# Import manual customers
npx medusa exec src/scripts/import-manual-customers.ts
```

### 6. Start Backend

```bash
# Development mode (with hot reload)
npm run dev

# Available at:
# - API: http://localhost:9000
# - Admin: http://localhost:9000/app
```

---

## Frontend Setup (Next.js)

### 1. Navigate and Install

```bash
cd ../busbasisberlin-storefront
npm install
```

### 2. Environment Configuration

**Create `.env.local`**:
```bash
cp .env.template .env.local
```

**Configure variables**:
```env
# Backend connection
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_BACKEND_URL=http://localhost:9000

# Cache revalidation
REVALIDATE_SECRET=supersecret_dev_key

# Search (if using Meilisearch)
NEXT_PUBLIC_MEILISEARCH_HOST=http://localhost:7700
NEXT_PUBLIC_MEILISEARCH_API_KEY=development_key
```

### 3. Start Frontend

```bash
# Development mode
npm run dev

# Available at: http://localhost:3000
```

**Frontend Features**:
- Full ecommerce support (products, cart, checkout, user accounts)
- Advanced search with category faceting
- German language support with tax-inclusive pricing
- Legal compliance pages (Terms, Privacy, Imprint)
- Responsive design optimized for mobile

---

## Development Workflow

### Daily Development

**Start all services**:
```bash
# Terminal 1: Backend
cd busbasisberlin
npm run dev

# Terminal 2: Frontend
cd busbasisberlin-storefront
npm run dev

# Terminal 3: External services (if using Docker)
docker start medusa_postgres medusa_redis medusa_meilisearch
```

### Testing Your Setup

**Backend Health Check**:
```bash
curl http://localhost:9000/health
# Expected: {"status":"ok"}
```

**Admin Dashboard**:
- Open: http://localhost:9000/app
- Login with admin credentials
- Should see dashboard with custom modules:
  - Suppliers (`/app/lieferanten`)
  - Offers (`/app/offers`)
  - Services (`/app/services`)
  - Manual Customers (`/app/manual-customers`)

**Frontend Health Check**:
- Open: http://localhost:3000
- Should see homepage with products
- Search should work (if Meilisearch configured)
- Language switching should work (German ↔ English)

**Integration Testing**:
1. **Product Management**: Create product in admin → should appear in storefront
2. **Order Flow**: Place test order in storefront → should appear in admin orders
3. **Custom Modules**: Create supplier/offer/service → should save and display correctly
4. **PDF Generation**: Create offer → generate PDF → should work with Chromium

---

## Custom Modules Development

### Module Structure

Each module (`src/modules/[name]/`) includes:
- **models/**: Data models and TypeScript types
- **services/**: Business logic and database operations
- **workflows/**: Complex multi-step operations
- **migrations/**: Database schema changes
- **admin/**: Custom admin UI routes (if applicable)

### Development Patterns

**Service Layer**:
```typescript
// src/modules/supplier/services/supplier.ts
export class SupplierService {
  async list(filters: FilterOptions): Promise<ListResult> {
    // Implement with pagination, search, sorting
  }

  async create(data: CreateSupplierInput): Promise<Supplier> {
    // Validate, create, emit events
  }
}
```

**Workflow Pattern**:
```typescript
// src/workflows/offer/create-offer.ts
export const createOfferWorkflow = createWorkflow(
  'create-offer',
  function (input: CreateOfferInput) {
    const offer = createOfferStep(input);
    const reservations = reserveInventoryStep(offer);
    const pdf = generatePdfStep(offer);
    return new WorkflowResponse({ offer, reservations, pdf });
  }
);
```

**Admin UI Pattern**:
```typescript
// src/admin/routes/suppliers/page.tsx
export default function SuppliersPage() {
  // Use React Query for data fetching
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', filters],
    queryFn: () => fetch('/admin/suppliers').then(res => res.json())
  });

  // Use shared components
  const { visibleColumns, toggleColumn } = useColumnVisibility({
    storageKey: 'suppliers-columns',
    defaultVisibleColumns: ['company', 'status', 'actions']
  });

  return <SupplierTable data={data} visibleColumns={visibleColumns} />;
}
```

---

## Database Management

### Migrations

**After model changes**:
```bash
# Generate migration for specific module
npx medusa db:generate MODULE_NAME

# Run all pending migrations
npx medusa migrations run

# Check migration status
npx medusa migrations show
```

**Custom module migrations**:
```bash
# Each module has its own migrations
src/modules/supplier/migrations/
src/modules/offer/migrations/
src/modules/service/migrations/
src/modules/manual-customer/migrations/
```

### Database Scripts

**Available scripts** (run with `npx medusa exec`):
- `src/scripts/assign-default-shipping-profile.ts` - Fix products without shipping profiles
- `src/scripts/cleanup-s3-files.ts` - Remove orphaned Supabase Storage files
- `src/scripts/import-products.ts` - CSV import with categories and suppliers
- `src/scripts/import-suppliers.ts` - Import supplier data from CSV
- `src/scripts/import-services.ts` - Import service catalog
- `src/scripts/seed.ts` - Generate sample data for development

### Development Database

**Reset development data**:
```bash
# Complete reset
dropdb medusa_dev
createdb medusa_dev
npx medusa migrations run
npx medusa exec src/scripts/seed.ts

# Or use shortcut (if configured)
npm run db:reset
npm run seed
```

**View database**:
```bash
# Connect to database
psql medusa_dev

# Check custom module tables
\dt supplier*
\dt offer*
\dt service*
\dt manual_customer*

# Sample data queries
SELECT company, status FROM supplier LIMIT 5;
SELECT offer_number, status FROM offer LIMIT 5;
```

---

## External Services Integration

### Meilisearch (Search Engine)

**Setup for development**:
```bash
# Docker setup (recommended)
docker run -d \
  --name medusa_meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=development_master_key \
  getmeili/meilisearch:latest
```

**Configuration**:
- Real-time product synchronization via subscribers
- Category faceting and hierarchical filtering
- SKU and handle search support
- Product availability integration
- Automatic index management

**Verification**:
```bash
# Check health
curl http://localhost:7700/health

# List indexes (after running backend)
curl -H "Authorization: Bearer development_master_key" \
  http://localhost:7700/indexes
```

### Supabase Storage

**Setup**:
1. Create Supabase project at https://supabase.com
2. Go to Storage → Create bucket (public)
3. Get API keys from Settings → API
4. Update `.env` with credentials

**Usage**:
- Product image storage
- PDF document storage (offers, invoices)
- Automatic cleanup of orphaned files

### Stripe Payment Integration

**Development setup**:
1. Create Stripe account (free)
2. Get test API keys from Dashboard
3. Configure webhook endpoints for local testing

**Test configuration**:
```env
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

**Webhook events** (configure in Stripe Dashboard):
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.amount_capturable_updated`

**Test payments**:
- Use test card: `4242424242424242`
- Any future expiry date
- Any 3-digit CVC

### Resend Email Service

**Setup**:
1. Create Resend account
2. Get API key from dashboard
3. Configure sender domain

**Development configuration**:
```env
RESEND_API_KEY=re_your_development_key
RESEND_FROM_EMAIL=dev@yourdomain.com
```

**Email Templates**:
- Order lifecycle (placed, shipped, delivered, cancelled)
- User management (reset password, user invited)
- Offers (active, accepted, completed, cancelled)

**Preview templates**:
```bash
# Start email preview server
npm run dev:email
# Open http://localhost:3000
```

---

## Verification & Testing

### Backend Verification

**API Health**:
```bash
curl http://localhost:9000/health
# Should return: {"status":"ok"}
```

**Custom Module APIs**:
```bash
# Test all custom modules
curl http://localhost:9000/admin/suppliers
curl http://localhost:9000/admin/offers
curl http://localhost:9000/admin/services
curl http://localhost:9000/admin/manual-customers
```

**Admin Dashboard**:
- Navigate to: http://localhost:9000/app
- Should see custom modules in sidebar
- Test creating suppliers, offers, services

### Frontend Verification

**Storefront Features**:
- Homepage with product listings
- Product detail pages with images and pricing
- Search functionality (if Meilisearch configured)
- Shopping cart and checkout flow
- Language switching (German ↔ English)
- Legal pages (Terms, Privacy, Imprint)

**Integration Testing**:
1. Create product in admin → verify appears in storefront
2. Place test order → verify appears in admin
3. Test search → verify Meilisearch indexing works
4. Test email → verify Resend integration works

---

## Development Tools

### Email Development

**Preview all templates**:
```bash
npm run dev:email
# Open browser to: http://localhost:3000
```

**Available templates**:
- Order Lifecycle (4 templates)
- User Management (2 templates)
- Offers (4 templates)

### PDF Development

**Test PDF generation**:
- Create offer in admin
- Generate PDF
- Should work with local Chromium installation

**PDF features**:
- DIN 5008 compliant German business documents
- Company branding and styling
- Automatic caching and S3 storage

### Database Tools

**Useful commands**:
```bash
# Check migration status
npx medusa migrations show

# Generate new migration
npx medusa db:generate MODULE_NAME

# Execute database scripts
npx medusa exec src/scripts/script-name.ts

# Backup database (production)
./scripts/backup-database.sh
```

---

## Troubleshooting

### Common Development Issues

**Backend won't start**:
1. Check PostgreSQL: `pg_isready`
2. Check Redis: `redis-cli ping`
3. Verify `.env` database URL
4. Check logs for specific errors

**Frontend won't start**:
1. Verify backend running on port 9000
2. Check `.env.local` backend URL
3. Clear Next.js cache: `rm -rf .next`
4. Reinstall: `rm -rf node_modules && npm install`

**Custom modules not loading**:
1. Verify module registration in `medusa-config.ts`
2. Check module exports in `src/modules/*/index.ts`
3. Ensure all dependencies installed
4. Check database migrations ran

**Meilisearch not working**:
1. Verify Meilisearch container running
2. Check API key configuration
3. Verify product sync subscribers are working
4. Check index creation in Meilisearch dashboard

### Performance Tips

**Development performance**:
- Keep Redis running (improves caching)
- Use `npm run dev` for hot reload
- Enable Turbopack for frontend: `npm run dev --turbo`

**Database performance**:
```sql
-- Add development indexes
CREATE INDEX IF NOT EXISTS idx_product_status ON product(status);
CREATE INDEX IF NOT EXISTS idx_supplier_company ON supplier(company);
CREATE INDEX IF NOT EXISTS idx_offer_status ON offer(status);
```

---

## Next Steps

After successful setup:

1. **Explore the admin dashboard**: http://localhost:9000/app
2. **Test custom modules**: Create suppliers, offers, services
3. **Review the storefront**: http://localhost:3000
4. **Read development patterns**: [Architecture RFC](../architecture/ARCHITECTURE_RFC.md)
5. **Check coding standards**: [Coding Standards](../architecture/CODING_STANDARDS.md)

For production deployment, see the [Deployment Guide](../deployment/GUIDE.md).

---

This comprehensive setup guide consolidates all setup information from the original README files while maintaining complete coverage of all features and requirements.
