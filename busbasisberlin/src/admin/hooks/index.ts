/**
 * index.ts
 * Central export point for all shared admin hooks
 */

// UI-only hooks (safe to use with React Query)
export { useColumnVisibility } from './useColumnVisibility';

// Data fetching hooks (React Query + API wrappers)
// These provide consistent patterns for all module data operations
export * from './data';

// Note: usePagination, useSorting, and useFilters have been removed
// They created dual state issues with React Query
// Use simple useState for pagination/sorting/filtering instead

