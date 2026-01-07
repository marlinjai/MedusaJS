# AI Instructions & Prompting Guidelines

**Last Updated**: January 7, 2026
**Status**: Consolidated from instructions documentation

Comprehensive guidelines for effective AI interactions when working on the BusBasisBerlin project.

---

## Core Principles

### Fundamental Development Rules

**Code Quality**:
- The fewer lines of code, the better
- Write clean, simple, readable code
- Implement features in the simplest possible way
- Keep files small and focused (ideally <200 lines)
- Test after every meaningful change
- Focus on core functionality before optimization
- Use clear, consistent naming

**Problem-Solving Approach**:
- Think thoroughly before coding - write 2-3 reasoning paragraphs
- ALWAYS write simple, clean, and modular code
- Use clear and easy-to-understand language
- Write in short sentences
- DO NOT stop working until feature is fully and completely implemented

### Error Fixing Process

**Critical Rule**: DO NOT JUMP TO CONCLUSIONS!

**Step 1**: Consider multiple possible causes before deciding
**Step 2**: Explain the problem in plain English
**Step 3**: Make minimal necessary changes, changing as few lines as possible
**Step 4**: In case of strange errors, ask user to perform web search for latest information

### Building Process

- Verify each new feature works by telling the user how to test it
- DO NOT write complicated and confusing code - opt for simple & modular approach
- When not sure what to do, tell the user to perform a web search

---

## Prompt Structure Guidelines

### Effective Prompt Format

**1. Context Setting**:
```
"What we are doing: [Clear objective]"
"Tag relevant files: @filename.tsx @api/route.ts"
```

**2. Execution Instructions**:
```
"How to execute: [Specific steps]"
"What NOT to do: [Common pitfalls to avoid]"
```

**3. Context Dump**:
```
"Relevant documentation: [Link to docs]"
"Previous solutions: [What worked before]"
"Web search results: [If applicable]"
```

**4. Core Instruction Repeat**:
```
"Remember: [Most important constraint/requirement]"
```

**5. Output Format**:
```
"Expected output: [Specific format desired]"
```

### Example Effective Prompt

```
What we are doing: Fix pagination on suppliers page that stopped working after migration

Tag relevant files: @src/admin/routes/lieferanten/page.tsx @src/admin/hooks/usePagination.ts

How to execute:
1. Analyze the current pagination implementation
2. Identify why pagination buttons are disabled
3. Fix the root cause without breaking other functionality

What NOT to do:
- Don't create complex state synchronization
- Don't violate single source of truth principle
- Don't break existing React Query patterns

Context: We recently migrated to shared hooks but discovered they create dual state with React Query. The usePagination hook was initialized with totalItems: 0 and never updates.

Remember: Keep it simple, minimal changes, test thoroughly

Expected output: Working pagination with clear explanation of the fix
```

---

## Best Practices for AI Interactions

### Effective Prompting Techniques

**1. Be Specific About Goals**:
```
❌ "Fix the table"
✅ "Fix pagination on suppliers table - buttons are disabled because totalPages is 0"
```

**2. Provide Context**:
```
❌ "This doesn't work"
✅ "After migrating to usePagination hook, pagination stopped working. The hook receives totalItems: 0 initially and never updates when data is fetched."
```

**3. Include Relevant Files**:
```
❌ "Check the code"
✅ "@src/admin/routes/lieferanten/page.tsx @src/admin/hooks/usePagination.ts"
```

**4. Specify Constraints**:
```
❌ "Make it better"
✅ "Fix this using simple useState, don't create complex synchronization logic"
```

### Reasoning Analysis Technique

When encountering complex issues, request this analysis format:

**Paragraph 1**: What could be causing this? (uncertainty, multiple possibilities)
```
"This could be caused by several factors: state synchronization issues between the hook and React Query, incorrect totalItems being passed to the hook, or timing issues with data fetching. The pagination buttons being disabled suggests the hook thinks there are no pages available."
```

**Paragraph 2**: Which causes are most likely? (narrowing down, gaining confidence)
```
"Looking at the implementation, the most likely cause is that usePagination is initialized with totalItems: 0 and this value is never updated. React Query fetches data asynchronously, but the hook doesn't receive the new totalItems value. This would explain why totalPages remains 0."
```

**Paragraph 3**: What's the most probable root cause? (confident analysis)
```
"The root cause is an architectural mismatch: the hook expects totalItems as a static prop, but React Query provides it dynamically. This creates a dual state problem where the hook's internal state conflicts with the query state, violating the single source of truth principle."
```

---

## Code Quality Standards

### Comments & Documentation

**Always Include**:
- File name as comment on top of each file
- Helpful and explanatory comments throughout code
- Reasoning for complex logic in comments
- Documentation of all changes and their reasoning

