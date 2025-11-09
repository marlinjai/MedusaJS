# Server Setup Checklist

**Date:** November 9, 2025
**Status:** Post-Deployment Setup Required

---

## 🚨 Important: One-Time Manual Setup Steps

After successful deployment, you need to run these commands **once** on the server to complete the setup.

---

## 1. SSH into the Server

```bash
ssh deploy@basiscamp-berlin.de
```

---

## 2. Navigate to Project Directory

```bash
cd ~/MedusaJS/busbasisberlin
```

---

## 3. Check Current Deployment

```bash
# Check which deployment is currently active (blue or green)
docker ps | grep medusa_backend_server
```

You should see either:
- `medusa_backend_server_blue` (if blue is active)
- `medusa_backend_server_green` (if green is active)

---

## 4. Run Shipping Profile Assignment Script

This script assigns the default shipping profile to ALL products that don't have one.

**If BLUE deployment is active:**
```bash
docker exec -it medusa_backend_server_blue npx medusa exec ./src/scripts/assign-default-shipping-profile.ts
```

**If GREEN deployment is active:**
```bash
docker exec -it medusa_backend_server_green npx medusa exec ./src/scripts/assign-default-shipping-profile.ts
```

**Expected Output:**
```
🔍 Finding default shipping profile...
✅ Found default shipping profile: Default Shipping Profile (sp_01XXXXX)
🔍 Finding products without shipping profile...
📦 Found 150 products without shipping profile
🔄 Processing batch 1/3 (50 products)...
  ✅ Linked shipping profile to: Product Name 1
  ✅ Linked shipping profile to: Product Name 2
  ...
🔄 Processing batch 2/3 (50 products)...
  ...
🔄 Processing batch 3/3 (50 products)...
  ...

📊 Summary:
  ✅ Successfully updated: 150 products
  📦 Default shipping profile: Default Shipping Profile

✅ Script completed!
```

**If you see "All products already have a shipping profile assigned":**
```
✅ All products already have a shipping profile assigned!
```
This means the script was already run or products were imported correctly. No action needed!

---

## 5. Verify Shipping Works

### Test 1: Check via Admin Dashboard

1. Go to `https://basiscamp-berlin.de` (Admin Dashboard)
2. Products → Select any product
3. Scroll to "Shipping" section
4. Should see: "Default Shipping Profile" selected
5. Should NOT see: No shipping profile assigned

### Test 2: Test Checkout Flow

1. Go to storefront (Vercel URL)
2. Add product to cart
3. Go to checkout
4. Should see shipping options with prices
5. Should NOT see: "⚠️ Keine Versandoptionen verfügbar"

### Test 3: Check API Directly

```bash
# Get a test cart ID first (create one via storefront or API)
# Then check shipping options:
curl "https://basiscamp-berlin.de/store/shipping-options?cart_id=YOUR_CART_ID" \
  -H "x-publishable-api-key: YOUR_KEY"
```

**Expected:** Array of shipping options with prices
**Not Expected:** Empty array `[]`

---

## 6. Optional: Check Database Directly

If you want to verify at the database level:

```bash
# Access postgres container
docker exec -it medusa_postgres psql -U postgres -d medusa-store

# Check products without shipping profile
SELECT
    p.id,
    p.title,
    p.handle,
    p.status,
    p.shipping_profile_id
FROM product p
WHERE p.shipping_profile_id IS NULL
   OR p.shipping_profile_id = '';

# Should return 0 rows after running the script
# Exit postgres
\q
```

---

## 7. Why Is This Needed?

**Background:**

During the initial product import, some products may have been created without a shipping profile if:
1. The default shipping profile didn't exist yet
2. The import ran before shipping profiles were set up
3. Products were manually created via Admin without selecting a shipping profile

**What the Script Does:**

1. Finds the default shipping profile
2. Finds all products without a shipping profile
3. Links them together in batches
4. Reports success/failure for each product

**Why Not Automatic in Deployment?**

The script is a **one-time setup** operation, not a deployment operation. Running it on every deployment would:
- Waste time checking already-linked products
- Add unnecessary load during deployment
- Make deployments slower

Instead, it's a **manual post-deployment setup step** that you run once.

---

## 8. Troubleshooting

### Error: "No default shipping profile found"

**Solution:**
1. Access Admin Dashboard: `https://basiscamp-berlin.de`
2. Go to Settings → Locations & Shipping
3. Create a shipping profile called "Default Shipping Profile"
4. Add shipping options (e.g., "Standard Shipping", "Express")
5. Configure prices and service zones
6. Run the script again

### Error: "Cannot exec into container"

**Check if container is running:**
```bash
docker ps | grep medusa_backend_server
```

**If not running:**
```bash
# Check logs
docker logs medusa_backend_server_blue
# or
docker logs medusa_backend_server_green

# Restart if needed
cd ~/MedusaJS/busbasisberlin
./scripts/deploy.sh
```

### Error: "Script file not found"

**Solution:**
Make sure you're in the correct directory and the latest code is deployed:
```bash
cd ~/MedusaJS/busbasisberlin
git pull
./scripts/deploy.sh
```

---

## 9. Future Deployments

**Good News:** You only need to run this script **ONCE**.

After the initial setup:
- ✅ Normal deployments work without this script
- ✅ New products are automatically assigned the default shipping profile during import
- ✅ Products created via Admin use the default shipping profile

**When to Run Again:**

Only run this script again if:
- You bulk-imported products that bypassed the normal import script
- You manually created many products via Admin without setting shipping profiles
- You're debugging shipping-related issues

---

## 10. Summary

### Required Steps (Do Once):
1. ✅ SSH into server
2. ✅ Navigate to project directory
3. ✅ Run shipping profile script on active deployment container
4. ✅ Verify shipping works in storefront

### Optional Steps:
- Check database to confirm no products without shipping profiles
- Test API endpoints directly
- Review logs for any errors

### Estimated Time: 5 minutes

---

## Quick Command Reference

```bash
# SSH to server
ssh deploy@basiscamp-berlin.de

# Navigate to project
cd ~/MedusaJS/busbasisberlin

# Check active deployment
docker ps | grep medusa_backend_server

# Run script on blue
docker exec -it medusa_backend_server_blue npx medusa exec ./src/scripts/assign-default-shipping-profile.ts

# Run script on green
docker exec -it medusa_backend_server_green npx medusa exec ./src/scripts/assign-default-shipping-profile.ts

# Check logs
docker logs medusa_backend_server_blue --tail 100
docker logs medusa_backend_server_green --tail 100

# Verify database
docker exec -it medusa_postgres psql -U postgres -d medusa-store
```

---

**Status:** Ready to Execute ✅

Once you've run the script successfully, you can delete or archive this checklist. It's a one-time operation!

