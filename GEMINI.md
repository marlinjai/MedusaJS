# GEMINI.md - Project Overview

This document provides a comprehensive overview of the BusBasisBerlin e-commerce project, intended to be used as a context for AI-powered development assistance.

## Project Overview

This is a monorepo containing a full-stack e-commerce application.

*   **Backend:** A [MedusaJS](https://medusajs.com/) server located in the `busbasisberlin` directory. It handles all business logic, data, and integrations.
*   **Frontend:** A [Next.js](https://nextjs.org/) storefront in the `busbasisberlin-storefront` directory, providing the user interface.
*   **Search:** [Meilisearch](https://www.meilisearch.com/) is integrated for powerful and fast product search capabilities.
*   **Database:** The primary database is PostgreSQL.
*   **Caching and Jobs:** Redis is used for caching, event bus, and background jobs.
*   **Deployment:** The application is deployed using a blue-green strategy with Docker, Nginx, and GitHub Actions for CI/CD.

## Key Technologies

*   **Monorepo:** Managed with npm workspaces.
*   **Backend:** MedusaJS (Node.js, TypeScript)
*   **Frontend:** Next.js (React, TypeScript)
*   **Database:** PostgreSQL
*   **Search:** Meilisearch
*   **Caching/Jobs:** Redis
*   **Deployment:** Docker, Nginx, GitHub Actions

## Building and Running

### Development

To run the application in a development environment, you need to run the backend and frontend separately.

**Run Backend (MedusaJS):**

```bash
cd busbasisberlin
npm run dev
```

**Run Frontend (Next.js):**

```bash
cd busbasisberlin-storefront
npm run dev
```

The root `package.json` also provides convenience scripts:

```bash
# Start backend dev server
npm run dev:backend

# Start frontend dev server
npm run dev:frontend
```

### Building for Production

```bash
# Build backend
npm run build:backend

# Build frontend
npm run build:frontend
```

## Development Conventions

### Linting and Formatting

This project uses ESLint for linting and Prettier for code formatting. VSCode is configured to auto-format on save.

You can also run the formatters and linters manually:

```bash
# Format the entire monorepo
npm run format

# Lint the entire monorepo
npm run lint

# Format and lint everything
npm run format:all
```

### Deployment

Deployment is handled automatically via GitHub Actions when code is pushed to the `main` branch. The deployment process uses a blue-green strategy to ensure zero downtime. For detailed information on the deployment process, refer to `change-docu/DEPLOYMENT_GUIDE.md` and `change-docu/MEILISEARCH_ARCHITECTURE.md`.
