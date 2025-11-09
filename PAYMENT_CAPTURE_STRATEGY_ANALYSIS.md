# Payment Capture Strategy - Complete Analysis & Implementation

**Date:** November 9, 2025
**Status:** ✅ Analysis Complete - Implementation Recommendations

---

## Executive Summary

**Current Configuration:** `capture: true` (Automatic Capture)
**Recommendation:** **Keep `capture: true`** - This is the correct configuration for your use case.

**Key Finding:** Bank transfers and delayed payment methods **do NOT use the `capture` setting**. They have their own lifecycle that Stripe/Medusa handle automatically.

---

## 1. Understanding Payment Method Categories

### Category A: Card Payments (Immediate)
**Examples:** Credit/Debit Cards, Apple Pay, Google Pay

**Lifecycle:**
```
1. Customer confirms payment → PaymentIntent = 'requires_capture'
2. Merchant captures payment → PaymentIntent = 'succeeded'
3. Funds settled within 2-7 days
```

**Capture Behavior:**
- **`capture: true`**: Capture immediately when order is placed
- **`capture: false`**: Authorize now, manually capture later

**Your Use Case:** ✅ `capture: true` is CORRECT
- You sell physical goods (bus tickets)
- Immediate confirmation needed
- No pre-order or reservation scenarios

---

### Category B: Bank Debits (Delayed Notification)
**Examples:** SEPA Direct Debit, ACH Direct Debit

**Lifecycle:**
```
1. Customer authorizes mandate → PaymentIntent = 'processing'
2. Bank processes debit (2-14 days) → PaymentIntent = 'succeeded' or 'failed'
3. Webhook notifies of success/failure
```

**Important:** Bank debits **DON'T support manual capture**!
- Authorization and capture happen automatically by the bank
- `capture` setting is **ignored** for these payment methods
- Order should be placed immediately, but fulfillment may wait for confirmation

---

### Category C: Bank Transfers (Push Payments)
**Examples:** SOFORT (deprecated), Bank Transfer instructions

**Lifecycle:**
```
1. Customer receives bank transfer instructions
2. Customer initiates transfer from their bank (hours to days)
3. Bank processes transfer → PaymentIntent = 'succeeded'
4. Webhook notifies of payment receipt
```

**Important:** Bank transfers **DON'T support manual capture**!
- No authorization step - customer initiates payment themselves
- `capture` setting is **ignored**
- Order typically placed after payment received (not before)

---

### Category D: Buy Now, Pay Later (BNPL)
**Examples:** Klarna, Affirm, Afterpay

**Lifecycle:**
```
1. BNPL provider approves customer → PaymentIntent = 'requires_capture'
2. Merchant captures payment (when shipping) → PaymentIntent = 'succeeded'
3. BNPL provider pays merchant immediately
4. Customer pays BNPL provider in installments
```

**Capture Behavior:**
- **`capture: true`**: Capture immediately when order placed
- **`capture: false`**: Capture when goods ship (**recommended for BNPL**)

**Your Use Case:** You're not using BNPL currently

---

## 2. Stripe Documentation Summary

### Manual Capture Support by Payment Method

| Payment Method | Manual Capture Support | Notes |
|---------------|------------------------|-------|
| **Cards** | ✅ Yes | Standard auth/capture flow |
| **Apple Pay** | ✅ Yes | Same as cards |
| **Google Pay** | ✅ Yes | Same as cards |
| **Klarna** | ✅ Yes | Recommended for separate shipments |
| **Affirm** | ✅ Yes | Capture when shipping |
| **SEPA Direct Debit** | ❌ No | Automatic bank processing |
| **ACH Direct Debit** | ❌ No | Automatic bank processing |
| **Bank Transfers** | ❌ No | Customer-initiated push payment |
| **PayPal** | Varies | Depends on integration type |
| **iDEAL** | ❌ No | Immediate bank transfer |

