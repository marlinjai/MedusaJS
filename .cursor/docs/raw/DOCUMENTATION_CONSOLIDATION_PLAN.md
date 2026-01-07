# Documentation Consolidation Plan

**Status**: Planning
**Created**: January 7, 2026
**Scope**: All MedusaJS repositories and documentation

---

## Current State Analysis

### Documentation Audit Results

**Total MD files found**: 87 (excluding node_modules)

| Location | Count | Examples |
|----------|-------|----------|
| **Root Level** | 8 | `LEGACY_CODE_CLEANUP_ANALYSIS.md`, `MEDUSA_BEST_PRACTICES_ASSESSMENT.md` |
| **busbasisberlin/** | 21 | `ARCHITECTURE_RFC.md`, `CODING_STANDARDS.md`, module READMEs |
| **busbasisberlin-storefront/** | 42 | `README.md`, `I18N_IMPLEMENTATION.md` |
| **deployment/** | 4 | `optimization-guide.md`, `phase1-optimization.md` |
| **instructions/** | 9 | `cursorrules.md`, `bestPrompts.md`, `roadmap.md` |
| **setup-deployment/** | 3 | `GITHUB_SECRETS_MEILISEARCH.md`, `vercel-env-variables.md` |

### Problems Identified

1. **Scattered Documentation**: 6 different directories across 3 repositories
2. **Duplicate Information**: Multiple files covering similar topics
3. **No Single Source of Truth**: Architecture info spread across 10+ files
4. **Inconsistent Naming**: Some UPPERCASE, some lowercase, some mixed
5. **Outdated Content**: Many files reference old implementations
6. **Hard to Find**: No central index or navigation

---

## Consolidation Strategy

### New Structure: `.cursor/docs/`

All documentation will be consolidated into `busbasisberlin/.cursor/docs/` with a clear hierarchy:

```
busbasisberlin/.cursor/docs/
├── README.md                          # Master index/navigation
├── architecture/
│   ├── ARCHITECTURE_RFC.md            # Master architecture document
│   ├── CODING_STANDARDS.md            # Development patterns
│   ├── MEDUSA_BEST_PRACTICES.md       # Consolidated from 3 files
│   └── LEGACY_MIGRATION.md            # Migration guides
├── deployment/
│   ├── DEPLOYMENT_GUIDE.md            # Complete deployment guide
│   ├── TROUBLESHOOTING.md             # Consolidated troubleshooting
│   ├── OPTIMIZATION.md                # Performance optimizations
│   └── GITHUB_SECRETS.md              # Secret management
├── development/
│   ├── SETUP.md                       # Local development setup
│   ├── TESTING.md                     # Testing strategies
│   ├── WORKFLOWS.md                   # Workflow documentation
│   └── API_REFERENCE.md               # API documentation
├── features/
│   ├── MODULES.md                     # Custom modules overview
│   ├── STRIPE_WEBHOOKS.md             # Payment integration
│   ├── MEILISEARCH.md                 # Search integration
│   ├── I18N.md                        # Internationalization
│   └── ANNOUNCEMENTS.md               # Feature announcements
├── operations/
│   ├── MONITORING.md                  # System monitoring
│   ├── BACKUP_RESTORE.md              # Data management
│   └── SECURITY.md                    # Security practices
└── prompts/
    ├── AI_INSTRUCTIONS.md             # AI prompting guidelines
    ├── CURSOR_RULES.md                # Cursor-specific rules
    └── BEST_PRACTICES.md              # Prompt engineering
```

---

## Migration Plan

### Phase 1: Create Structure and Master Documents

**Target**: `busbasisberlin/.cursor/docs/`

#### 1.1 Architecture Documentation
```bash
# Consolidate these files:
busbasisberlin/ARCHITECTURE_RFC.md                    → .cursor/docs/architecture/ARCHITECTURE_RFC.md
busbasisberlin/CODING_STANDARDS.md                   → .cursor/docs/architecture/CODING_STANDARDS.md
MEDUSA_BEST_PRACTICES_ASSESSMENT.md                  → .cursor/docs/architecture/MEDUSA_BEST_PRACTICES.md
MEDUSA_BEST_PRACTICES_QUERY.md                       → (merge into above)
LEGACY_CODE_CLEANUP_ANALYSIS.md                      → .cursor/docs/architecture/LEGACY_MIGRATION.md
```

#### 1.2 Deployment Documentation
```bash
# Consolidate these files:
busbasisberlin/docs/DEPLOYMENT_TROUBLESHOOTING.md    → .cursor/docs/deployment/TROUBLESHOOTING.md
deployment/optimization-guide.md                     → .cursor/docs/deployment/OPTIMIZATION.md
deployment/phase1-optimization.md                    → (merge into above)
deployment/phase2-optimization.md                    → (merge into above)
deployment/optimization-under-5min.md                → (merge into above)
setup-deployment/GITHUB_SECRETS_MEILISEARCH.md       → .cursor/docs/deployment/GITHUB_SECRETS.md
setup-deployment/vercel-env-variables.md             → (merge into above)
setup-deployment/MEILISEARCH_KEY.md                  → (merge into above)
```

#### 1.3 Development Documentation
```bash
# Consolidate these files:
busbasisberlin/README.md                             → .cursor/docs/development/SETUP.md
busbasisberlin-storefront/README.md                  → (merge into above)
README.md (root)                                     → (merge into above)
busbasisberlin/integration-tests/http/README.md      → .cursor/docs/development/TESTING.md
busbasisberlin/src/workflows/README.md               → .cursor/docs/development/WORKFLOWS.md
```

#### 1.4 Feature Documentation
```bash
# Consolidate these files:
busbasisberlin/src/modules/README.md                 → .cursor/docs/features/MODULES.md
busbasisberlin/src/modules/*/README.md               → (merge into above)
busbasisberlin/STRIPE_WEBHOOK_SETUP.md               → .cursor/docs/features/STRIPE_WEBHOOKS.md
busbasisberlin-storefront/I18N_IMPLEMENTATION.md     → .cursor/docs/features/I18N.md
busbasisberlin/ANNOUNCEMENT_BANNERS.md               → .cursor/docs/features/ANNOUNCEMENTS.md
```

#### 1.5 AI/Prompt Documentation
```bash
# Consolidate these files:
instructions/cursorrules.md                          → .cursor/docs/prompts/CURSOR_RULES.md
instructions/bestPrompts.md                          → .cursor/docs/prompts/BEST_PRACTICES.md
instructions/prompt-structure.md                     → (merge into above)
instructions/rulesforai.md                           → .cursor/docs/prompts/AI_INSTRUCTIONS.md
instructions/markdown_syntax.md                      → (merge into above)
```

### Phase 2: Create Master Index

Create `.cursor/docs/README.md` as the central navigation hub:

```markdown
# BusBasisBerlin Documentation Hub

