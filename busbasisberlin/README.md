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
  Medusa
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`.

## Getting Started

Visit the [Quickstart Guide](https://docs.medusajs.com/learn/installation) to set up a server.

Visit the [Docs](https://docs.medusajs.com/learn/installation#get-started) to learn more about our system requirements.

## Features

- **Meilisearch Integration**: Advanced product search with category faceting
- **Automatic Product Sync**: Products sync to Meilisearch on create/update
- **Custom Modules**: Supplier, Offer, and Service modules

## Meilisearch Configuration

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

## Maintenance Scripts

### Cleanup Orphaned S3 Files

To clean up orphaned files in your Supabase Storage that are no longer referenced by any product:

```bash
npx medusa exec ./src/scripts/cleanup-s3-files.ts
```

This script scans all products for image references, compares them with files in your storage bucket, and removes any files that are no longer being used.

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

<!-- Deployment trigger: Tue Oct 28 18:30:00 CET 2025 - Force nginx reload with correct CORS map config -->
