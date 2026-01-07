# MedusaJS BusBasisBerlin - Coding Standards & Patterns Guide

## Overview

This document defines the coding standards and patterns for the BusBasisBerlin MedusaJS project. Following these patterns ensures consistency, maintainability, and code quality across the codebase.

---

## Table of Contents

1. [General Principles](#general-principles)
2. [Admin UI Patterns](#admin-ui-patterns)
3. [API Route Patterns](#api-route-patterns)
4. [Shared Components & Hooks](#shared-components--hooks)
5. [Type Definitions](#type-definitions)
6. [File Organization](#file-organization)

---

## General Principles

### SOLID Principles

1. **Single Responsibility**: Each component/function should have one clear purpose
2. **Open/Closed**: Use configuration props instead of hardcoding logic
3. **Liskov Substitution**: Shared components should work for all use cases
4. **Interface Segregation**: Keep prop interfaces focused
5. **Dependency Inversion**: Depend on abstractions (hooks, utilities) not concrete implementations

### DRY (Don't Repeat Yourself)

- Extract duplicate logic into shared utilities
- Use shared components for common UI patterns
- Create custom hooks for reusable state logic
- Consolidate similar API utilities

### File Size Guidelines

- **Components**: ≤ 200 lines
- **Pages**: ≤ 300 lines (extract logic to hooks/components)
- **API Routes**: ≤ 200 lines per handler (split GET/PUT into modules if needed)
- **Utilities**: ≤ 150 lines (split into focused modules)

---

## Admin UI Patterns

### Data Fetching

**✅ BEST: React Query + Medusa JS SDK**

```typescript
import { sdk } from '@/admin/lib/sdk';
import { useQuery } from '@tanstack/react-query';

// Create a custom hook wrapping the SDK
function useSuppliers(params?: { search?: string }) {
	return useQuery({
		queryKey: ['suppliers', params],
		queryFn: () => sdk.admin.supplier.list(params),
		staleTime: 30000,
	});
}

// Use in component
const { data, isLoading } = useSuppliers({ search: searchTerm });
```

**✅ IMPLEMENTED: Data Hooks Pattern** (for custom modules)

```typescript
import { useSuppliers, useCreateSupplier } from '@/admin/hooks/data';

// List suppliers with pagination and filtering
const { data, isLoading } = useSuppliers({
  search: searchTerm,
  limit: pageSize,
  offset: (currentPage - 1) * pageSize,
  withDetails: true,
});

// Create new supplier
const createSupplier = useCreateSupplier();
const handleCreate = async (supplierData) => {
  await createSupplier.mutateAsync(supplierData);
  // Query automatically invalidates and refetches
};
```

**⚠️ Acceptable: React Query + Raw Fetch** (for endpoints without data hooks)

```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
	queryKey: ['resource-key', filters, page],
	queryFn: async () => {
		const res = await fetch('/admin/resource', { credentials: 'include' });
		if (!res.ok) throw new Error('Failed to fetch');
		return res.json();
	},
	staleTime: 30000,
	placeholderData: previousData => previousData,
});
```

**❌ Avoid: useState + useEffect**

```typescript
// Don't do this:
const [data, setData] = useState([]);
useEffect(() => {
	fetchData().then(setData);
}, []);
```

**Why SDK?** The Medusa JS SDK provides:
- Type-safe API calls
- Consistent error handling
- Built-in retry logic
- Better developer experience

### Table State Management

**✅ RECOMMENDED: Medusa UI DataTable**

Use Medusa's built-in DataTable component for all table-based pages:

```typescript
import { DataTable, useDataTable, createDataTableColumnHelper } from '@medusajs/ui';

type Supplier = {
	id: string;
	company: string;
	status: string;
};

const columnHelper = createDataTableColumnHelper<Supplier>();

const columns = [
	columnHelper.accessor('company', {
		header: 'Company',
		cell: ({ getValue }) => getValue(),
	}),
	columnHelper.accessor('status', {
		header: 'Status',
		cell: ({ getValue }) => <StatusBadge status={getValue()} />,
	}),
];

// In component
const { data, isLoading } = useSuppliers();

const table = useDataTable({
	data: data?.suppliers || [],
	columns,
	getRowId: (row) => row.id,
	rowCount: data?.stats?.total || 0,
	enablePagination: true,
	enableSorting: true,
	enableRowSelection: true,
});

return <DataTable instance={table} />;
```

**Benefits**:
- Integrated with React Query (no dual state issues)
- Built-in pagination, sorting, filtering
- Type-safe column definitions
- Consistent UI across admin pages
- Automatic state management

**⚠️ Legacy: Custom Shared Hooks (DEPRECATED)**

The following hooks are deprecated and should NOT be used:
- ~~`usePagination`~~ - Conflicts with React Query (creates dual state)
- ~~`useSorting`~~ - Use DataTable's built-in sorting
- ~~`useFilters`~~ - Use DataTable's built-in filtering

**Why deprecated?** These hooks create a "single source of truth" violation with React Query:
1. Hook creates internal state (`currentPage`)
2. React Query needs same state in query keys
3. Syncing with `useEffect` creates race conditions
4. Medusa's `useDataTable` solves this by design

**✅ Still Valid: Column Visibility Hook** (UI-only state)

```typescript
import { useColumnVisibility } from '@/admin/hooks/useColumnVisibility';

// This is fine because it doesn't affect data fetching
const { visibleColumns, toggleColumn, showAllColumns, hideAllColumns } =
	useColumnVisibility({
		storageKey: 'my-table-columns',
		defaultVisibleColumns: ['name', 'status', 'actions'],
		allColumns: columns.map(c => c.key),
	});
```

### Column Visibility Control

Use the shared component:

```typescript
import ColumnVisibilityControl from '@/admin/components/ColumnVisibilityControl';

<ColumnVisibilityControl
	columns={columns}
	visibleColumns={visibleColumns}
	onToggle={toggleColumn}
	onShowAll={showAllColumns}
	onHideAll={hideAllColumns}
	nonHideableColumns={['name', 'actions']}
	buttonText="Spalten"
	variant="simple" // or "advanced"
/>
```

### Component Structure

```typescript
/**
 * ComponentName.tsx
 * Brief description of component purpose
 */
import { /* imports */ } from '@medusajs/ui';

// Types first
type Props = {
	// ... props
};

// Component
export default function ComponentName({ ...props }: Props) {
	// 1. Hooks (React Query, custom hooks)
	// 2. State (useState, useMemo, useCallback)
	// 3. Effects (useEffect)
	// 4. Event handlers
	// 5. Render

	return (
		// JSX
	);
}
```

---

## API Route Patterns

### Standard Route Structure

```typescript
// route.ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import {
	parsePaginationParams,
	parseSortParams,
	sendErrorResponse,
	sendListResponse,
} from '@/utils/api-utils';

// Types
type QueryParams = {
	search?: string;
	status?: string;
};

// GET Handler
export const GET = async (
	req: MedusaRequest<QueryParams>,
	res: MedusaResponse,
): Promise<void> => {
	const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

	try {
		// 1. Parse and validate parameters
		const pagination = parsePaginationParams(req.query);
		const sort = parseSortParams(req.query);

		// 2. Resolve services
		const service = req.scope.resolve('service_name');

		// 3. Fetch data
		const data = await service.list(/* filters */, {
			take: pagination.limit,
			skip: pagination.offset,
			order: sort.sort_by ? { [sort.sort_by]: sort.sort_direction } : undefined,
		});

		// 4. Send response
		sendListResponse(res, data, pagination);
	} catch (error) {
		logger.error('[RESOURCE] Error:', error);
		sendErrorResponse(
			res,
			500,
			'Failed to fetch resource',
			error instanceof Error ? error.message : 'Unknown error',
		);
	}
};

// PUT Handler
export const PUT = async (
	req: MedusaRequest,
	res: MedusaResponse,
): Promise<void> => {
	// Similar structure
};
```

### Input Validation with Zod

**✅ REQUIRED: Use Zod schemas for all API routes**

```typescript
import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

// Define schema for query parameters
const listResourceSchema = z.object({
	search: z.string().optional(),
	limit: z.coerce.number().min(1).max(250).default(50),
	offset: z.coerce.number().min(0).default(0),
	sort_by: z.string().optional(),
	sort_direction: z.enum(['asc', 'desc']).default('desc'),
});

// Define schema for request body
const createResourceSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email().optional(),
	status: z.enum(['active', 'inactive']).default('active'),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	try {
		// Validate and parse query parameters
		const params = listResourceSchema.parse(req.query);
		// params is now type-safe!

		// Fetch data with validated params
		const data = await service.list(params);

		return res.json({ data });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
		}
		// Handle other errors
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
	try {
		const body = createResourceSchema.parse(req.body);
		// body is type-safe!

		const result = await service.create(body);
		return res.json({ result });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Validation error',
				details: error.errors,
			});
		}
		return res.status(500).json({ error: 'Internal server error' });
	}
};
```

**Benefits**:
- Type safety at runtime
- Automatic coercion (strings → numbers)
- Clear error messages
- Prevents invalid data from reaching business logic

### Error Handling

Use standardized error responses:

```typescript
import { sendErrorResponse } from '@/utils/api-utils';

// Validation error (if not using Zod)
if (!id) {
	sendErrorResponse(res, 400, 'Validation error', 'ID is required');
	return;
}

// Not found
if (!resource) {
	sendErrorResponse(res, 404, 'Not found', 'Resource not found');
	return;
}

// Server error
sendErrorResponse(
	res,
	500,
	'Internal error',
	error.message,
	error.stack, // details
	'RESOURCE_ERROR', // code
);
```

### Query Parameter Parsing

```typescript
import {
	parsePaginationParams,
	parseSortParams,
	parseFilters,
	sanitizeSearchQuery,
} from '@/utils/api-utils';

// Standard pagination
const { limit, offset } = parsePaginationParams(req.query, {
	limit: 50,
	offset: 0,
});

// Sorting
const { sort_by, sort_direction } = parseSortParams(req.query);

// Column filters (filter_status=active, filter_type=business)
const filters = parseFilters(req.query);

// Search query sanitization
const search = sanitizeSearchQuery(req.query.search);
```

---

## Shared Components & Hooks

### Available Shared Components

1. **ColumnVisibilityControl** - `@/admin/components/ColumnVisibilityControl`
   - Manages column visibility for tables
   - Supports simple and advanced variants
   - Configurable non-hideable columns

### Available Shared Hooks

**UI State Hooks** (safe to use):
1. **useColumnVisibility** - `@/admin/hooks/useColumnVisibility`
   - Manages column visibility state
   - Auto-persists to localStorage
   - Works independently of data fetching

**Data Fetching Hooks** (recommended):
2. **useSuppliers** - `@/admin/hooks/data/useSuppliers`
   - Complete CRUD operations for suppliers
   - Includes list, retrieve, create, update, delete
   - Built on React Query with proper caching

3. **useServices** - `@/admin/hooks/data/useServices`
   - Complete CRUD operations for services
   - Filtering by category, active status, featured status

4. **useOffers** - `@/admin/hooks/data/useOffers`
   - Complete CRUD operations for offers
   - Status filtering and date range queries

5. **useManualCustomers** - `@/admin/hooks/data/useManualCustomers`
   - Complete CRUD operations for manual customers
   - Search, type filtering, column-based filtering

**Deprecated Hooks** (removed):
- ~~usePagination~~ - Removed (created dual state with React Query)
- ~~useSorting~~ - Removed (conflicted with React Query keys)
- ~~useFilters~~ - Removed (same dual state issue)
- **Use simple `useState` for pagination/sorting/filtering instead**

### Available Shared Utilities

1. **api-utils** - `@/utils/api-utils`
   - `parsePaginationParams()` - Parse pagination from query
   - `parseSortParams()` - Parse sorting from query
   - `parseFilters()` - Parse filter parameters
   - `sendErrorResponse()` - Standard error responses
   - `sendListResponse()` - Standard list responses
   - `sanitizeSearchQuery()` - Prevent injection attacks
   - `buildQueryParams()` - Build query strings

2. **currency-helper** - `@/utils/currency-helper`
   - `getStoreSupportedCurrencies()` - Fetch store currencies
   - `getStoreSupportedCurrencyCodes()` - Fetch currency codes

---

## Type Definitions

### Naming Conventions

- **Types**: PascalCase, descriptive names
  ```typescript
  type ProductListItem = { /* ... */ };
  type CreateProductRequest = { /* ... */ };
  ```

- **Props**: `ComponentNameProps`
  ```typescript
  type ProductTableProps = { /* ... */ };
  ```

### Shared Types Location

- **Admin UI types**: `src/admin/types/` (to be created)
- **API types**: `src/types/`
- **Module types**: In module directories

### Type Reusability

**✅ Do:**
```typescript
// shared types file
export type PaginationParams = {
	limit: number;
	offset: number;
};

// use in multiple files
import type { PaginationParams } from '@/types/common';
```

**❌ Don't:**
```typescript
// Duplicate type in every file
type PaginationParams = {
	limit: number;
	offset: number;
};
```

---

## File Organization

### Admin UI Structure

```
src/admin/
├── components/          # Shared components
│   └── ColumnVisibilityControl.tsx
├── hooks/              # Shared hooks
│   ├── useColumnVisibility.ts
│   ├── usePagination.ts
│   ├── useSorting.ts
│   └── useFilters.ts
├── routes/             # Page components
│   └── [feature]/
│       ├── components/ # Feature-specific components
│       ├── hooks/      # Feature-specific hooks
│       ├── utils/      # Feature-specific utilities
│       └── page.tsx    # Main page component
└── utils/              # Admin-specific utilities
```

### API Structure

```
src/api/
├── admin/
│   └── [resource]/
│       ├── route.ts           # List (GET), Create (POST)
│       ├── [id]/
│       │   └── route.ts       # Retrieve (GET), Update (PUT), Delete (DELETE)
│       └── [nested-resource]/
│           └── route.ts       # Nested endpoints
└── middlewares.ts             # Shared middleware
```

### Utilities Structure

```
src/utils/
├── api-utils.ts        # API route helpers
├── currency-helper.ts  # Currency operations
├── inventory-helper.ts # Inventory operations
└── ...                 # Other domain-specific utilities
```

---

## Code Review Checklist

Before submitting code for review, ensure:

- [ ] No file exceeds size guidelines (200-300 lines)
- [ ] Duplicate logic is extracted to shared utilities
- [ ] Components use shared hooks where applicable
- [ ] API routes use standardized error handling
- [ ] Types are defined and reused appropriately
- [ ] Code follows SOLID and DRY principles
- [ ] Comments explain "why", not "what"
- [ ] No hardcoded values (use config/props)
- [ ] React Query is used for data fetching (not useState + useEffect)
- [ ] Meaningful variable and function names

---

## Migration Guide

### Migrating to Medusa JS SDK + React Query

**Before:**
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
	setLoading(true);
	fetch('/api/resource')
		.then(res => res.json())
		.then(setData)
		.finally(() => setLoading(false));
}, []);
```

**After (with SDK):**
```typescript
import { sdk } from '@/admin/lib/sdk';

// Create custom hook
function useResources() {
	return useQuery({
		queryKey: ['resources'],
		queryFn: () => sdk.admin.resource.list(),
		staleTime: 30000,
	});
}

// Use in component
const { data, isLoading } = useResources();
```

**After (without SDK, for custom endpoints):**
```typescript
const { data, isLoading } = useQuery({
	queryKey: ['resource'],
	queryFn: async () => {
		const res = await fetch('/api/resource', { credentials: 'include' });
		if (!res.ok) throw new Error('Failed');
		return res.json();
	},
	staleTime: 30000,
});
```

### Migrating Tables to Medusa DataTable

**Before (Custom Table - ~500 lines):**
```typescript
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(50);
const [sortConfig, setSortConfig] = useState(null);
const [filters, setFilters] = useState({});

// ... 100+ lines of state management

<CustomTable
	data={data}
	currentPage={currentPage}
	pageSize={pageSize}
	onPageChange={setCurrentPage}
	sortConfig={sortConfig}
	onSort={setSortConfig}
	// ... 20+ props
/>
```

**After (DataTable - ~150 lines):**
```typescript
import { DataTable, useDataTable, createDataTableColumnHelper } from '@medusajs/ui';

const columnHelper = createDataTableColumnHelper<Resource>();

const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		cell: ({ getValue }) => getValue(),
	}),
	columnHelper.accessor('status', {
		header: 'Status',
		cell: ({ getValue }) => <StatusBadge status={getValue()} />,
	}),
];

const table = useDataTable({
	data: data?.resources || [],
	columns,
	getRowId: (row) => row.id,
	rowCount: data?.total || 0,
	enablePagination: true,
	enableSorting: true,
});

return <DataTable instance={table} />;
```

### Understanding the Pagination Fix (Jan 7, 2026)

**Why usePagination/useSorting/useFilters were removed:**

These hooks created a "dual state" problem with React Query:

```typescript
// ❌ BROKEN PATTERN (dual state)
const { currentPage } = usePagination({ totalItems: data?.total });

const { data } = useQuery({
	queryKey: ['items', currentPage], // ← React Query depends on currentPage
	// ...
});

// Hook has internal currentPage state
// React Query needs currentPage for refetching
// Syncing them with useEffect creates race conditions!
```

**The correct pattern (single source of truth):**

```typescript
// ✅ CORRECT: useState for query-dependent state
const [currentPage, setCurrentPage] = useState(1);

const { data } = useQuery({
	queryKey: ['items', currentPage],
	// ...
});

// OR use DataTable which handles this internally
const table = useDataTable({
	data,
	enablePagination: true, // ← Handles pagination state correctly
});
```

**Key lesson**: Only use shared hooks for state that is **independent** of data fetching (like `useColumnVisibility`).

---

## Questions or Suggestions?

For questions about these patterns or suggestions for improvements, please:
1. Review existing implementations in the codebase
2. Discuss with the team
3. Update this document with consensus changes

