# Stripe AI Prompt (2000 chars max)

## Context

MedusaJS v2 + Stripe PaymentElement integration. Using `confirmPayment()` with `redirect: 'if_required'`. Have frontend redirect callback `/api/capture-payment/[cartId]` for PayPal/iDEAL. Need webhook guidance.

## Questions

1. **Webhook Events for PaymentElement:**
   - Using `confirmPayment()` with `redirect: 'if_required'` - which webhook events should I listen for?
   - `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.amount_capturable_updated` - are these correct?
   - Any other events needed?

2. **Payment Flow:**
   - Cards/Apple Pay (no redirect): Does Stripe send webhooks even when payment succeeds immediately in `confirmPayment()`?
   - Redirect methods (PayPal/iDEAL): Should I rely on redirect callback OR webhook, or both?
   - What if redirect succeeds but webhook fails (or vice versa)?

3. **Best Practices:**
   - Should I handle both redirect callback AND webhook, or is one primary?
   - How to handle race conditions between redirect and webhook?
   - Recommended pattern for ensuring order completion?

4. **Webhook vs Redirect:**
   - When is webhook the source of truth vs redirect callback?
   - For `requires_capture` status - webhook or redirect?

Payment methods: Cards, Apple Pay, Google Pay, PayPal, iDEAL, Klarna. Production deployment.

