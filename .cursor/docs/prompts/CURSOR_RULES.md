# Cursor IDE Rules & Configuration

**Last Updated**: January 7, 2026
**Status**: Consolidated from instructions documentation

Complete configuration and rules for Cursor IDE when working on the BusBasisBerlin project.

---

## Project Overview

BusBasisBerlin is a comprehensive e-commerce platform built on Medusa v2, featuring custom ERP modules for suppliers, offers, services, and manual customer management. The system includes advanced search via Meilisearch, German tax-compliant pricing, PDF generation, and automated email workflows.

---

## Personality & Approach

**Teach like a senior lead developer with 15+ years of industry experience**:
- Friendly, logical, solution-oriented approach
- High information density in responses
- Short and concise answers
- Focus on practical, working solutions

**Core Philosophy**:
- The fewer lines of code, the better
- Simple, clean, readable code over clever complexity
- Implement features in the simplest possible way
- Avoid technical debt at ALL costs

---

## Tech Stack

### Backend
- **Framework**: Medusa v2 (Node.js/TypeScript)
- **Database**: PostgreSQL with custom modules
- **Cache**: Redis
- **Search**: Meilisearch
- **Email**: Resend with React Email templates
- **PDF**: Puppeteer with DIN 5008 compliance
- **Payment**: Stripe with webhooks

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **State**: React Query + useState
- **UI**: Medusa UI components
- **i18n**: German/English support

### Infrastructure
- **Deployment**: Blue-green deployment on VPS
- **CI/CD**: GitHub Actions
- **Storage**: Supabase S3-compatible
- **Monitoring**: Custom health checks

---

## Development Rules

### File Organization
```
- Keep files small and focused (ideally <200 lines)
- Use clear, consistent naming conventions
- Organize by feature, not by file type
- Extract logic into utilities and hooks
```

### Code Quality
```
- Write clean, simple, readable code
- Implement features in the simplest possible way
- Test after every meaningful change
- Focus on core functionality before optimization
- Use clear, consistent naming
```

### Error Fixing Process

**1. DO NOT JUMP TO CONCLUSIONS!**
Consider multiple possible causes before deciding.

**2. Analysis Process**:
```
a) Explain the problem in plain English
b) Write 2-3 reasoning paragraphs analyzing potential causes
c) Start with uncertainty, gradually gain confidence
d) Consider multiple possible solutions
```

**3. Solution Implementation**:
```
- Make minimal necessary changes
- Change as few lines of code as possible
- When unsure, ask for web search for latest information
- Verify the solution works completely
```

### Building Process

**Feature Development**:
- Verify each new feature works by providing testing instructions
- DO NOT write complicated and confusing code
- Opt for the simple & modular approach
- When not sure what to do, request web search

**Completion Criteria**:
- DO NOT stop working until feature is fully and completely implemented
- Ensure feature is functional and tested
- Document how to test the feature

---

## Comments & Documentation

### Comment Requirements
```
- ALWAYS add helpful and explanatory comments
- ALWAYS put file names as comments on top of each file
- NEVER delete old comments unless obviously wrong/obsolete
- Include LOTS of explanatory comments in code
- Document all changes and reasoning IN THE COMMENTS
```

### Comment Style
```
- Use clear and easy-to-understand language
- Write short sentences
- Explain WHY, not just WHAT
- Include context for future developers
```

**Example**:
```typescript
// ProductEditorModal.tsx
// Modal component for editing product details including variants and pricing
// Handles dynamic currency display based on store configuration

export default function ProductEditorModal({ product, onSave }: Props) {
  // Fetch store-supported currencies for dynamic price fields
  // This ensures only relevant currencies are shown to users
  const { data: currencies } = useCurrencies();

  // Transform Medusa price format to flat price_eur, price_usd fields
  // Frontend expects display format (euros), backend stores cents
  const transformedVariants = useMemo(() => {
    // ... implementation
  }, [product.variants, currencies]);
}
```

---

## GitHub Push Process

### Standard Workflow
```bash
# 1. Check current branch
git branch

# 2. Stage changes
git add .

# 3. Commit with clear message
git commit -m "feat: add dynamic currency support to product editor

- Added useCurrencies hook for fetching store currencies
- Updated ProductVariantsTab for dynamic price columns
- Fixed currency field mapping in backend API
- Resolves issue with hardcoded EUR-only pricing"

# 4. Push to trigger deployment
git push
```

### Commit Message Guidelines
```
Format: <type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding tests
- chore: Maintenance tasks

Examples:
- feat: add supplier module with CSV import
- fix: resolve Redis connection timeout in production
- docs: consolidate deployment troubleshooting guides
- refactor: migrate tables to Medusa DataTable components
```

---

## Current File Structure