**Comment Style**:
```typescript
// ProductVariantsTab.tsx
// Component for managing product variant pricing and images
// Supports dynamic currency columns based on store configuration

export default function ProductVariantsTab({ product }: Props) {
  // Fetch store-supported currencies for dynamic column generation
  // This ensures only relevant currencies are displayed to users
  const { data: currencies } = useCurrencies();

  // Build variant columns dynamically based on available currencies
  // Each currency gets its own price_[code] column for editing
  const variantColumns = useMemo(() => {
    const baseColumns = [
      { key: 'sku', label: 'SKU', width: 120 },
      { key: 'title', label: 'Title', width: 200 },
    ];

    // Add price column for each supported currency
    // Frontend expects display format (euros), backend stores cents
    const currencyColumns = currencies?.map(currency => ({
      key: `price_${currency.code}`,
      label: `Price ${currency.symbol}`,
      width: 100,
    })) || [];

    return [...baseColumns, ...currencyColumns];
  }, [currencies]);
}
```

### Never Delete Comments Unless
- They are obviously wrong or obsolete
- They contradict current implementation
- They provide no value (e.g., "this is a function")

### Always Include Comments For
- Complex business logic
- Workarounds for specific issues
- Integration points with external systems
- Currency/price conversion logic
- Database query explanations

---

## Project-Specific Context

### Current Architecture Status

**Working Patterns** (use these):
- React Query for data fetching
- Medusa `query.graph()` for product data
- Dynamic currency handling via store configuration
- Medusa UI components where possible
- Simple `useState` for pagination/sorting

**Deprecated Patterns** (don't use):
- `usePagination`/`useSorting`/`useFilters` shared hooks
- Manual `useState` + `useEffect` for data fetching
- Hardcoded currency codes
- Custom table components (migrate to DataTable)

### Key Technical Decisions

**Currency Handling** (January 2026):
- Store currencies fetched dynamically from Medusa Store Module
- Frontend uses display format (euros), backend stores cents
- Currency codes must be ISO 4217 compliant (eur, usd, not europe)

**Pagination Fix** (January 2026):
- Shared pagination hooks create dual state with React Query
- Solution: Use simple `useState` for query-dependent state
- Only use shared hooks for UI-only state (column visibility)

**Documentation Structure** (January 2026):
- All documentation moved to `.cursor/docs/` for organization
- Single source of truth for all project information
- Clear hierarchy: architecture, deployment, development, features, prompts

---

## 50/50 Analysis Technique

When facing complex decisions, use this structured analysis:

**Before answering, write two detailed paragraphs**:
1. **Paragraph 1**: Argue for Solution A with specific benefits and reasoning
2. **Paragraph 2**: Argue for Solution B with specific benefits and reasoning

**Then conclude**:
"After analyzing both approaches, Solution X is obviously better because [specific reasons with evidence]."

**Example**:
```
Approach A (Custom Hook): Creating a shared usePagination hook would centralize pagination logic and reduce code duplication across pages. It would provide a consistent API for pagination state management and could include features like localStorage persistence for page size preferences. This follows the DRY principle and makes pagination behavior predictable.

Approach B (Simple useState): Using simple useState for pagination state keeps the component code straightforward and avoids abstraction complexity. It works naturally with React Query since the state is directly used in query keys without synchronization issues. This approach is easier to debug and doesn't create dual state sources.

After analyzing both approaches, Simple useState is obviously better because it avoids the fundamental architectural conflict between shared state hooks and React Query. The usePagination hook creates a dual state problem that requires useEffect synchronization, leading to race conditions and timing bugs. The DRY benefits are outweighed by the complexity and reliability issues.
```

---

## Output Format Guidelines

### Code Responses
- Always include file names in comments
- Provide complete, working code (not snippets)
- Include comprehensive comments explaining logic
- Show before/after comparisons when refactoring

### Explanations
- Start with plain English summary
- Include technical details for developers
- Provide testing instructions
- Document any assumptions or limitations

### Error Analysis
- Explain the problem in simple terms
- Provide detailed technical analysis
- Show the exact fix with minimal changes
- Include prevention strategies

---

## Testing Instructions Format

Always provide clear testing instructions:

```
## How to Test This Fix

1. **Navigate to the suppliers page** (`/app/lieferanten`)
2. **Verify pagination works**:
   - Click "Next" button - should go to page 2
   - Click "Previous" button - should go back to page 1
   - Change page size from 50 to 25 - should reset to page 1
3. **Test edge cases**:
   - With 0 suppliers (pagination should be hidden)
   - With exactly 50 suppliers (should show 1 page)
   - With 51 suppliers (should show 2 pages)
4. **Verify data consistency**:
   - Page count should match total items / page size
   - Displayed items should match selected page size
```

---

This document ensures consistent, high-quality AI interactions that produce maintainable, well-documented code following established project patterns.
