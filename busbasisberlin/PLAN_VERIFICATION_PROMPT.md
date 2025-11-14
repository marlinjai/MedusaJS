# Plan Verification Prompt

## Context

We are implementing enhancements to the "Produkte nach Kategorie" (Products by Category) page in a MedusaJS admin panel. The plan includes:

1. Parent category selection with automatic child inclusion
2. Draggable column widths for product tables
3. Full product creation workflow with Details/Organisieren/Varianten tabs
4. Integration of variant table with draggable columns

## Verification Requirements

### 1. Minimum Requirements Check

Verify that the plan covers the following minimum requirements:

- [ ] Parent category selection automatically includes all descendant categories
- [ ] Product table has draggable/resizable columns (similar to ManualCustomerTable)
- [ ] Product creation modal includes all three tabs: Details, Organisieren, Varianten
- [ ] Variant table supports draggable column widths (800px default for letter/title, 120px for checkboxes)
- [ ] Column widths persist in localStorage
- [ ] All API routes are properly defined
- [ ] Error handling is implemented

### 2. Variant Handling Verification

Check the plan for proper variant handling:

- [ ] Support for single-tier variants (standard product variants)
- [ ] Support for twin-tier variants (if applicable - variants with nested options)
- [ ] Variant creation/editing in bulk
- [ ] Variant table columns: Letter, Titel, Artikelnummer, Verwalteter Bestand, Rückstand zulassen, Mit Inventarset, Preis EUR, Preis Europe
- [ ] Variant data persistence and validation

### 3. Convention Compliance

Verify adherence to project conventions:

- [ ] File naming follows existing patterns (kebab-case for files, PascalCase for components)
- [ ] Code structure matches existing admin routes (e.g., `busbasisberlin/src/admin/routes/products/by-category/`)
- [ ] API routes follow existing patterns (`busbasisberlin/src/api/admin/products/`)
- [ ] TypeScript types are properly defined
- [ ] Error handling uses Medusa's logger
- [ ] React Query is used for data fetching
- [ ] UI components use @medusajs/ui library

### 4. Implementation Courses/Paths Required

Identify what needs to be learned or understood to implement this properly:

#### MedusaJS Framework Knowledge

- [ ] Medusa V2 Query API for fetching products, categories, collections
- [ ] Medusa Admin SDK for widget/route configuration
- [ ] Product and variant data models
- [ ] Category tree structure and relationships
- [ ] Sales channel management
- [ ] Collection management

#### React/TypeScript Skills

- [ ] React Query (useQuery, useMutation) for data fetching
- [ ] React state management (useState, useMemo)
- [ ] TypeScript type definitions and interfaces
- [ ] Component composition and props
- [ ] Event handling (mouse events for column resizing)
- [ ] localStorage API for persistence

#### UI/UX Implementation

- [ ] @medusajs/ui component library usage
- [ ] DataTable component customization
- [ ] Modal/Dialog component implementation
- [ ] Tab navigation
- [ ] Form handling and validation
- [ ] Drag-and-drop interactions (column resizing)

#### API Development

- [ ] MedusaRequest/MedusaResponse types
- [ ] Query module usage for data fetching
- [ ] Error handling and logging
- [ ] RESTful API design patterns
- [ ] Request/response data structures

### 5. Critical Implementation Points

Verify these critical aspects are addressed:

#### Category Expansion Logic

- [ ] Recursive function to collect all descendant category IDs
- [ ] Efficient tree traversal algorithm
- [ ] Handling of edge cases (orphaned categories, circular references)

#### Column Resizing Implementation

- [ ] Mouse event handlers (mousedown, mousemove, mouseup)
- [ ] Column width state management
- [ ] Minimum/maximum width constraints
- [ ] Visual feedback during resizing
- [ ] Persistence across page reloads

#### Product Creation Workflow

- [ ] Multi-step form with tab navigation
- [ ] Form state management across tabs
- [ ] Validation at each step
- [ ] Draft saving functionality
- [ ] Integration with Medusa product creation API

#### Variant Table Integration

- [ ] Reuse of variant-table-styles widget logic
- [ ] Proper column width defaults
- [ ] Checkbox column detection
- [ ] Input field sizing within cells

### 6. Testing Requirements

Verify testing considerations:

- [ ] Unit tests for category expansion logic
- [ ] Integration tests for API routes
- [ ] Component tests for table resizing
- [ ] E2E tests for product creation workflow
- [ ] Edge case testing (empty categories, no products, etc.)

### 7. Documentation Needs

Check if documentation is required:

- [ ] Code comments explaining complex logic
- [ ] README updates for new features
- [ ] API documentation for new endpoints
- [ ] User guide for new functionality

## Verification Questions

1. **Variant Structure**: Does the plan properly handle both single-tier and twin-tier variants? Are there any special considerations for variant options that need to be addressed?

2. **Performance**: Will the category expansion logic perform well with large category trees? Should we implement caching?

3. **Data Consistency**: How do we ensure that when a parent category is selected, all child category products are correctly included without duplicates?

4. **User Experience**: Are there any UX improvements needed beyond the basic requirements? (e.g., visual indicators for expanded categories, loading states, etc.)

5. **Error Handling**: What happens if category expansion fails? How do we handle API errors gracefully?

6. **Backward Compatibility**: Will these changes affect existing functionality? Do we need migration scripts?

## Expected Output

After verification, provide:

1. A checklist of verified requirements
2. A list of any missing or unclear aspects
3. Recommended learning resources or documentation to review
4. Suggested improvements or optimizations
5. Risk assessment for implementation

## Implementation Readiness Score

Rate the plan's readiness (1-10) for:

- **Completeness**: Are all requirements covered?
- **Clarity**: Is the plan clear and actionable?
- **Feasibility**: Can this be implemented with current knowledge?
- **Maintainability**: Will the code be maintainable?

---

**Note**: This prompt should be used to verify the plan before implementation begins, ensuring all requirements are met and potential issues are identified early.
