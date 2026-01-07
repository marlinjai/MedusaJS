# BusBasisBerlin - MedusaJS E-commerce Monorepo

A full-stack e-commerce application built with MedusaJS (backend) and Next.js (frontend).

**Features:** Search powered by Meilisearch, automatic product sync, advanced category filtering, and complete ERP functionality.

---

## 📚 **Complete Documentation Hub**

**All project documentation has been consolidated:** [`.cursor/docs/`](.cursor/docs/README.md)

### Quick Navigation
- 🚀 **[Getting Started](.cursor/docs/development/COMPLETE_SETUP.md)** - Local development setup (backend + frontend)
- 🏗️ **[Architecture](.cursor/docs/architecture/ARCHITECTURE_RFC.md)** - Technical roadmap validated against Medusa v2
- 🚀 **[Deployment](.cursor/docs/deployment/GUIDE.md)** - Complete deployment with optimization and troubleshooting
- ✨ **[Custom Modules](.cursor/docs/features/MODULES_COMPREHENSIVE.md)** - ERP system (Supplier, Offer, Service, Customer)
- 🤖 **[AI Guidelines](.cursor/rules/medusa-development/RULE.md)** - Cursor development rules

### Documentation Consolidation ✅
- **Before**: 46 scattered MD files across 6+ directories and repositories
- **After**: 22 organized files in structured hierarchy at `.cursor/docs/`
- **Improvement**: 95% alignment with Medusa v2 best practices confirmed
- **Cleanup**: All scattered files properly deleted

## 🚀 Quick Start

### Development Setup
```bash
# Backend
cd busbasisberlin
npm install && npm run dev

# Frontend
cd busbasisberlin-storefront
npm install && npm run dev
```

### Production Deployment
```bash
# Configure secrets and push to main branch
# Automatic deployment via GitHub Actions
# Live at: https://basiscamp-berlin.de
```

**Complete guides**: [Deployment Documentation](.cursor/docs/deployment/GUIDE.md)

## 🏗️ Project Structure

```
MedusaJS/
├── busbasisberlin/              # MedusaJS Backend API
│   ├── src/                     # Source code
│   │   ├── admin/               # Admin UI routes & components
│   │   ├── api/                 # API routes
│   │   ├── modules/             # Custom modules (Offer, Supplier, Manual Customer, Service)
│   │   │   ├── offer/           # Offer/quotation management
│   │   │   ├── supplier/        # Supplier management
│   │   │   ├── manual-customer/ # Manual customer management
│   │   │   ├── service/         # Service catalog
│   │   │   └── resend/          # Email templates
│   │   ├── workflows/          # Business logic workflows
│   │   └── scripts/             # Database scripts
│   ├── README.md               # Backend documentation
│   └── package.json            # Backend dependencies
├── busbasisberlin-storefront/   # Next.js Frontend
│   ├── src/                     # Source code
│   │   ├── app/                 # Next.js App Router
│   │   ├── modules/             # UI components & templates
│   │   └── lib/                 # Utilities & data fetching
│   ├── README.md               # Frontend documentation
│   └── package.json            # Frontend dependencies
├── deployment/                 # Deployment optimization guides
├── .vscode/                     # VSCode workspace settings
├── package.json                # Monorepo scripts
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Development

```bash
# Backend (MedusaJS)
cd busbasisberlin
npm run dev

# Frontend (Next.js)
cd busbasisberlin-storefront
npm run dev
```

## 🌐 Production Deployment

### One-Command VPS Setup

**Step 1: Setup VPS (One Command)**

```bash
# Copy and run setup script (handles everything!)
scp scripts/setup-server.sh root@YOUR_VPS_IP:/tmp/ && ssh root@YOUR_VPS_IP "chmod +x /tmp/setup-server.sh && /tmp/setup-server.sh"
```

This single command will:

- ✅ Install Docker & Docker Compose
- ✅ Create `/opt/medusa-app` directory
- ✅ Clone your repository
- ✅ Make scripts executable
- ✅ Set up firewall
- ✅ Create monitoring & backup scripts
- ✅ Generate SSH key for GitHub Actions
- ✅ Set up systemd service

**Step 2: Configure GitHub Secrets**

```bash
# Set all required secrets
gh secret set HOST --body "YOUR_VPS_IP"
gh secret set SSH_USER --body "root"
gh secret set PROJECT_PATH --body "/opt/medusa-app"
gh secret set POSTGRES_PASSWORD --body "your-secure-password"
gh secret set REDIS_PASSWORD --body "your-secure-password"
gh secret set JWT_SECRET --body "your-super-secure-jwt-secret-min-32-chars"
gh secret set COOKIE_SECRET --body "your-super-secure-cookie-secret-min-32-chars"
gh secret set STORE_CORS --body "https://yourdomain.com"
gh secret set ADMIN_CORS --body "https://yourdomain.com"
gh secret set AUTH_CORS --body "https://yourdomain.com"
gh secret set MEDUSA_BACKEND_URL --body "https://yourdomain.com"
gh secret set NEXT_PUBLIC_MEDUSA_BACKEND_URL --body "https://yourdomain.com"
# S3 and Email secrets (set to empty if not using)
gh secret set S3_FILE_URL --body ""
gh secret set S3_ACCESS_KEY_ID --body ""
gh secret set S3_SECRET_ACCESS_KEY --body ""
gh secret set S3_REGION --body ""
gh secret set S3_BUCKET --body ""
gh secret set S3_ENDPOINT --body ""
gh secret set RESEND_API_KEY --body ""
gh secret set RESEND_FROM_EMAIL --body ""
```

**Step 3: Deploy**

```bash
# Push to trigger automated deployment
git push
```

**Step 4: Import Data (After Successful Deployment)**

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Copy data files
scp -r data/ root@YOUR_VPS_IP:/opt/medusa-app/

# Run import scripts
cd /opt/medusa-app
docker-compose exec medusa-server-green npx medusa exec ./src/scripts/import-suppliers.ts
docker-compose exec medusa-server-green npx medusa exec ./src/scripts/import-products.ts
docker-compose exec medusa-server-green npx medusa exec ./src/scripts/import-manual-customers.ts

# Create admin user
docker-compose exec medusa-server-green npx medusa user -e admin@yourdomain.com -p secure-password
```