Welcome to the centralized documentation for the BusBasisBerlin project.

## Quick Navigation

### 🏗️ Architecture & Development
- [Architecture RFC](./architecture/ARCHITECTURE_RFC.md) - Master technical roadmap
- [Coding Standards](./architecture/CODING_STANDARDS.md) - Development patterns
- [Medusa Best Practices](./architecture/MEDUSA_BEST_PRACTICES.md) - v2 guidelines
- [Legacy Migration](./architecture/LEGACY_MIGRATION.md) - Migration guides

### 🚀 Deployment & Operations
- [Deployment Guide](./deployment/DEPLOYMENT_GUIDE.md) - Complete deployment process
- [Troubleshooting](./deployment/TROUBLESHOOTING.md) - Common issues and fixes
- [Performance Optimization](./deployment/OPTIMIZATION.md) - Speed improvements
- [GitHub Secrets](./deployment/GITHUB_SECRETS.md) - Secret management

### 💻 Development
- [Local Setup](./development/SETUP.md) - Get started developing
- [Testing](./development/TESTING.md) - Testing strategies
- [Workflows](./development/WORKFLOWS.md) - Business logic workflows
- [API Reference](./development/API_REFERENCE.md) - API documentation

### ✨ Features
- [Custom Modules](./features/MODULES.md) - Supplier, Offer, Service modules
- [Stripe Integration](./features/STRIPE_WEBHOOKS.md) - Payment processing
- [Search (Meilisearch)](./features/MEILISEARCH.md) - Product search
- [Internationalization](./features/I18N.md) - Multi-language support

