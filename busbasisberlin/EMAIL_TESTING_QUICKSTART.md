# Email Templates - Quick Start Guide

## Preview All Templates (Recommended First Step)

```bash
cd busbasisberlin
npm run dev:email
```

Open browser to: `http://localhost:3000`

### What You'll See

All **10 email templates** with sample data:

**Order Lifecycle (4):**
1. ✅ **order-placed** - Order confirmation
2. ✅ **order-shipped** - Shipping confirmation with tracking ⭐ NEW
3. ✅ **order-delivered** - Delivery confirmation ⭐ NEW
4. ✅ **order-cancelled** - Cancellation & refund ⭐ NEW

**User Management (2):**
5. ✅ **reset-password** - Password reset link
6. ✅ **user-invited** - Admin team invitation

**Offers (4):**
7. ✅ **offer-active** - Offer ready notification
8. ✅ **offer-accepted** - Offer acceptance confirmation
9. ✅ **offer-completed** - Completion notification
10. ✅ **offer-cancelled** - Cancellation notice

## Configure Email Notifications

### Via Admin UI

1. Start Medusa backend:
   ```bash
   npm run dev
   ```

2. Open admin: `http://localhost:9000/app`

3. Navigate to: **Settings** → Find **Offer Email Notifications**

4. Toggle notifications ON/OFF:
   - Offer Created (default: OFF)
   - Offer Active (default: ON) ✅
   - Offer Accepted (default: ON) ✅
   - Offer Completed (default: ON) ✅
   - Offer Cancelled (default: OFF)

5. Click **Save Settings**

### Via API

```bash
# Get current settings
curl http://localhost:9000/admin/settings/offer-email-notifications

# Update settings
curl -X POST http://localhost:9000/admin/settings/offer-email-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "offer_created": false,
      "offer_active": true,
      "offer_accepted": true,
      "offer_completed": true,
      "offer_cancelled": false
    }
  }'
```

## Test Email Sending

### Prerequisites

1. **Resend API Key** configured in `.env`:
   ```env
   RESEND_API_KEY=re_your_api_key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

2. **Medusa backend running**:
   ```bash
   npm run dev
   ```

### Test Scenarios

#### 1. Test Offer Active Email

```bash
# Create offer and set to active
# Watch logs
docker logs -f medusa-app | grep -E "(OFFER|RESEND)"
```

Expected logs:
```
[OFFER-SUBSCRIBER] Offer status changed: ANG-2024-001 (draft → active)
[RESEND] Attempting to send email to customer@example.com
[RESEND] Email sent successfully via Resend API
```

#### 2. Test via Admin UI

1. Go to **Offers** section
2. Create new offer with customer email
3. Change status from `draft` → `active`
4. Check customer inbox
5. Verify PDF attachment included

#### 3. Verify in Resend Dashboard

1. Login to [Resend Dashboard](https://resend.com/emails)
2. Check recent emails
3. View delivery status
4. Review any errors

## Common Issues

### Emails Not Appearing in Preview

**Solution**: Ensure each template has default export:
```tsx
export default () => <YourEmailComponent {...mockData} />;
```

### Emails Not Sending

**Check 1** - Global settings enabled:
```bash
curl http://localhost:9000/admin/settings/offer-email-notifications
```

**Check 2** - Resend API key valid:
```bash
echo $RESEND_API_KEY  # Should show your key
```

**Check 3** - Customer email set on offer:
```sql
SELECT id, offer_number, customer_email, status
FROM offer
WHERE id = 'your_offer_id';
```

**Check 4** - Review logs:
```bash
# Look for errors
docker logs medusa-app 2>&1 | grep -i error | grep -i email
```

### PDF Not Attaching

**Check S3 upload**:
```bash
# Logs should show:
[OFFER-SUBSCRIBER] PDF generated and uploaded to S3
[OFFER-SUBSCRIBER] Email sent to customer@example.com
```

**Verify S3 bucket** access and `AWS_*` env variables configured.

## Environment Variables Checklist

```bash
# Required for email sending
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Required for PDF attachments
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=your-bucket
AWS_REGION=eu-central-1

# Optional - Company info in emails
COMPANY_NAME="Basis Camp Berlin GmbH"
COMPANY_ADDRESS="Hauptstrasse 51"
COMPANY_POSTAL_CODE="16547"
COMPANY_CITY="Birkenwerder"
COMPANY_EMAIL="info@basiscampberlin.de"
COMPANY_PHONE="+49 (0) 30 123456789"
COMPANY_WEBSITE="https://basiscampberlin.de"
```

## Quick Commands Reference

```bash
# Preview templates
npm run dev:email

# Start backend
npm run dev

# Watch email logs
docker logs -f medusa-app | grep -E "(RESEND|OFFER-SUBSCRIBER)"

# Check settings file
cat data/email-notification-settings.json

# Test email API
curl http://localhost:9000/admin/settings/offer-email-notifications
```

## Next Steps

✅ **All templates now visible in preview**
✅ **All templates properly implemented**
✅ **Settings widget in admin**
✅ **API endpoints functional**

**You can now**:
1. Review templates visually with `npm run dev:email`
2. Configure which emails to send via admin UI
3. Test actual sending with real offers
4. Monitor via Resend dashboard

## Full Documentation

See [EMAIL_TEMPLATES_GUIDE.md](./EMAIL_TEMPLATES_GUIDE.md) for complete details.