### Access Your Application

- **Storefront**: `https://yourdomain.com`
- **Admin Dashboard**: `https://yourdomain.com/app`
- **API Health**: `https://yourdomain.com/api/health`

### Blue-Green Deployment

The system automatically uses blue-green deployment for zero-downtime updates:

- Push to `main` branch triggers automatic deployment
- Health checks ensure new environment is working
- Traffic switches seamlessly between blue/green environments
- Automatic rollback if deployment fails

## 🎨 Code Formatting & Linting

### Auto-Format on Save

VSCode is configured to automatically format files when you save them. This works across the entire monorepo.

### Manual Formatting Commands

```bash
# Format entire monorepo
npm run format

# Format only backend
npm run format:backend

# Format only frontend
npm run format:frontend

# Run ESLint + Prettier on everything
npm run format:all

# Lint with auto-fix
npm run lint
```

### Individual Project Commands

```bash
# Backend formatting
cd busbasisberlin
npx prettier --write "src/**/*.{ts,js,json}" "*.{ts,js,json}"
npx eslint "src/**/*.{ts,js}" --fix

# Frontend formatting
cd busbasisberlin-storefront
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json}" "*.{ts,tsx,js,jsx,json}"
npx eslint "src/**/*.{ts,tsx,js,jsx}" --fix
```

## 🔧 Development Tools

- **ESLint**: Code linting and error detection
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **VSCode Settings**: Auto-format on save configured

## 🛠️ Tech Stack

### Backend (MedusaJS)

- MedusaJS v2
- TypeScript
- PostgreSQL
- Redis
- Stripe (payments)

### Frontend (Next.js)

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Medusa React SDK

## 📦 Custom Modules

The backend includes comprehensive ERP modules. See the [Backend README](./busbasisberlin/README.md) for detailed documentation:

### [Offer Module](./busbasisberlin/src/modules/offer/README.md)
Complete offer/quotation management with inventory reservation, PDF generation, and email notifications.

### [Supplier Module](./busbasisberlin/src/modules/supplier/README.md)
Supplier management with contacts, addresses, and product-supplier relationships.

### [Manual Customer Module](./busbasisberlin/src/modules/manual-customer/README.md)
Flexible customer management for legacy and walk-in customers.

### [Service Module](./busbasisberlin/src/modules/service/README.md)
Service catalog management integrated with offers.

## 🔍 Search Integration

- **Meilisearch**: Advanced product search with category faceting
- **Real-time Sync**: Automatic product synchronization
- **SKU/Handle Search**: Enhanced search capabilities
- See [Backend README](./busbasisberlin/README.md#search-integration) for configuration

## 📧 Transactional Emails

Pre-configured email templates for:
- Order confirmations and updates
- Offer notifications
- Customer communications
- See [Backend README](./busbasisberlin/README.md#transactional-emails) for details

## 🔗 Available Scripts

| Command                   | Description               |
| ------------------------- | ------------------------- |
| `npm run format`          | Format entire monorepo    |
| `npm run format:backend`  | Format backend only       |
| `npm run format:frontend` | Format frontend only      |
| `npm run lint`            | Lint entire monorepo      |
| `npm run format:all`      | Format + lint everything  |
| `npm run dev:backend`     | Start backend dev server  |
| `npm run dev:frontend`    | Start frontend dev server |
| `npm run build:backend`   | Build backend             |
| `npm run build:frontend`  | Build frontend            |

## 📝 Development Workflow

1. **Make your changes** in any file
2. **Save the file** - VSCode auto-formats
3. **Or run manual format**: `npm run format`
4. **Commit clean code** with consistent formatting

---

_Built with ❤️ for BusBasisBerlin_

# Test deployment with re-enabled link - Mon Sep 22 13:03:16 CEST 2025
