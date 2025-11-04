# Stripe Webhook Setup Guide

**Date:** November 4, 2025
**Issue:** Stripe webhook returning 404, checkout failing
**Status:** ✅ Fixed - Requires Stripe Dashboard Configuration

## Problem

1. **Stripe webhook returning 404:**
   ```
   404 ERR
   https://basiscamp-berlin.de/app/hooks/payment/stripe_stripe
   ```

2. **Checkout error:**
   ```
   An error occurred in the Server Components render.
   ```

## Root Cause

**Wrong webhook URL in Stripe dashboard:**
- Current: `https://basiscamp-berlin.de/app/hooks/payment/stripe_stripe`
- Correct: `https://basiscamp-berlin.de/hooks/payment/stripe`

The `/app` prefix is hitting the Next.js admin app instead of the Medusa backend.

## Solution

### Step 1: Webhook Route Created ✅

Created webhook handler at:
- `src/api/hooks/payment/[provider_id]/route.ts`

This endpoint will receive webhook events from Stripe and process them.

### Step 2: Update Stripe Webhook URL ⚠️ REQUIRED

**In Stripe Dashboard:**

1. Go to **Developers → Webhooks**
2. Find your webhook endpoint (or create new)
3. **Update the URL to:**
   ```
   https://basiscamp-berlin.de/hooks/payment/stripe
   ```
   **NOT:** `/app/hooks/payment/stripe_stripe`

4. **Select events to listen for:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.amount_capturable_updated`
   - `charge.succeeded`
   - `charge.failed`

5. **Copy the webhook signing secret:**
   - Click on the webhook endpoint
   - Click "Reveal" next to "Signing secret"
   - Copy the secret (starts with `whsec_...`)

### Step 3: Update Environment Variable ⚠️ REQUIRED

**Update `.env` file:**

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

**Or in Docker Compose:**

```yaml
environment:
  - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
```

### Step 4: Redeploy

After updating the webhook URL and secret:

```bash
git add .
git commit -m "fix: Add Stripe webhook endpoint handler"
git push origin main
```

## Testing

### Test 1: Verify Webhook Endpoint

```bash
# Test webhook endpoint (should return 200, not 404)
curl -X POST https://basiscamp-berlin.de/hooks/payment/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Test 2: Test Checkout Flow

1. Add product to cart
2. Go to checkout
3. Fill in address
4. Select shipping method
5. Select payment method
6. Enter card details (test: `4242 4242 4242 4242`)
7. Click "Place order"
8. Should complete successfully without errors

### Test 3: Verify Webhook in Stripe

1. Go to Stripe Dashboard → Webhooks
2. Click on your webhook endpoint
3. Check "Recent deliveries"
4. Should show successful deliveries (200 OK)
5. Click on an event to see the response

## Webhook Handler Details

The webhook handler (`src/api/hooks/payment/[provider_id]/route.ts`) does:

1. **Receives webhook events** from Stripe
2. **Forwards to payment module** for processing
3. **Logs events** for debugging
4. **Returns 200** to acknowledge receipt (prevents Stripe retries)

## Common Issues

### Issue 1: Still Getting 404

**Check:**
- Webhook URL in Stripe dashboard is correct
- Route file exists: `src/api/hooks/payment/[provider_id]/route.ts`
- Backend is deployed and running

**Fix:**
- Verify route exists: `ls -la src/api/hooks/payment/[provider_id]/route.ts`
- Rebuild and redeploy backend

### Issue 2: Webhook Secret Mismatch

**Symptoms:**
- Webhook receives events but fails validation
- Payment status doesn't update

**Fix:**
- Update `STRIPE_WEBHOOK_SECRET` in environment
- Restart backend after updating env var

### Issue 3: Checkout Still Failing

**Check:**
- Browser console for errors
- Backend logs for webhook processing errors
- Payment intent status in Stripe dashboard

**Fix:**
- Ensure payment session is created correctly
- Verify `STRIPE_API_KEY` is set correctly
- Check that payment module is configured properly

## Files Modified

1. ✅ `src/api/hooks/payment/[provider_id]/route.ts` - Webhook handler created

## Next Steps

1. **Update Stripe webhook URL** in dashboard (CRITICAL)
2. **Update `STRIPE_WEBHOOK_SECRET`** environment variable
3. **Redeploy backend**
4. **Test checkout flow**
5. **Verify webhook deliveries** in Stripe dashboard

## References

- [Medusa Payment Module](https://docs.medusajs.com/resources/references/medusa-payment)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Medusa Stripe Integration](https://docs.medusajs.com/resources/references/core-flows/Common/setPaymentProvidersStep)