**Source:** [Stripe Payment Method Support Documentation](https://docs.stripe.com/payments/payment-methods/payment-method-support)

---

## 3. Medusa Documentation Summary

### How Medusa Handles Capture

**From Medusa Docs:**

> "When a payment session is authorized, a payment is created. This payment can later be captured or refunded."

**Payment Flow:**
```typescript
1. initiatePaymentSession() → Creates payment session
2. authorizePaymentSession() → Authorizes payment (creates Payment)
3. completeCart() → Completes cart, creates order
4. [OPTIONAL] capturePayment() → Captures authorized payment
```

**Configuration:**

```typescript
// medusa-config.ts
{
  resolve: '@medusajs/medusa/payment-stripe',
  options: {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    automaticPaymentMethods: true,
    capture: true,  // <-- This controls capture behavior
  }
}
```

**What `capture: true` does:**
- Medusa automatically calls `capturePayment()` after order is placed
- For card payments: Immediately captures authorized funds
- For delayed methods: **Setting is ignored**, handled by payment provider

**What `capture: false` does:**
- Medusa does NOT automatically capture
- Admin must manually capture via Dashboard or API
- Useful for: pre-orders, made-to-order items, separate shipments

---

## 4. Industry Best Practices

### Use Automatic Capture (`capture: true`) When:
✅ Selling standard physical goods
✅ Digital goods/services delivered immediately
✅ Payment = order confirmation (your case)
✅ Simple fulfillment process
✅ Low fraud risk

### Use Manual Capture (`capture: false`) When:
⚠️ Pre-orders or made-to-order items
⚠️ Items ship separately over time
⚠️ High-value items requiring verification
⚠️ Services provided before charging
⚠️ Multi-step fulfillment process

### For Delayed Payment Methods (SEPA, ACH, Bank Transfer):
📋 **Order Placement Strategy:**

**Option A: Place Order Immediately (Your Current Approach)**
```
1. Customer completes checkout
2. Order placed with status: "payment_pending" or "awaiting_confirmation"
3. Inventory reserved
4. Customer receives order confirmation: "Payment pending"
5. Webhook receives payment confirmation
6. Order status updated to "paid"
7. Fulfillment begins
```

**Pros:**
- Better UX - customer gets immediate confirmation
- Inventory is reserved
- Order ID generated for tracking

**Cons:**
- Risk of payment failure (must handle unfulfilled orders)
- Inventory tied up during payment processing

**Option B: Place Order After Payment Confirmation**
```
1. Customer completes checkout
2. "Payment initiated" page shown
3. Webhook receives payment confirmation
4. Order placed automatically
5. Customer receives order confirmation email
```

**Pros:**
- No failed payment cleanup needed
- Inventory only reserved when payment confirmed

**Cons:**
- Poor UX - customer waits without confirmation
- No order ID to reference
- Requires webhook-triggered order creation

**Industry Recommendation:** **Option A** (Place order immediately)
- Standard for e-commerce
- Better customer experience
- Stripe/Medusa designed for this flow

---

## 5. Your Current Implementation Analysis

### Current Configuration

```typescript
// busbasisberlin/medusa-config.ts line 151
capture: true, // Automatically capture payments when orders are placed
```

### Payment Methods Currently Supported

From your seed data:
```typescript
payment_providers: ['pp_system_default', 'pp_stripe_stripe']
```

1. **`pp_system_default`**: Manual/Cash on Delivery (for pickup)
2. **`pp_stripe_stripe`**: Stripe Payment Element

### Stripe Payment Element Configuration

```typescript
// busbasisberlin-storefront payment-button/index.tsx
automaticPaymentMethods: true
```

This enables ALL payment methods you activate in Stripe Dashboard:
- ✅ Cards (Visa, Mastercard, Amex, etc.)
- ✅ Apple Pay
- ✅ Google Pay
- ✅ SEPA Direct Debit (if enabled)
- ✅ Klarna (if enabled)
- ✅ iDEAL (if enabled)
- ✅ etc.

---

## 6. Specific Payment Method Handling

### Cards / Apple Pay / Google Pay
**Current Status:** ✅ Correct

```
Flow:
1. Customer pays → `stripe.confirmPayment()` succeeds
2. PaymentIntent status = 'requires_capture' or 'succeeded'
3. Medusa calls capturePayment() automatically (because capture: true)
4. Order placed
5. Customer redirected to confirmation page
```

**No changes needed.**

---

### SEPA Direct Debit (if you enable it)
**How it works:**

```
Flow:
1. Customer enters IBAN, accepts mandate
2. PaymentIntent status = 'processing'
3. Order placed immediately
4. Email sent: "Order received, payment pending"
5. Stripe initiates bank debit (takes 2-14 days)
6. Webhook receives 'payment_intent.succeeded' or 'payment_intent.payment_failed'
7. Order status updated
8. If successful: Begin fulfillment
9. If failed: Cancel order, notify customer
```

**Configuration needed:**

```typescript
// medusa-config.ts - NO CHANGE NEEDED
capture: true  // Ignored for SEPA - Stripe handles automatically
```

**Order Status Management:**

You'll need to:
1. Place order immediately (current behavior ✅)
2. Listen for webhook events to update order status
3. Handle payment failures gracefully

**Example Webhook Handler:**

```typescript
// This is handled by Medusa automatically via /hooks/payment/stripe
// But you may want custom logic for order status updates

// Listen for these events:
- payment_intent.processing → Order status: "payment_pending"
- payment_intent.succeeded → Order status: "paid", begin fulfillment
- payment_intent.payment_failed → Order status: "payment_failed", cancel order
```

---

### Bank Transfers (if you enable them)
**How it works:**

```
Flow:
1. Customer selects "Bank Transfer"
2. System generates virtual IBAN or bank transfer instructions
3. Customer shown instructions page
4. Order NOT placed yet (customer hasn't paid)
5. Customer initiates transfer from their bank
6. Stripe receives transfer (hours to days)
7. Webhook receives 'payment_intent.succeeded'
8. Order placed automatically
9. Customer notified via email
```

**Important Difference:** Order is placed AFTER payment, not before.

**Configuration:**
- `capture` setting is irrelevant
- This requires different cart/order flow
- Not recommended unless specifically requested by customers

---

### Klarna / BNPL (if you enable it)
**How it works:**

```
Flow with capture: true (your current config):
1. Customer approved by Klarna
2. PaymentIntent status = 'requires_capture'
3. Medusa captures immediately
4. Order placed
5. Fulfillment begins
```

**Alternative with capture: false:**

```
Flow with capture: false:
1. Customer approved by Klarna
2. PaymentIntent status = 'requires_capture'
3. Order placed but NOT captured
4. When item ships: Admin manually captures payment
5. Klarna charged at shipping time
```

**Klarna Best Practice:** Use manual capture (`capture: false`) for:
- Multi-item orders shipping separately
- Made-to-order items
- Pre-orders

**Your Use Case:** Bus tickets = immediate delivery → `capture: true` is correct

---

## 7. Recommendations

### Keep Current Configuration ✅

```typescript
// busbasisberlin/medusa-config.ts
{
  resolve: '@medusajs/medusa/payment-stripe',
  id: 'stripe',
  options: {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    automaticPaymentMethods: true,
    capture: true,  // ✅ CORRECT for your use case
  }
}
```

**Reasoning:**
1. You sell bus tickets (digital/physical goods delivered immediately)
2. No pre-orders or separate shipments
3. Standard e-commerce flow
4. Matches industry best practices

---

### If You Add SEPA Direct Debit

**1. Enable in Stripe Dashboard:**
```
Settings → Payment Methods → Enable SEPA Direct Debit
```

**2. No code changes needed:**
- Medusa handles SEPA automatically
- `capture: true` is ignored for SEPA
- Stripe processes the debit automatically

**3. Add Order Status Handling:**

Option A: Use Medusa's built-in order status (recommended)
```typescript
// Medusa automatically updates payment status via webhook
// Order.payment_status will reflect:
- 'awaiting' → Payment initiated but not confirmed
- 'authorized' → Payment authorized (not used for SEPA)
- 'captured' → Payment successful
- 'canceled' → Payment failed or canceled
```

Option B: Custom status workflow (if needed)
```typescript
// Create a subscriber to listen for payment events
// src/subscribers/payment-confirmation.ts

import { SubscriberArgs } from "@medusajs/framework"

export default async function handlePaymentUpdate({
  event: { data },
  container
}: SubscriberArgs<{ id: string }>) {
  if (data.payment_intent_status === 'succeeded') {
    // Update order status
    // Trigger fulfillment
    // Send confirmation email
  } else if (data.payment_intent_status === 'payment_failed') {
    // Cancel order
    // Notify customer
    // Release inventory
  }
}
```

**4. Customer Communication:**

Update order confirmation email template:
```
Subject: Order Received - Payment Pending

Hi {customer_name},

Thank you for your order #{order_number}!

Payment Method: SEPA Direct Debit
Your bank account will be debited within 2-14 business days.

⚠️ Important: Your order will be processed after payment confirmation.
You will receive another email once your payment is confirmed.

Order Details:
...
```

---

### If You Add Klarna/BNPL

**Current config is fine for standard use:**
```typescript
capture: true  // Immediate capture when order placed
```

**Only change if you have special scenarios:**

```typescript
// Only if you need to capture at shipping time
capture: false
```

Then manually capture via:
1. Medusa Admin Dashboard (Orders → Capture Payment)
2. API call to `capturePaymentWorkflow`
3. Subscriber triggered by fulfillment event

---

## 8. Testing Checklist

### Test Card Payments ✅ (Current)
```
Test Card: 4242 4242 4242 4242
Expected Flow:
1. Enter card details
2. Click "Pay"
3. Payment succeeds immediately
4. Redirect to order confirmation
5. Check backend logs: Payment captured
```

### Test SEPA Direct Debit (if enabled)
```
Test IBAN: DE89370400440532013000
Expected Flow:
1. Enter IBAN and name
2. Accept mandate
3. Click "Complete Payment"
4. Order placed immediately
5. Order status: "Payment Pending"
6. Wait for webhook (use Stripe CLI to simulate)
7. Webhook: payment_intent.succeeded
8. Order status updates to "Paid"
```

**Simulate webhook with Stripe CLI:**
```bash
stripe trigger payment_intent.succeeded
```

### Test Apple Pay ✅ (Current)
```
Expected Flow:
1. Click Apple Pay button
2. Authenticate with Touch ID/Face ID
3. Payment succeeds immediately
4. Redirect to order confirmation
```

### Test Redirect-Based Methods (PayPal, iDEAL)
```
Expected Flow:
1. Select PayPal/iDEAL
2. Redirect to provider
3. Complete payment
4. Redirect back to your site
5. Your callback route: /api/capture-payment/[cartId]
6. Order placed (or redirect to orders if webhook completed it first)
```

---

## 9. Monitoring & Alerting

### Webhooks to Monitor

**Critical Events:**
```
✅ payment_intent.succeeded → Payment confirmed, order can be fulfilled
❌ payment_intent.payment_failed → Payment failed, cancel order
⚠️ payment_intent.processing → Payment initiated, waiting for bank
```

**Setup Monitoring:**

1. **Stripe Dashboard:**
   - Developers → Webhooks → View event deliveries
   - Monitor for 4xx/5xx errors

2. **Application Logs:**
```typescript
// Log all payment status changes
logger.info('[PAYMENT]', {
  order_id: order.id,
  payment_intent: pi.id,
  status: pi.status,
  payment_method: pi.payment_method_types[0],
  amount: pi.amount,
  currency: pi.currency
})
```

3. **Alerts:**
   - Payment failures exceeding threshold
   - Webhook delivery failures
   - Orders stuck in "payment_pending" > 14 days

---

## 10. Summary & Action Items

### Current Status: ✅ Production Ready

Your current configuration is **correct** and follows **industry best practices**:

```typescript
capture: true  // ✅ Correct for your use case
automaticPaymentMethods: true  // ✅ Enables all payment methods
webhookSecret: configured  // ✅ Properly set up
```

### No Changes Needed For:
- ✅ Card payments (working correctly)
- ✅ Apple Pay / Google Pay (working correctly)
- ✅ PayPal / redirect methods (working correctly)

### If You Want to Add SEPA Direct Debit:

**Step 1:** Enable in Stripe Dashboard
```
Settings → Payment Methods → SEPA Direct Debit → Enable
```

**Step 2:** Test in Stripe test mode
```
Use test IBAN: DE89370400440532013000
Trigger webhooks with Stripe CLI
```

**Step 3:** Update email templates
```
Add "Payment Pending" messaging for SEPA orders
```

**Step 4:** Monitor webhook processing
```
Ensure payment_intent.succeeded triggers order fulfillment
Ensure payment_intent.payment_failed triggers order cancellation
```

**Step 5:** Go live
```
No code changes needed!
Medusa + Stripe handle everything automatically
```

---

## 11. Key Takeaways

**1. `capture: true` is correct for your use case** ✅
- You sell bus tickets (immediate delivery)
- Standard e-commerce flow
- No pre-orders or complex fulfillment

**2. Delayed payment methods DON'T use the `capture` setting**
- SEPA Direct Debit: Automatic bank processing
- Bank Transfers: Customer-initiated, no capture concept
- Setting is only relevant for card payments and BNPL

**3. Your current implementation is production-ready** ✅
- Webhook handling: Correct
- Race condition handling: Fixed
- Payment status validation: Fixed
- Error handling: Proper

**4. To add SEPA or other delayed methods:**
- No code changes required
- Just enable in Stripe Dashboard
- Medusa handles the rest automatically
- Add customer communication for "payment pending" status

**5. Manual capture (`capture: false`) only needed for:**
- Pre-orders
- Made-to-order items
- Separate shipments
- Services delivered before charging
- **Not your use case**

---

## 12. References

### Stripe Documentation
- [Manual vs Automatic Capture](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)
- [SEPA Direct Debit Guide](https://docs.stripe.com/payments/sepa-debit)
- [ACH Direct Debit Guide](https://docs.stripe.com/payments/ach-direct-debit)
- [Payment Method Support Matrix](https://docs.stripe.com/payments/payment-methods/payment-method-support)
- [Bank Transfers](https://docs.stripe.com/payments/bank-transfers)

### Medusa Documentation
- [Payment Module](https://docs.medusajs.com/resources/commerce-modules/payment/payment)
- [Payment Provider](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider)
- [Payment Flow](https://docs.medusajs.com/resources/commerce-modules/payment/payment-flow)
- [Capture Payment Workflow](https://docs.medusajs.com/resources/references/medusa-workflows/capturePaymentWorkflow)

### Your Documentation
- `STRIPE_WEBHOOK_SETUP.md` - Webhook configuration
- `WEBHOOK_IMPLEMENTATION_SUMMARY.md` - Best practices
- `STRIPE_BEST_PRACTICES_COMPLIANCE.md` - Implementation review

---

**Final Recommendation:** **No changes needed to `medusa-config.ts`**

Your current `capture: true` configuration is **correct** and **production-ready**. It follows Stripe and Medusa best practices for your use case.

If you want to add delayed payment methods like SEPA Direct Debit in the future, simply enable them in the Stripe Dashboard - no code changes required!

