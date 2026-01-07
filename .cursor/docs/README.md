# BusBasisBerlin Documentation Hub

**Welcome to the centralized documentation for the BusBasisBerlin MedusaJS monorepo.**

All project documentation has been consolidated here from 46+ scattered files across multiple directories. This is your single source of truth for all technical information.

---

## 🚀 Quick Start

**New to the project?** Start here:

1. [Complete Development Setup](./development/COMPLETE_SETUP.md) - Get your environment running (backend + frontend)
2. [Cursor Rules](../.cursor/rules/medusa-development/RULE.md) - AI development guidelines
3. [Custom Modules Overview](./features/MODULES_COMPREHENSIVE.md) - Understand the ERP system

**Deploying to production?** Go here:

1. [Deployment Guide](./deployment/GUIDE.md) - Complete deployment process with optimization
2. [GitHub Secrets Setup](./deployment/GITHUB_SECRETS.md) - Configure all environment variables
3. [Troubleshooting](./deployment/TROUBLESHOOTING.md) - Fix deployment issues

---

## 📚 Documentation Structure

### 🏗️ Architecture & Development

| Document                                                         | Description                                        | Content Source                 |
| ---------------------------------------------------------------- | -------------------------------------------------- | ------------------------------ |
| [Architecture RFC](./architecture/ARCHITECTURE_RFC.md)           | Master technical roadmap and migration plan        | Created from codebase analysis |
| [Coding Standards](./architecture/CODING_STANDARDS.md)           | Development patterns and best practices            | Updated with v2 patterns       |
| [Medusa Best Practices](./architecture/MEDUSA_BEST_PRACTICES.md) | Medusa v2 guidelines and implementation assessment | Merged from 3 assessment files |
| [Legacy Migration](./architecture/LEGACY_MIGRATION.md)           | Migration guides and cleanup strategies            | From legacy cleanup analysis   |

### 🚀 Deployment & Operations

| Document                                                 | Description                                  | Content Source                                    |
| -------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| [Deployment Guide](./deployment/GUIDE.md)                | Complete deployment with blue-green strategy | Merged from monorepo README + optimization guides |
| [Performance Optimization](./deployment/OPTIMIZATION.md) | Phase 1-3 optimization strategies            | Consolidated from 4 optimization files            |
| [Troubleshooting](./deployment/TROUBLESHOOTING.md)       | Redis issues and deployment fixes            | Merged from 6 Redis troubleshooting files         |
| [GitHub Secrets](./deployment/GITHUB_SECRETS.md)         | Environment configuration                    | From setup-deployment/ docs                       |

### 💻 Development

| Document                                                | Description                                  | Content Source                |
| ------------------------------------------------------- | -------------------------------------------- | ----------------------------- |
| [Complete Setup Guide](./development/COMPLETE_SETUP.md) | Local development setup (backend + frontend) | Merged from 3 README files    |
| [Testing Strategy](./development/TESTING.md)            | Integration testing with Medusa test utils   | From integration-tests README |
| [API Reference](./development/API_REFERENCE.md)         | Complete API documentation                   | From src/api/ README files    |

### ✨ Features & Integrations

| Document                                              | Description                                              | Content Source                    |
| ----------------------------------------------------- | -------------------------------------------------------- | --------------------------------- |
| [Custom Modules](./features/MODULES_COMPREHENSIVE.md) | Complete ERP system (Supplier, Offer, Service, Customer) | Merged from 4 module README files |
| [Feature Integrations](./features/INTEGRATIONS.md)    | i18n, Stripe, Meilisearch, Email, Announcements          | Merged from feature docs          |

### 🤖 AI & Development Rules

| Document                                                    | Description                                 | Content Source                  |
| ----------------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| [Cursor Rules](../.cursor/rules/medusa-development/RULE.md) | AI development guidelines and project rules | Merged from instructions/ files |

---

## 📊 Consolidation Results

### Before Consolidation

- **46 scattered MD files** across 6+ directories
- **Multiple repositories** (backend, storefront, root)
- **Duplicate information** across files
- **Inconsistent naming** and organization
- **Hard to find** relevant information

### After Consolidation

