# Webhook Implementation Summary

## ✅ Key Findings

### 1. Webhook Endpoint is AUTOMATIC
- **Medusa v2 automatically creates** `/hooks/payment/[provider_id]` endpoint
- **No manual route file needed** - Medusa handles this internally
- Works as long as Stripe provider is registered in `medusa-config.ts`

### 2. Correct Webhook URL Format
```
https://your-backend-domain/hooks/payment/stripe
```
- Use `stripe` (your provider ID from medusa-config.ts)
- **NOT** `pp_stripe_stripe` (that's the payment provider ID, not webhook route)

### 3. Webhook Events to Configure in Stripe Dashboard
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.amount_capturable_updated`
- `payment_intent.requires_action`
- `payment_intent.processing`

### 4. Architecture: Webhook + Redirect Callback

**Webhook (`/hooks/payment/stripe`):**
- ✅ Source of truth for payment status
- ✅ Handles async payment events
- ✅ Works even if user closes browser
- ✅ Automatically processed by Medusa

**Redirect Callback (`/api/capture-payment/[cartId]`):**
- ✅ UX mechanism for user feedback
- ✅ Handles redirect-based payments (PayPal, iDEAL)
- ✅ Should verify payment status before placing order
- ✅ You already have this implemented ✅

### 5. Payment Flow

**Cards/Apple Pay (no redirect):**
- Stripe sends webhooks even for immediate payments
- Webhook confirms payment → Medusa updates order

**Redirect Methods (PayPal, iDEAL):**
- User redirected → Your callback route
- Webhook confirms payment → Medusa updates order
- **Both fire** - webhook is authoritative

### 6. Best Practices

✅ **Your current implementation is correct:**
- You have redirect callback route ✅
- Medusa handles webhook automatically ✅
- You're using `redirect: 'if_required'` ✅

⚠️ **Recommendations:**
- Ensure Stripe webhook URL points to: `https://your-backend/hooks/payment/stripe`
- Configure all 5 webhook events in Stripe Dashboard
- Your redirect callback should verify payment status before `placeOrder()`
- Consider showing "processing" state if webhook is delayed

## Action Items

1. ✅ **Verify Stripe Dashboard Configuration:**
   - Webhook URL: `https://your-backend-domain/hooks/payment/stripe`
   - Events: All 5 events listed above
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET` env var

2. ✅ **Your redirect callback is good**, but consider:
   - Adding payment status verification before `placeOrder()`
   - Handling race conditions (webhook might arrive first)

3. ✅ **No code changes needed** - Medusa handles webhooks automatically!

## References

- [Medusa Webhook Events](https://docs.medusajs.com/resources/commerce-modules/payment/webhook-events)
- [Stripe Module Provider](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe)
- [Server Webhook Verification](https://docs.medusajs.com/resources/nextjs-starter/guides/customize-stripe#server-webhook-verification)