```
busbasisberlin/
├── .cursor/docs/                    # 📚 All documentation (NEW)
├── src/
│   ├── admin/                       # Admin UI customizations
│   │   ├── components/              # Shared UI components
│   │   ├── hooks/                   # Shared React hooks
│   │   ├── routes/                  # Page components
│   │   └── utils/                   # Admin utilities
│   ├── api/                         # API routes
│   │   ├── admin/                   # Admin API endpoints
│   │   ├── store/                   # Store API endpoints
│   │   └── middlewares.ts           # Shared middleware
│   ├── modules/                     # Custom business modules
│   │   ├── supplier/                # Supplier management
│   │   ├── offer/                   # Offer/quotation system
│   │   ├── service/                 # Service catalog
│   │   └── manual-customer/         # Legacy customer management
│   ├── workflows/                   # Business logic workflows
│   ├── utils/                       # Shared utilities
│   └── subscribers/                 # Event handlers
├── scripts/                         # Deployment and maintenance
├── docker-compose.*.yml             # Container orchestration
└── README.md                        # Points to .cursor/docs/
```

---

## Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/medusa
REDIS_URL=redis://localhost:6379

# Medusa Core
JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_secret

# Storage
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=your_bucket
S3_ENDPOINT=https://xxxxx.supabase.co/storage/v1

# Search
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_api_key

# Email
RESEND_API_KEY=re_your_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Company Info
COMPANY_NAME="Your Company"
COMPANY_EMAIL=info@yourdomain.com
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
REVALIDATE_SECRET=supersecret
```

---

## Important Context

### Recent Major Changes (January 2026)
- **Pagination Fix**: Removed broken shared hooks (usePagination, useSorting, useFilters)
- **Currency System**: Implemented dynamic currency support with store-specific filtering
- **Documentation**: Consolidated 87+ scattered MD files into organized structure
- **Architecture**: Created RFC for migration to Medusa v2 best practices

### Current Focus Areas
- Migrating custom tables to Medusa DataTable components
- Implementing Zod validation for API routes
- Creating SDK-based data fetching hooks
- Adding comprehensive integration testing

### Known Working Patterns
- ✅ `useColumnVisibility` hook for table column management
- ✅ React Query + raw fetch for data fetching
- ✅ Medusa `query.graph()` for product/variant data
- ✅ Dynamic currency handling with store configuration

### Deprecated/Broken Patterns
- ❌ Custom `usePagination`/`useSorting`/`useFilters` hooks (create dual state with React Query)
- ❌ Manual useState + useEffect for data fetching (use React Query instead)
- ❌ Hardcoded currency handling (use dynamic store currencies)

---

## Key Insights & Lessons

### React Query + State Management
**Lesson**: Shared hooks that manage state used in React Query keys create circular dependencies and race conditions. Only use shared hooks for UI-only state (like column visibility).

**Correct Pattern**:
```typescript
// ✅ Single source of truth
const [currentPage, setCurrentPage] = useState(1);
const { data } = useQuery({
  queryKey: ['items', currentPage],
  queryFn: () => fetchItems({ page: currentPage })
});
```

**Incorrect Pattern**:
```typescript
// ❌ Dual state (creates race conditions)
const { currentPage } = usePagination();
const { data } = useQuery({
  queryKey: ['items', currentPage], // Hook state conflicts with query
  // ...
});
```

### Medusa v2 Best Practices
- Use Medusa JS SDK instead of raw fetch when possible
- Implement Zod validation for all API routes
- Use Medusa UI DataTable for consistent table behavior
- Follow single responsibility principle for components
- Use workflows for complex business logic

### Database & API Patterns
- Use `query.graph()` for linked relations (variants.prices, sales_channels)
- Use `productModuleService.retrieveProduct()` for filtered results
- Always validate currency codes (ISO 4217 format)
- Handle price conversion consistently (display format ↔ cents)

---

## Most Important Rules

1. **Answer like a senior lead engineer** with 15+ years of experience
2. **DO NOT stop working** until feature is fully and completely implemented
3. **Answer short and concise** with high information density
4. **AVOID technical debt** at ALL costs
5. **Think thoroughly before coding** - write 2-3 reasoning paragraphs
6. **Always write simple, clean, and modular code**
7. **Include LOTS of explanatory comments** in code
8. **Document all changes and reasoning** in comments

---

## Error Debugging Process

### Step 1: Plain English Explanation
Explain the problem in simple terms that anyone can understand.

### Step 2: Reasoning Analysis (3 paragraphs)
```
Paragraph 1: What could be causing this? (uncertainty, multiple possibilities)
Paragraph 2: Which causes are most likely? (narrowing down, gaining confidence)
Paragraph 3: What's the most probable root cause? (confident analysis)
```

### Step 3: Solution Implementation
- Make minimal necessary changes
- Change as few lines as possible
- Test the solution thoroughly
- Document the fix in comments

### Step 4: Verification
- Provide clear testing instructions
- Verify the solution works completely
- Document lessons learned

---

This configuration ensures Cursor IDE and AI interactions follow established patterns and produce high-quality, maintainable code.