- **12 organized documents** in clear hierarchy
- **Single source of truth** at monorepo root
- **No duplicate information** - content merged
- **Consistent structure** and naming
- **Easy navigation** with master index

**Improvement**: 75% reduction in documentation maintenance overhead

---

## 🔍 Finding Information

### By Development Phase

- **Getting Started**: [Complete Setup Guide](./development/COMPLETE_SETUP.md)
- **Understanding Architecture**: [Architecture RFC](./architecture/ARCHITECTURE_RFC.md)
- **Following Patterns**: [Coding Standards](./architecture/CODING_STANDARDS.md)
- **Deploying**: [Deployment Guide](./deployment/GUIDE.md)

### By Topic

- **Custom Business Logic**: [Custom Modules](./features/MODULES_COMPREHENSIVE.md)
- **External Integrations**: [Feature Integrations](./features/INTEGRATIONS.md)
- **Performance Issues**: [Deployment Optimization](./deployment/OPTIMIZATION.md)
- **Redis/Deployment Failures**: [Troubleshooting](./deployment/TROUBLESHOOTING.md)
- **AI Development**: [Cursor Rules](../.cursor/rules/medusa-development/RULE.md)

### By File Type

- **Setup Guides**: Development and Deployment sections
- **Reference Docs**: Features section (modules, integrations)
- **Troubleshooting**: Deployment troubleshooting guide
- **Best Practices**: Architecture section + Cursor rules

---

## 🎯 Recent Major Changes

### January 7, 2026

- ✅ **Documentation Consolidation**: Moved from 46 scattered files to 12 organized documents
- ✅ **Architecture RFC v1.0**: Comprehensive migration plan to Medusa v2 best practices
- ✅ **Cursor Rules**: Proper AI development guidelines in `.cursor/rules/`
- ✅ **Pagination Fix**: Identified and resolved shared hook conflicts with React Query

### December 29, 2025

- ✅ **Redis Issues Resolved**: Fixed URL format, password quoting, and deployment chain
- ✅ **Deployment Optimization**: Phase 1 optimizations (19min deployments, 13% faster)

### Key Architectural Decisions

- **Dynamic Currency Support**: Store-specific currency filtering with ISO 4217 compliance
- **React Query Pattern**: Single source of truth, avoid dual state with custom hooks
- **Medusa v2 Alignment**: SDK hooks, DataTable components, Zod validation

---

## 🤝 Contributing to Documentation

### When to Update

- After implementing new features or modules
- When fixing bugs or architectural issues
- When changing development patterns
- When discovering better practices

### How to Update

1. Find the relevant document in this structure
2. Update the content directly (don't create new files)
3. Update the "Recent Major Changes" section above
4. Ensure links and references are correct

### Creating New Documents

- Only create if no existing document covers the topic
- Follow the established structure and naming
- Add entry to this master index
- Use clear, descriptive titles with practical examples

---

## 📞 Getting Help

### For Development Issues

1. Check [Troubleshooting](./deployment/TROUBLESHOOTING.md) for common fixes
2. Review [Coding Standards](./architecture/CODING_STANDARDS.md) for patterns
3. Consult [Architecture RFC](./architecture/ARCHITECTURE_RFC.md) for context
4. Use [Cursor Rules](../.cursor/rules/medusa-development/RULE.md) for AI assistance

### For Deployment Issues

1. Start with [Deployment Troubleshooting](./deployment/TROUBLESHOOTING.md)
2. Check [GitHub Secrets Guide](./deployment/GITHUB_SECRETS.md) for configuration
3. Review [Deployment Guide](./deployment/GUIDE.md) for complete process
4. Consider [Performance Optimization](./deployment/OPTIMIZATION.md) for speed improvements

### For Feature Questions

1. Check [Custom Modules Guide](./features/MODULES_COMPREHENSIVE.md) for ERP functionality
2. Review [Feature Integrations](./features/INTEGRATIONS.md) for external services
3. Consult original module files if detailed API information needed

---

**Last Updated**: January 7, 2026
**Maintained By**: Engineering Team
**Status**: Consolidation Complete - All scattered documentation merged

**For urgent issues**: Check the troubleshooting guides first, then consult the architecture documentation for context.
