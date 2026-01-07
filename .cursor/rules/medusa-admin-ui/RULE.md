---
description: "Medusa v2 admin UI patterns: DataTable, React Query, hooks, and frontend best practices"
alwaysApply: false
---

# Medusa Admin UI Development Patterns

## Data Fetching - React Query + Medusa JS SDK

**✅ PREFERRED Pattern**:
```typescript
import { sdk } from '@/admin/lib/sdk';
import { useQuery } from '@tanstack/react-query';

// Create custom hook wrapping SDK
function useSuppliers(params?: { search?: string }) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => sdk.admin.supplier.list(params),
    staleTime: 30000,
    placeholderData: previousData => previousData,
  });
}

// Use in component
const { data, isLoading } = useSuppliers({ search: searchTerm });
```

**⚠️ ACCEPTABLE Pattern** (for custom endpoints):
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['custom-resource', filters],
  queryFn: async () => {
    const res = await fetch('/admin/custom-resource', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  },
  staleTime: 30000,
});
```

**❌ AVOID Pattern**:
```typescript
// Don't use useState + useEffect for data fetching
const [data, setData] = useState([]);
useEffect(() => {
  fetchData().then(setData);
}, []);
```

## Table Components - Medusa DataTable

**✅ PREFERRED Pattern**:
```typescript
import { DataTable, useDataTable, createDataTableColumnHelper } from '@medusajs/ui';

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

const table = useDataTable({
  data: suppliers || [],
  columns,
  getRowId: (row) => row.id,
  rowCount: total || 0,
  enablePagination: true,
  enableSorting: true,
  enableRowSelection: true,
});

return <DataTable instance={table} />;
```

**❌ AVOID Pattern**:
```typescript
// Don't create custom table components with manual pagination/sorting
const [currentPage, setCurrentPage] = useState(1);
const [sortConfig, setSortConfig] = useState(null);
// ... 200+ lines of table logic
<CustomTable data={data} currentPage={currentPage} /* 20+ props */ />
```

## State Management Patterns

**✅ CORRECT: Single Source of Truth**
```typescript
// Use useState for query-dependent state
const [currentPage, setCurrentPage] = useState(1);
const [filters, setFilters] = useState({});

const { data } = useQuery({
  queryKey: ['items', currentPage, filters],
  queryFn: () => fetchItems({ page: currentPage, ...filters })
});
```

**❌ AVOID: Dual State**
```typescript
// Don't use shared hooks that conflict with React Query
const { currentPage } = usePagination(); // Creates dual state!
const { data } = useQuery({
  queryKey: ['items', currentPage], // Conflicts with hook state
});
```

**✅ SHARED HOOKS: UI-Only State**
```typescript
// Only use shared hooks for state independent of data fetching
import { useColumnVisibility } from '@/admin/hooks/useColumnVisibility';

const { visibleColumns, toggleColumn } = useColumnVisibility({
  storageKey: 'table-columns',
  defaultVisibleColumns: ['name', 'status', 'actions'],
});
```

## Component Structure

**File Template**:
```typescript
// ComponentName.tsx
// Brief description of component purpose and key functionality

import { /* imports */ } from '@medusajs/ui';
import { useQuery } from '@tanstack/react-query';

type Props = {
  // Clear prop types
};

export default function ComponentName({ ...props }: Props) {
  // 1. Data fetching (React Query hooks)
  const { data, isLoading } = useQuery(/* ... */);

  // 2. UI state (useState, useMemo)
  const [selectedItem, setSelectedItem] = useState(null);

  // 3. Event handlers
  const handleAction = useCallback(() => {
    // Implementation
  }, [dependencies]);

  // 4. Render
  return (
    <Container>
      {/* JSX with Medusa UI components */}
    </Container>
  );
}
```

## Currency Handling

**✅ DYNAMIC Pattern** (current working approach):
```typescript
// Fetch store-supported currencies dynamically
const { data: currencies } = useCurrencies();

// Build columns based on available currencies
const currencyColumns = currencies?.map(currency => ({
  key: `price_${currency.code}`,
  label: `Price ${currency.symbol}`,
  width: 100,
})) || [];
```

**❌ AVOID Pattern**:
```typescript
// Don't hardcode currency codes
const columns = [
  { key: 'price_eur', label: 'Price EUR' }, // Hardcoded!
  { key: 'price_usd', label: 'Price USD' }, // Hardcoded!
];
```

## Error Handling

**Component Error Boundaries**:
```typescript
if (isLoading) return <Loading />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
```

**Form Validation**:
```typescript
// Use Zod for form validation
import { z } from 'zod';

const schema = z.object({
  company: z.string().min(1, 'Company name required'),
  email: z.string().email().optional(),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

## File Size Guidelines

- **Components**: ≤ 200 lines
- **Pages**: ≤ 300 lines (extract logic to hooks/components)
- **Hooks**: ≤ 150 lines (focused responsibility)

**When file gets too large**:
1. Extract custom hooks
2. Split into smaller components
3. Move logic to utilities
4. Create sub-components

## Common Patterns

**Modal Pattern**:
```typescript
const [isOpen, setIsOpen] = useState(false);
const [editingItem, setEditingItem] = useState(null);

const handleEdit = (item) => {
  setEditingItem(item);
  setIsOpen(true);
};
```

**Loading States**:
```typescript
if (isLoading) return <LoadingSpinner />;
if (isFetching) return <div className="opacity-50">{content}</div>;
```

**Empty States**:
```typescript
if (!data?.length) {
  return <EmptyState message="No items found" action={<CreateButton />} />;
}
```

This rule applies to all admin UI development and ensures consistent patterns across the codebase.
