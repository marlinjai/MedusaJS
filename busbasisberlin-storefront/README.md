<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>

<h1 align="center">
  Medusa Next.js Starter Template
</h1>

<p align="center">
Combine Medusa's modules for your commerce backend with the newest Next.js 15 features for a performant storefront.</p>

<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

### Prerequisites

To use the [Next.js Starter Template](https://medusajs.com/nextjs-commerce/), you should have a Medusa server running locally on port 9000.
For a quick setup, run:

```shell
npx create-medusa-app@latest
```

Check out [create-medusa-app docs](https://docs.medusajs.com/learn/installation) for more details and troubleshooting.

# Overview

The Medusa Next.js Starter is built with:

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Typescript](https://www.typescriptlang.org/)
- [Medusa](https://medusajs.com/)

Features include:

- Full ecommerce support:
  - Product Detail Page
  - Product Overview Page
  - Product Collections
  - Cart
  - Checkout with Stripe
  - User Accounts
  - Order Details
- Full Next.js 15 support:
  - App Router
  - Next fetching/caching
  - Server Components
  - Server Actions
  - Streaming
  - Static Pre-Rendering
- Advanced Search:
  - Meilisearch integration for fast product search
  - Category faceting and hierarchical filtering
  - Real-time product availability
  - SKU and handle search support
- German Language Support:
  - Full i18n implementation with next-intl
  - Localized content and messaging
  - Tax-inclusive pricing ("inkl. MwSt.")
- Legal Compliance:
  - Dedicated pages for Terms, Privacy Policy, Imprint
  - Linkable from emails and external sources
  - Accessible via modal or direct URL

# Quickstart

### Setting up the environment variables

Navigate into your projects directory and get your environment variables ready:

```shell
cd nextjs-starter-medusa/
mv .env.template .env.local
```

### Install dependencies

Use Yarn to install all dependencies.

```shell
yarn
```

### Start developing

You are now ready to start up your project.

```shell
yarn dev
```

### Open the code and start customizing

Your site is now running at http://localhost:8000!

# Payment integrations

By default this starter supports the following payment integrations

- [Stripe](https://stripe.com/)

To enable the integrations you need to add the following to your `.env.local` file:

```shell
NEXT_PUBLIC_STRIPE_KEY=<your-stripe-public-key>
```

You'll also need to setup the integrations in your Medusa server. See the [Medusa documentation](https://docs.medusajs.com) for more information on how to configure [Stripe](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe#main).

# Deployment

This storefront is deployed to Vercel with automatic deployments triggered by the backend deployment.

## Deployment Sequence

1. **Backend deploys first** (blue-green, ~19 mins) via GitHub Actions
2. **Vercel auto-deploys** after backend completion via deploy hook
3. This ensures frontend always builds against a stable backend

See the [Backend README](../busbasisberlin/README.md) for complete deployment documentation and the [Deployment Optimization Docs](../deployment/) for performance improvements.

## Required Environment Variables

```bash
# Backend Connection
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-domain.de

# Meilisearch (read-only search key)
NEXT_PUBLIC_MEILISEARCH_HOST=https://your-domain.de/meilisearch
NEXT_PUBLIC_MEILISEARCH_API_KEY=<read-only-search-key>

# Stripe
NEXT_PUBLIC_STRIPE_KEY=pk_live_...

# Base URL (for redirects and links)
NEXT_PUBLIC_BASE_URL=https://storefront.vercel.app
```

**Important:** Never use master Meilisearch keys in frontend environment variables. Always create a read-only search key.

# Meilisearch Integration

The storefront uses Meilisearch for advanced product search with:

- **Instant search** as-you-type
- **Category faceting** with hierarchical filtering
- **Real-time availability** from inventory sync
- **SKU search** for quick product lookup
- **Sorted results** by relevance, price, or name

Search configuration is in `src/lib/search/` with dedicated hooks and utilities.

# Resources

## Learn more about Medusa

- [Website](https://www.medusajs.com/)
- [GitHub](https://github.com/medusajs)
- [Documentation](https://docs.medusajs.com/)

## Learn more about Next.js

- [Website](https://nextjs.org/)
- [GitHub](https://github.com/vercel/next.js)
- [Documentation](https://nextjs.org/docs)
