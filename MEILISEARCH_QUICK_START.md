# Meilisearch Production - Quick Start Guide

## 🚀 5-Minute Setup

### 1️⃣ Generate Master Key (30 seconds)

```bash
openssl rand -base64 24
# Copy the output - you'll need it for the next step
```

### 2️⃣ Set GitHub Secrets (2 minutes)

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

Add these 3 secrets:

```
Name: MEILISEARCH_MASTER_KEY
Value: [paste the key from step 1]
```

```
Name: MEILISEARCH_HOST
Value: http://medusa_meilisearch:7700
```

```
Name: MEILISEARCH_PRODUCT_INDEX_NAME
Value: products
```

### 3️⃣ Deploy (1 minute)

```bash
git add .
git commit -m "Deploy with Meilisearch"
git push origin main
```

Wait for GitHub Actions to complete (~10 minutes)

### 4️⃣ Get API Key (1 minute)

SSH to your VPS and run:

```bash
docker exec medusa_meilisearch curl -X POST 'http://localhost:7700/keys' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $(docker exec medusa_meilisearch printenv MEILI_MASTER_KEY)" \
  --data-binary '{
    "description": "Medusa Search Key",
    "actions": ["search"],
    "indexes": ["products", "categories"],
    "expiresAt": null
  }' | grep -o '"key":"[^"]*"' | cut -d'"' -f4
```

Copy the key that's printed.

### 5️⃣ Add API Key Secret (30 seconds)

Back to GitHub Secrets, add:

```
Name: MEILISEARCH_API_KEY
Value: [paste the key from step 4]
```

### 6️⃣ Redeploy (1 minute)

```bash
git commit --allow-empty -m "Add Meilisearch API key"
git push origin main
```

### 7️⃣ Verify (30 seconds)

SSH to VPS:

```bash
docker ps | grep meilisearch
docker exec medusa_meilisearch curl http://localhost:7700/health
```

Should see: `{"status":"available"}`

---

## ✅ You're Done!

Meilisearch is now running in production.

### Next Steps:

1. **Initial Sync**

   - Login to Admin Panel: `https://your-domain.com/app`
   - Go to: Settings → Meilisearch
   - Click: "Sync All Products"

2. **Test Search**
   - Visit your storefront
   - Use the search bar
   - You should see results!

---

## 📚 Need More Details?

| Topic                   | Document                                          |
| ----------------------- | ------------------------------------------------- |
| Complete setup guide    | `change-docu/MEILISEARCH_PRODUCTION_SETUP.md`     |
| Architecture & diagrams | `change-docu/MEILISEARCH_ARCHITECTURE.md`         |
| Troubleshooting         | `change-docu/MEILISEARCH_PRODUCTION_CHECKLIST.md` |
| GitHub secrets details  | `setup-deployment/GITHUB_SECRETS_MEILISEARCH.md`  |

---

## 🔧 Quick Commands

```bash
# Check status
docker ps | grep meilisearch

# View logs
docker logs medusa_meilisearch

# Health check
docker exec medusa_meilisearch curl http://localhost:7700/health

# List indexes
docker exec medusa_meilisearch curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:7700/indexes

# Test search
docker exec medusa_meilisearch curl -H "Authorization: Bearer YOUR_API_KEY" \
  'http://localhost:7700/indexes/products/search?q=test'
```

---

## ⚠️ Important Notes

✅ **Meilisearch is INTERNAL** - Not exposed to internet
✅ **Secure by default** - All access through Medusa API
✅ **Master key is 16+ chars** - Use strong random string
✅ **Use search key in app** - Never use master key in code

---

## 🆘 Common Issues

**"Cannot connect"** → Check `MEILISEARCH_HOST` is `http://medusa_meilisearch:7700`
**"Invalid API key"** → Verify `MEILISEARCH_API_KEY` secret is set
**"Key too short"** → Master key must be 16+ characters
**"No results"** → Trigger sync from Admin Panel → Settings → Meilisearch

---

## 📊 Architecture at a Glance

```
Internet
   ↓
Nginx (HTTPS)
   ↓
Medusa API (authenticated)
   ↓
Meilisearch (internal Docker network)
```

**Not exposed publicly = Secure! 🔒**
