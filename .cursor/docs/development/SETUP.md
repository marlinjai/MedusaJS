# Local Development Setup Guide

**Last Updated**: January 7, 2026
**Status**: Consolidated from multiple README files

Complete guide for setting up the BusBasisBerlin project for local development.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup (Medusa)](#backend-setup-medusa)
3. [Frontend Setup (Next.js)](#frontend-setup-nextjs)
4. [Database Setup](#database-setup)
5. [External Services](#external-services)
6. [Verification](#verification)

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

## Backend Setup (Medusa)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/marlinjai/MedusaJS.git
cd MedusaJS/busbasisberlin

# Install dependencies
npm install
```

### 2. Environment Configuration

**Create `.env` file**:
```bash
cp .env.example .env
```

**Configure environment variables**:
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

### 4. External Services Setup

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

### 5. Start Backend

```bash
# Development mode (with hot reload)
npm run dev

# The backend will be available at:
# - API: http://localhost:9000
# - Admin: http://localhost:9000/app
```

---

## Frontend Setup (Next.js)

### 1. Navigate to Storefront

```bash
cd ../busbasisberlin-storefront
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

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

# Analytics (optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=GA-XXXXXXX
```

### 4. Start Frontend

```bash
# Development mode
npm run dev

# The frontend will be available at:
# http://localhost:3000
```

---

## Database Setup

### Initial Setup

**1. Create database and run migrations**:
```bash
cd busbasisberlin
createdb medusa_dev
npx medusa migrations run
```

**2. Create admin user**:
```bash
npx medusa user --email admin@example.com --password supersecret
```

**3. Seed data (optional)**:
```bash
npx medusa exec src/scripts/seed.ts
```

### Custom Modules Setup

**Import sample data**:
```bash
# Import suppliers
npx medusa exec src/scripts/import-suppliers.ts

# Import services
npx medusa exec src/scripts/import-services.ts

# Import manual customers
npx medusa exec src/scripts/import-manual-customers.ts
```

### Database Management

**Reset database** (development only):
```bash
dropdb medusa_dev
createdb medusa_dev
npx medusa migrations run
npx medusa exec src/scripts/seed.ts
```

**View database**:
```bash
# Connect to database
psql medusa_dev

# List tables
\dt

# Check specific module data
SELECT * FROM supplier LIMIT 5;
SELECT * FROM offer LIMIT 5;
SELECT * FROM service LIMIT 5;
```

---

## External Services

### Meilisearch (Search Engine)

**Docker setup** (recommended):
```bash
docker run -d \
  --name medusa_meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=development_master_key \
  getmeili/meilisearch:latest
```

**Verify setup**:
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
4. Update `.env` with keys

**Test upload**:
```bash
# Upload test image via admin
# Go to http://localhost:9000/app/products
# Create product and upload image
```

### Stripe (Payment Processing)

**Development setup**:
1. Create Stripe account (free)
2. Get test API keys from Dashboard
3. Update `.env` with test keys:
   ```env
   STRIPE_API_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   ```

**Test payments**:
- Use test card numbers: `4242424242424242`
- Any future expiry date
- Any 3-digit CVC

### Resend (Email Service)

**Development setup**:
1. Create Resend account
2. Get API key from dashboard
3. Update `.env`:
   ```env
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=dev@yourdomain.com
   ```

**Test emails** (optional):
```bash
# Preview templates
npm run dev:email
# Open http://localhost:3000
```

---

## Verification

### Backend Health Check

**1. API Health**:
```bash
curl http://localhost:9000/health
# Should return: {"status":"ok"}
```

**2. Admin Dashboard**:
- Open: http://localhost:9000/app
- Login with admin credentials
- Should see dashboard with custom modules

**3. Custom Modules**:
```bash
# Test suppliers API
curl http://localhost:9000/admin/suppliers

# Test offers API
curl http://localhost:9000/admin/offers

# Test services API
curl http://localhost:9000/admin/services
```

### Frontend Health Check

**1. Storefront**:
- Open: http://localhost:3000
- Should see homepage with products
- Search should work (if Meilisearch configured)

**2. Product Pages**:
- Navigate to any product
- Should show details, images, pricing
- Add to cart should work

**3. Checkout Flow**:
- Add items to cart
- Go to checkout
- Should see Stripe payment form (test mode)

### Integration Testing

**1. Product Management**:
- Create product in admin: http://localhost:9000/app/products
- Should appear in storefront: http://localhost:3000
- Search should find it (if Meilisearch configured)

**2. Order Flow**:
- Place test order in storefront
- Should appear in admin orders
- Should trigger email (if Resend configured)

**3. Custom Modules**:
- Create supplier in admin
- Create offer in admin
- Generate PDF (should work with Chromium)

---

## Development Workflow

### Daily Development

**1. Start services**:
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

**2. Make changes**:
- Backend changes auto-reload
- Frontend changes auto-reload
- Database changes require migration

**3. Test changes**:
- Use admin dashboard for backend testing
- Use storefront for frontend testing
- Check browser console for errors

### Database Migrations

**After model changes**:
```bash
# Generate migration
npx medusa db:generate MODULE_NAME

# Run migration
npx medusa migrations run

# Verify migration
psql medusa_dev -c "\dt"
```

### Common Development Tasks

**Reset development data**:
```bash
npm run db:reset  # Drops and recreates database
npm run seed      # Adds sample data
```

**View logs**:
```bash
# Backend logs (in dev terminal)
# Frontend logs (in dev terminal)

# Check for errors:
# - Database connection issues
# - Redis connection issues
# - External service failures
```

**Debug API issues**:
```bash
# Test API endpoints
curl -X GET http://localhost:9000/admin/products
curl -X POST http://localhost:9000/admin/suppliers \
  -H "Content-Type: application/json" \
  -d '{"company": "Test Supplier"}'
```

---

## Troubleshooting

### Common Issues

**Backend won't start**:
1. Check PostgreSQL is running: `pg_isready`
2. Check Redis is running: `redis-cli ping`
3. Verify `.env` file has correct database URL
4. Check logs for specific error messages

**Frontend won't start**:
1. Verify backend is running on port 9000
2. Check `.env.local` has correct backend URL
3. Clear Next.js cache: `rm -rf .next`
4. Reinstall dependencies: `rm -rf node_modules && npm install`

**Database issues**:
```bash
# Reset database
dropdb medusa_dev
createdb medusa_dev
npx medusa migrations run

# Check migration status
npx medusa migrations show
```

**Module loading errors**:
```bash
# Verify module registration in medusa-config.ts
# Check module exports in src/modules/*/index.ts
# Ensure all dependencies are installed
```

### Getting Help

**For development issues**:
1. Check [Troubleshooting Guide](../deployment/TROUBLESHOOTING.md)
2. Review [Coding Standards](../architecture/CODING_STANDARDS.md)
3. Consult [Medusa Documentation](https://docs.medusajs.com)

**For deployment issues**:
1. See [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
2. Check [GitHub Secrets Setup](../deployment/GITHUB_SECRETS.md)

---

## Project Structure

### Backend (busbasisberlin/)
```
src/
├── admin/                   # Admin UI customizations
│   ├── components/          # Shared UI components
│   ├── hooks/              # React hooks (useColumnVisibility)
│   ├── routes/             # Custom admin pages
│   └── widgets/            # Admin dashboard widgets
├── api/                    # API route handlers
│   ├── admin/              # Admin API endpoints
│   ├── store/              # Store API endpoints
│   └── middlewares.ts      # Shared middleware
├── modules/                # Custom business modules
│   ├── supplier/           # Supplier management
│   ├── offer/              # Offer/quotation system
│   ├── service/            # Service catalog
│   ├── manual-customer/    # Legacy customer management
│   └── resend/             # Email templates
├── workflows/              # Business logic workflows
├── subscribers/            # Event handlers
├── utils/                  # Shared utilities
└── scripts/                # Database and maintenance scripts
```

### Frontend (busbasisberlin-storefront/)
```
src/
├── app/                    # Next.js App Router
│   ├── [countryCode]/      # Internationalized routes
│   ├── globals.css         # Global styles
│   └── layout.tsx          # Root layout
├── modules/                # UI components and templates
│   ├── layout/             # Header, footer, navigation
│   ├── products/           # Product display components
│   ├── cart/               # Shopping cart
│   ├── checkout/           # Checkout flow
│   └── account/            # User account pages
├── lib/                    # Utilities and data fetching
│   ├── data/               # API client functions
│   └── util/               # Helper utilities
└── types/                  # TypeScript type definitions
```

---

## Development Features

### Backend Features

**Custom Modules**:
- **Supplier Management**: Complete supplier database with contacts, addresses
- **Offer System**: Quotation management with PDF generation and email workflows
- **Service Catalog**: Service offerings with categorization and pricing
- **Manual Customers**: Legacy customer management for non-email customers

**Integrations**:
- **Meilisearch**: Real-time product search with category faceting
- **Stripe**: Payment processing with webhook-driven order completion
- **Resend**: Transactional emails with React Email templates
- **Supabase**: File storage for product images and PDFs

**Admin UI**:
- Custom admin pages for all modules
- Advanced product management with variant images
- Dynamic currency support based on store configuration
- Bulk operations and CSV import/export

### Frontend Features

**E-commerce**:
- Product catalog with search and filtering
- Shopping cart and checkout
- User accounts and order history
- Multi-language support (German/English)

**Technical**:
- Next.js 15 with App Router
- Server components and streaming
- Tax-inclusive pricing display
- Responsive design with Tailwind CSS

---

## Testing Your Setup

### Backend Testing

**1. Health Check**:
```bash
curl http://localhost:9000/health
# Expected: {"status":"ok"}
```

**2. Admin Login**:
- Go to: http://localhost:9000/app
- Login with your admin credentials
- Should see dashboard with custom modules

**3. Custom APIs**:
```bash
# Test suppliers
curl http://localhost:9000/admin/suppliers

# Test offers
curl http://localhost:9000/admin/offers

# Test services
curl http://localhost:9000/admin/services
```

**4. File Upload**:
- Go to Products → Create Product
- Upload an image
- Should save to Supabase storage

### Frontend Testing

**1. Homepage**:
- Open: http://localhost:3000
- Should see product listings
- Search should work

**2. Product Pages**:
- Click on any product
- Should show details, images, pricing
- Add to cart should work

**3. Checkout**:
- Add items to cart
- Go to checkout
- Should see Stripe test payment form

**4. Language Switching**:
- Switch between German/English
- Content should translate
- URLs should include language code

### Integration Testing

**1. Product Sync**:
- Create product in admin
- Should appear in storefront
- Should be searchable (if Meilisearch configured)

**2. Order Processing**:
- Place test order in storefront
- Should appear in admin orders
- Should trigger email (if Resend configured)

**3. PDF Generation**:
- Create offer in admin
- Generate PDF
- Should work with local Chromium

---

## Performance Tips

### Development Performance

**Backend**:
- Use `npm run dev` for hot reload
- Keep Redis running (caching improves response times)
- Use `--watch` flag for automatic restarts

**Frontend**:
- Use `npm run dev` for hot reload
- Enable Turbopack: `npm run dev --turbo`
- Use browser dev tools for debugging

### Database Performance

**Development database**:
```sql
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_status ON product(status);
CREATE INDEX IF NOT EXISTS idx_supplier_company ON supplier(company);
```

**Query monitoring**:
```bash
# Enable query logging in PostgreSQL (development only)
echo "log_statement = 'all'" >> /usr/local/var/postgresql@15/postgresql.conf
```

---

## Next Steps

After successful setup:

1. **Explore the admin dashboard**: http://localhost:9000/app
2. **Review custom modules**: Check suppliers, offers, services pages
3. **Test the storefront**: http://localhost:3000
4. **Read the coding standards**: [Coding Standards](../architecture/CODING_STANDARDS.md)
5. **Check the architecture**: [Architecture RFC](../architecture/ARCHITECTURE_RFC.md)

For deployment to production, see the [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md).

---

This setup guide gets you from zero to a fully functional development environment with all custom modules and integrations working.
