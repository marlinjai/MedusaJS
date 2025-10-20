# Meilisearch Production Deployment Checklist

## Pre-Deployment Setup

### Step 1: Generate Secure Master Key

- [ ] Generate a secure random string (minimum 16 characters)
  ```bash
  openssl rand -base64 24
  ```
- [ ] Save this key securely (you'll need it for all deployments)

### Step 2: Set Initial GitHub Secrets

Navigate to: `GitHub Repository → Settings → Secrets and variables → Actions`

- [ ] Add secret: `MEILISEARCH_MASTER_KEY`

  - Value: Your generated master key from Step 1

- [ ] Add secret: `MEILISEARCH_HOST`

  - Value: `http://medusa_meilisearch:7700`

- [ ] Add secret: `MEILISEARCH_PRODUCT_INDEX_NAME`
  - Value: `products`

### Step 3: First Deployment

- [ ] Commit and push your code to trigger deployment
- [ ] Wait for deployment to complete
- [ ] Verify Meilisearch container is running:
  ```bash
  ssh user@your-vps
  docker ps | grep meilisearch
  ```

### Step 4: Generate API Key

- [ ] SSH into your VPS
- [ ] Get the default search key:
  ```bash
  docker exec medusa_meilisearch curl -X GET 'http://localhost:7700/keys' \
    -H "Authorization: Bearer YOUR_MASTER_KEY"
  ```
- [ ] Look for a key with `"actions": ["search"]`
- [ ] Copy the `"key"` value

**OR** generate a new custom key:

```bash
docker exec medusa_meilisearch curl -X POST 'http://localhost:7700/keys' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  --data-binary '{
    "description": "Medusa Search Key",
    "actions": ["search"],
    "indexes": ["products", "categories"],
    "expiresAt": null
  }'
```

### Step 5: Set API Key Secret

- [ ] Go back to GitHub Secrets
- [ ] Add secret: `MEILISEARCH_API_KEY`
  - Value: The key you got/generated in Step 4

### Step 6: Final Deployment

- [ ] Push a commit to trigger redeployment with all secrets
- [ ] Verify everything works (see Verification section below)

---

## Verification Checklist

### Container Health

- [ ] Check Meilisearch container is running:

  ```bash
  docker ps | grep meilisearch
  ```

- [ ] Check Meilisearch health endpoint:

  ```bash
  docker exec medusa_meilisearch curl http://localhost:7700/health
  # Expected: {"status":"available"}
  ```

- [ ] Check Medusa containers are running:
  ```bash
  docker ps | grep medusa_backend
  ```

### Environment Variables

- [ ] Verify Meilisearch container has master key:

  ```bash
  docker exec medusa_meilisearch env | grep MEILI_MASTER_KEY
  ```

- [ ] Verify Medusa server has Meilisearch variables:

  ```bash
  docker exec medusa_backend_server_blue env | grep MEILISEARCH
  # OR for green:
  docker exec medusa_backend_server_green env | grep MEILISEARCH
  ```

  Should show:

  ```
  MEILISEARCH_HOST=http://medusa_meilisearch:7700
  MEILISEARCH_API_KEY=...
  MEILISEARCH_MASTER_KEY=...
  MEILISEARCH_PRODUCT_INDEX=products
  MEILISEARCH_CATEGORY_INDEX=categories
  ```

### Connectivity Test

- [ ] Test Medusa can reach Meilisearch:

  ```bash
  docker exec medusa_backend_server_blue curl \
    -H "Authorization: Bearer YOUR_API_KEY" \
    http://medusa_meilisearch:7700/indexes
  ```

  Should return list of indexes (may be empty initially)

### Index Creation

- [ ] Check if indexes exist:

  ```bash
  docker exec medusa_meilisearch curl \
    -H "Authorization: Bearer YOUR_API_KEY" \
    http://localhost:7700/indexes
  ```

- [ ] If empty, trigger initial sync from Admin panel:

  - Navigate to: `Settings → Meilisearch`
  - Click "Sync All Products"

- [ ] Verify indexes were created:

  ```bash
  docker exec medusa_meilisearch curl \
    -H "Authorization: Bearer YOUR_API_KEY" \
    http://localhost:7700/indexes
  ```

  Should show `products` and `categories` indexes

### Application Logs

- [ ] Check Medusa server logs for errors:

  ```bash
  docker logs medusa_backend_server_blue | grep -i error
  docker logs medusa_backend_server_blue | grep -i meilisearch
  ```

- [ ] Check Medusa worker logs:

  ```bash
  docker logs medusa_backend_worker_blue | grep -i error
  docker logs medusa_backend_worker_blue | grep -i meilisearch
  ```

- [ ] Check Meilisearch logs:
  ```bash
  docker logs medusa_meilisearch
  ```

### Functionality Tests

#### Test 1: Admin Panel Meilisearch Settings

- [ ] Login to Admin panel: `https://your-domain.com/app`
- [ ] Navigate to: `Settings → Meilisearch`
- [ ] Page loads without errors
- [ ] Can see index statistics
- [ ] Can trigger manual sync

#### Test 2: Product Sync

- [ ] Create or update a product in Admin panel
- [ ] Wait 5-10 seconds
- [ ] Check if product appears in Meilisearch:
  ```bash
  docker exec medusa_meilisearch curl \
    -H "Authorization: Bearer YOUR_API_KEY" \
    'http://localhost:7700/indexes/products/search?q=YOUR_PRODUCT_NAME'
  ```

#### Test 3: Storefront Search

- [ ] Visit your storefront
- [ ] Use the search functionality
- [ ] Verify search results appear
- [ ] Try different search terms
- [ ] Verify results are relevant

#### Test 4: API Endpoint

- [ ] Test the Medusa search endpoint:
  ```bash
  curl 'https://your-domain.com/store/products?q=test'
  ```
- [ ] Should return products matching "test"

---

## Troubleshooting Guide

### Issue: "Cannot connect to Meilisearch"

**Check 1:** Verify `MEILISEARCH_HOST` is correct

```bash
docker exec medusa_backend_server_blue env | grep MEILISEARCH_HOST
# Should be: http://medusa_meilisearch:7700
```

**Check 2:** Verify containers are on same network

```bash
docker network inspect busbasisberlin_medusa_network
# Should show both Meilisearch and Medusa containers
```

**Check 3:** Test connectivity from Medusa container

```bash
docker exec medusa_backend_server_blue ping medusa_meilisearch
docker exec medusa_backend_server_blue curl http://medusa_meilisearch:7700/health
```

### Issue: "Invalid API key"

**Check 1:** Verify API key in GitHub secrets

- Go to GitHub → Settings → Secrets
- Check `MEILISEARCH_API_KEY` is set

**Check 2:** Verify API key in container

```bash
docker exec medusa_backend_server_blue env | grep MEILISEARCH_API_KEY
```

**Check 3:** List all keys in Meilisearch

```bash
docker exec medusa_meilisearch curl -X GET 'http://localhost:7700/keys' \
  -H "Authorization: Bearer YOUR_MASTER_KEY"
```

**Check 4:** Generate a new key if needed (see Step 4 above)

### Issue: "MEILI_MASTER_KEY is too short"

**Solution:** Master key must be at least 16 characters

- Generate a new key: `openssl rand -base64 24`
- Update GitHub secret: `MEILISEARCH_MASTER_KEY`
- Redeploy

### Issue: Indexes are empty

**Check 1:** Verify indexes exist

```bash
docker exec medusa_meilisearch curl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:7700/indexes
```

**Check 2:** Trigger manual sync

- Admin Panel → Settings → Meilisearch → Sync All Products

**Check 3:** Check worker logs for sync errors

```bash
docker logs medusa_backend_worker_blue | grep -i meilisearch
```

**Check 4:** Verify subscribers are loaded

```bash
docker logs medusa_backend_server_blue | grep -i subscriber
```

### Issue: Search returns no results

**Check 1:** Verify products are in index

```bash
docker exec medusa_meilisearch curl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  'http://localhost:7700/indexes/products/stats'
```

**Check 2:** Test Meilisearch directly

```bash
docker exec medusa_meilisearch curl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  'http://localhost:7700/indexes/products/search?q='
```

**Check 3:** Check searchable attributes

```bash
docker exec medusa_meilisearch curl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:7700/indexes/products/settings/searchable-attributes
```

---

## Maintenance

### Regular Tasks

#### Weekly

- [ ] Check Meilisearch disk usage:
  ```bash
  docker exec medusa_meilisearch du -sh /meili_data
  ```
- [ ] Review search performance in logs

#### Monthly

- [ ] Verify all products are indexed
- [ ] Test search accuracy with sample queries
- [ ] Review and optimize search settings if needed

### Key Rotation (Every 3-6 months)

#### Rotate API Key

1. Generate new key in Meilisearch
2. Update GitHub secret: `MEILISEARCH_API_KEY`
3. Deploy
4. Delete old key from Meilisearch

#### Rotate Master Key (Advanced)

⚠️ **Warning:** This requires downtime and careful planning

1. Stop all Medusa containers
2. Update `MEILISEARCH_MASTER_KEY` in GitHub secrets
3. Restart Meilisearch container with new key
4. Generate new API keys
5. Update API key secret
6. Deploy Medusa containers

### Backup

#### Index Backup

```bash
# Create dump
docker exec medusa_meilisearch curl -X POST \
  -H "Authorization: Bearer YOUR_MASTER_KEY" \
  http://localhost:7700/dumps

# List dumps
docker exec medusa_meilisearch ls -la /meili_data/dumps/

# Copy dump out of container
docker cp medusa_meilisearch:/meili_data/dumps/DUMP_FILE.dump ./backup/
```

#### Volume Backup

```bash
# Backup Meilisearch data volume
docker run --rm \
  -v busbasisberlin_meilisearch_data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/meilisearch-backup-$(date +%Y%m%d).tar.gz -C /data .
```

---

## Security Checklist

### Access Control

- [ ] Meilisearch is NOT exposed publicly via nginx
- [ ] Master key is at least 16 characters
- [ ] Master key is kept secure and not shared
- [ ] API keys have minimal required permissions
- [ ] Only search key is used in application code
- [ ] Master key is only used for admin operations

### Network Security

- [ ] Meilisearch only accessible via internal Docker network
- [ ] No direct public access to port 7700
- [ ] All external requests go through Medusa API
- [ ] Nginx rate limiting is enabled

### Monitoring

- [ ] Set up alerts for Meilisearch container failures
- [ ] Monitor disk usage for Meilisearch data
- [ ] Track search query performance
- [ ] Review logs regularly for suspicious activity

---

## Performance Optimization

### Index Settings

- [ ] Configure searchable attributes for optimal performance
- [ ] Set up filterable attributes for categories/tags
- [ ] Configure sortable attributes for price/date sorting
- [ ] Review and optimize ranking rules

### Resource Allocation

- [ ] Monitor Meilisearch memory usage
- [ ] Adjust Docker resource limits if needed
- [ ] Monitor index update times
- [ ] Set up index health monitoring

---

## Final Verification

Once everything is complete, verify end-to-end:

1. [ ] All 4 GitHub secrets are set correctly
2. [ ] Meilisearch container is healthy and running
3. [ ] Medusa containers can connect to Meilisearch
4. [ ] Indexes exist and contain data
5. [ ] Admin panel Meilisearch settings page works
6. [ ] Product sync works (create test product)
7. [ ] Storefront search returns results
8. [ ] API search endpoint works
9. [ ] No errors in any container logs
10. [ ] Documentation is updated and accessible

---

## Support & Documentation

**Created Documentation:**

- `MEILISEARCH_PRODUCTION_SETUP.md` - Complete setup guide
- `MEILISEARCH_ARCHITECTURE.md` - Architecture diagrams
- `MEILISEARCH_DEPLOYMENT_CHANGES.md` - What was changed
- `GITHUB_SECRETS_MEILISEARCH.md` - GitHub secrets setup
- `MEILISEARCH_PRODUCTION_CHECKLIST.md` - This checklist

**Key Files:**

- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `busbasisberlin/docker-compose.base.yml` - Meilisearch container
- `busbasisberlin/docker-compose.blue.yml` - Blue deployment env vars
- `busbasisberlin/docker-compose.green.yml` - Green deployment env vars
- `busbasisberlin/medusa-config.ts` - Meilisearch module config
- `busbasisberlin/src/modules/meilisearch/` - Meilisearch service

---

## Quick Commands Reference

```bash
# Check Meilisearch status
docker ps | grep meilisearch
docker logs medusa_meilisearch

# Check Medusa status
docker ps | grep medusa_backend
docker logs medusa_backend_server_blue

# Test connectivity
docker exec medusa_backend_server_blue curl http://medusa_meilisearch:7700/health

# List indexes
docker exec medusa_meilisearch curl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:7700/indexes

# Search test
docker exec medusa_meilisearch curl \
  -H "Authorization: Bearer YOUR_API_KEY" \
  'http://localhost:7700/indexes/products/search?q=test'

# View environment variables
docker exec medusa_backend_server_blue env | grep MEILISEARCH

# Restart Meilisearch
docker restart medusa_meilisearch
```
