# BusBasisBerlin - MedusaJS E-commerce Monorepo

A full-stack e-commerce application built with MedusaJS (backend) and Next.js (frontend).

## 🏗️ Project Structure

```
MedusaJS/
├── busbasisberlin/              # MedusaJS Backend API
│   ├── src/                     # Source code
│   │   ├── admin/               # Admin UI routes & components
│   │   ├── api/                 # API routes
│   │   ├── modules/             # Custom modules (Blog, Supplier)
│   │   └── scripts/             # Database scripts
│   ├── .eslintrc.js            # ESLint configuration
│   ├── .prettierrc             # Prettier configuration
│   └── package.json            # Backend dependencies
├── busbasisberlin-storefront/   # Next.js Frontend
│   ├── src/                     # Source code
│   │   ├── app/                 # Next.js App Router
│   │   ├── modules/             # UI components & templates
│   │   └── lib/                 # Utilities & data fetching
│   └── package.json            # Frontend dependencies
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

### Supplier Management
- Complete CRUD operations
- Comprehensive supplier information tracking
- Admin UI integration

### Blog System
- Content management
- SEO optimization
- Admin interface

## 🔗 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run format` | Format entire monorepo |
| `npm run format:backend` | Format backend only |
| `npm run format:frontend` | Format frontend only |
| `npm run lint` | Lint entire monorepo |
| `npm run format:all` | Format + lint everything |
| `npm run dev:backend` | Start backend dev server |
| `npm run dev:frontend` | Start frontend dev server |
| `npm run build:backend` | Build backend |
| `npm run build:frontend` | Build frontend |

## 📝 Development Workflow

1. **Make your changes** in any file
2. **Save the file** - VSCode auto-formats
3. **Or run manual format**: `npm run format`
4. **Commit clean code** with consistent formatting

---

*Built with ❤️ for BusBasisBerlin*