# InstantSearch URL Routing Implementation

## Overview

Implemented InstantSearch routing for the store search page to enable:

- ✅ URL state synchronization for all filters
- ✅ Browser back/forward navigation support
- ✅ Shareable URLs with active filters
- ✅ Dynamic window titles based on search state
- ✅ SSR-safe implementation (Next.js 15 + React 19 compatible)

## Implementation Details

### Files Created/Modified

#### 1. `src/lib/search-routing.ts` (NEW)

**Purpose**: Centralized routing configuration for InstantSearch

**Key Features**:

- `stateToRoute()`: Maps internal InstantSearch state to clean URL parameters
- `routeToState()`: Maps URL parameters back to InstantSearch state
- `createRouting()`: Factory function that creates routing config client-side only
- SSR-safe: Uses `typeof window` check and lazy `require()` to avoid build errors

**URL Structure**:

```
/store                                          # Clean initial state
/store?q=motor                                  # Search query
/store?category=Zubehör                         # Category filter
/store?category=Zubehör > Fahrwerk             # Nested category
/store?available=true                           # Availability filter
/store?tags=tag1&tags=tag2                      # Multiple tags
/store?page=2                                   # Pagination
/store?sortBy=products:min_price:asc            # Sort order
/store?hitsPerPage=24                           # Results per page
/store?q=motor&category=Zubehör&page=2          # Combined filters
```

**Mapped State**:
| URL Param | InstantSearch State | Type |
|-----------|---------------------|------|
| `q` | `query` | string |
| `category` | `hierarchicalMenu['hierarchical_categories.lvl0']` | string |
| `available` | `refinementList.is_available` | string |
| `tags` | `refinementList.tags` | string[] |
| `page` | `page` | number |
| `sortBy` | `sortBy` | string |
| `hitsPerPage` | `hitsPerPage` | number |

#### 2. `src/modules/store/components/store-search/index.tsx` (MODIFIED)

**Changes**:

- Removed `useSearchParams` hook (replaced by routing)
- Removed `initialUiState` prop
- Added `routing` prop with memoized `createRouting()` call
- Imported `useMemo` from React

**Before**:

```tsx
const searchParams = useSearchParams();
const query = searchParams.get('q') || '';

<InstantSearch
  searchClient={searchClient}
  indexName="products"
  initialUiState={{ products: { query } }}
>
```

**After**:

```tsx
const routing = useMemo(() => createRouting(), []);

<InstantSearch
  searchClient={searchClient}
  indexName="products"
  routing={routing}
>
```

## How It Works

### 1. **Initial Page Load**

- User visits `/store?category=Zubehör&page=2`
- `routeToState()` reads URL params
- Converts to InstantSearch state
- InstantSearch applies filters automatically
- Category tree shows "Zubehör" expanded
- Page 2 is loaded

### 2. **User Interaction**

- User clicks a category in `HierarchicalMenu`
- InstantSearch updates internal state
- `stateToRoute()` converts state to URL params
- `history.pushState()` updates browser URL
- No page reload, instant response

### 3. **Browser Navigation**

- User clicks browser back button
- `history.popState` event fires
- `routeToState()` reads previous URL state
- InstantSearch restores previous filters
- UI updates to match

### 4. **Sharing URLs**

- User copies URL: `/store?category=Zubehör&q=motor`
- Share with colleague
- Colleague opens link
- Exact same filters applied
- Same products displayed

## Benefits

### User Experience

- **Shareable searches**: Copy URL to share exact search state
- **Browser navigation**: Back/forward buttons work intuitively
- **Bookmarkable**: Save searches for later
- **Dynamic titles**: Browser tab shows current search context

### Developer Experience

- **Centralized logic**: All routing in one file
- **Type-safe**: TypeScript types from `instantsearch.js`
- **SSR-safe**: No build errors with Next.js
- **Maintainable**: Clear separation of concerns

### SEO Benefits

- **Crawlable URLs**: Each filter state has unique URL
- **Semantic URLs**: Human-readable category names
- **Linkable**: Each state can be linked directly

## Testing Checklist

### Basic Functionality

- [ ] Search query updates URL
- [ ] Category selection updates URL
- [ ] Availability filter updates URL
- [ ] Tag filters update URL
- [ ] Pagination updates URL
- [ ] Sort order updates URL

### Browser Navigation

- [ ] Back button restores previous state
- [ ] Forward button restores next state
- [ ] Refresh page maintains state

### URL Sharing

- [ ] Copy URL and open in new tab
- [ ] URL with multiple filters works
- [ ] URL with special characters works (e.g., umlauts in "Zubehör")

### Edge Cases

- [ ] Empty state (no filters) has clean URL
- [ ] Invalid URL params are ignored
- [ ] Missing params use defaults
- [ ] Page param validation (no negative/zero)

## Technical Notes

### SSR Compatibility

The routing is SSR-safe because:

1. `createRouting()` checks `typeof window === 'undefined'`
2. Returns `undefined` on server (routing disabled during SSR)
3. Lazy `require()` of `history` router (not imported at module level)
4. `useMemo` ensures client-side only execution

### Performance

- `useMemo` prevents routing config recreation on re-renders
- `history` router is lightweight (no hash, no polling)
- `cleanUrlOnDispose: false` prevents URL clearing on unmount

### Limitations

- No SSR of filtered results (products load client-side)
- URL params use query string (not path-based routing)
- Some special characters in category names may need encoding

## Future Enhancements

### Potential Improvements

1. **Path-based routing**: `/store/category/Zubehör` instead of `?category=Zubehör`
2. **SSR support**: Pre-render filtered pages for SEO
3. **URL shortening**: Hash-based short URLs for complex filter combinations
4. **Analytics integration**: Track filter usage via URL params
5. **Default refinements**: Pre-select popular categories

### Migration to `react-instantsearch-nextjs`

When React 19 becomes stable, consider migrating to the official Next.js package:

- Built-in SSR support
- Server Components compatibility
- Automatic routing helpers
- Better Next.js integration

**Migration effort**: Low (same API, mostly drop-in replacement)

## Troubleshooting

### Build Errors

**Error**: `history is not defined` or `window is not defined`
**Solution**: Ensure `createRouting()` uses `typeof window` check and lazy require

### URL Not Updating

**Error**: Filters change but URL doesn't update
**Solution**: Verify `routing` prop is passed to `<InstantSearch>`

### State Not Restoring

**Error**: URL has params but filters not applied
**Solution**: Check `routeToState()` logic, ensure attribute names match

### Special Characters

**Error**: Category names with umlauts break URL
**Solution**: Browser handles encoding automatically, no action needed

## Resources

- [InstantSearch Routing Docs](https://www.algolia.com/doc/guides/building-search-ui/going-further/routing-urls/react/)
- [Meilisearch InstantSearch Adapter](https://github.com/meilisearch/meilisearch-js-plugins/tree/main/packages/instant-meilisearch)
- [Next.js App Router Docs](https://nextjs.org/docs/app)

## Summary

The implementation provides a production-ready, SSR-safe routing solution that:

- Works seamlessly with existing InstantSearch widgets
- Maintains clean, shareable URLs
- Supports all filter types (hierarchical, refinement lists, search, sort, pagination)
- Integrates with browser history API
- Requires no changes to existing widget configurations

**Status**: ✅ Implemented and ready for testing
**Next Steps**: Test in development environment, verify all filter interactions update URL correctly