### 🤖 AI & Prompting
- [Cursor Rules](./prompts/CURSOR_RULES.md) - IDE configuration
- [AI Instructions](./prompts/AI_INSTRUCTIONS.md) - Prompt guidelines
- [Best Practices](./prompts/BEST_PRACTICES.md) - Effective prompting

## Recent Updates
- Jan 7, 2026: Documentation consolidation completed
- Jan 7, 2026: Architecture RFC v1.0 published
- Dec 29, 2025: Redis deployment issues resolved
```

### Phase 3: Clean Up Old Files

After consolidation, remove redundant files:

```bash
# Delete these files (content moved to .cursor/docs/)
rm LEGACY_CODE_CLEANUP_ANALYSIS.md
rm MEDUSA_BEST_PRACTICES_ASSESSMENT.md
rm MEDUSA_BEST_PRACTICES_QUERY.md
rm UNCATEGORIZED_PRODUCTS_SOLUTION.md
rm ASSIGN_UNCATEGORIZED_PRODUCTS.md
rm VERIFICATION_CHECKLIST.md
rm FINAL_IMPLEMENTATION_V2.md

# Remove directories (content consolidated)
rm -rf deployment/
rm -rf instructions/
rm -rf setup-deployment/

# Update root README.md to point to .cursor/docs/
```

---

## Implementation Tasks

### Immediate (Today)
1. ✅ Create `.cursor/docs/` structure
2. Move `ARCHITECTURE_RFC.md` and `CODING_STANDARDS.md`
3. Create master `README.md` index
4. Test navigation and links

### Week 1
1. Consolidate deployment documentation
2. Merge all setup/installation guides
3. Create unified troubleshooting guide
4. Consolidate AI/prompt documentation

### Week 2
1. Merge all module READMEs into single features guide
2. Create comprehensive API reference
3. Consolidate testing documentation
4. Clean up redundant files

---

## Benefits

### For Developers
- **Single Source of Truth**: All docs in one place
- **Better Navigation**: Clear hierarchy and index
- **Consistent Format**: Standardized structure
- **Faster Onboarding**: Clear learning path

### For Maintenance
- **Reduced Duplication**: No more conflicting information
- **Easier Updates**: Change once, not in 10 places
- **Version Control**: All docs in same repository
- **Searchable**: Easy to find information

### For AI/Cursor
- **Better Context**: AI can reference complete documentation
- **Consistent Rules**: All AI instructions in one place
- **Improved Prompts**: Centralized prompt engineering knowledge

---

## Migration Checklist

### Architecture Documentation
- [ ] Move `ARCHITECTURE_RFC.md` to `.cursor/docs/architecture/`
- [ ] Move `CODING_STANDARDS.md` to `.cursor/docs/architecture/`
- [ ] Consolidate 3 Medusa best practices files
- [ ] Create legacy migration guide

### Deployment Documentation
- [ ] Consolidate deployment troubleshooting
- [ ] Merge 4 optimization guides
- [ ] Consolidate GitHub secrets documentation
- [ ] Create unified deployment guide

### Development Documentation
- [ ] Merge 3 README files into setup guide
- [ ] Consolidate testing documentation
- [ ] Document workflows comprehensively
- [ ] Create API reference

### Feature Documentation
- [ ] Consolidate 5 module READMEs
- [ ] Document Stripe integration
- [ ] Document Meilisearch setup
- [ ] Document i18n implementation

### AI Documentation
- [ ] Move cursor rules
- [ ] Consolidate prompt guidelines
- [ ] Document AI instructions
- [ ] Create prompt best practices

### Cleanup
- [ ] Remove 8 root-level MD files
- [ ] Remove 3 directories (deployment/, instructions/, setup-deployment/)
- [ ] Update root README.md with pointer to .cursor/docs/
- [ ] Verify all links work

---

## Success Metrics

- **Before**: 87 documentation files across 6 directories
- **After**: ~20 well-organized files in `.cursor/docs/`
- **Reduction**: ~75% fewer files to maintain
- **Improvement**: Single source of truth with clear navigation

---

## Next Steps

1. **Approve this plan**
2. **Execute Phase 1** (structure + master docs)
3. **Execute Phase 2** (consolidation)
4. **Execute Phase 3** (cleanup)
5. **Update all references** to point to new locations

This consolidation will make the documentation actually usable and maintainable!
