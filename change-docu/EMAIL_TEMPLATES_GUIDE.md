# Email Templates Guide

## Overview

This document describes the email template system for BusBasis Berlin, including all available templates, how to preview them, and how to configure email notifications.

## Available Email Templates

### Order Lifecycle Templates

#### 1. **Order Placed** (`order-placed`)
- **File**: `src/modules/resend/emails/order-placed.tsx`
- **Trigger**: When a customer places an order
- **Purpose**: Confirmation email with order details, items, and totals
- **Subscriber**: `src/subscribers/order-placed.ts`

#### 2. **Order Shipped** (`order-shipped`)
- **File**: `src/modules/resend/emails/order-shipped.tsx`
- **Trigger**: When a fulfillment is created (order shipped)
- **Purpose**: Shipping confirmation with tracking number and carrier info
- **Subscriber**: `src/subscribers/fulfillment-events.ts`
- **Includes**: Tracking number, carrier, estimated delivery, tracking URL

#### 3. **Order Delivered** (`order-delivered`)
- **File**: `src/modules/resend/emails/order-delivered.tsx`
- **Trigger**: When fulfillment is marked as delivered
- **Purpose**: Delivery confirmation and customer satisfaction follow-up
- **Subscriber**: `src/subscribers/fulfillment-events.ts`

#### 4. **Order Cancelled** (`order-cancelled`)
- **File**: `src/modules/resend/emails/order-cancelled.tsx`
- **Trigger**: When an order is cancelled
- **Purpose**: Cancellation confirmation with refund information
- **Includes**: Cancellation reason, refund amount, refund method

### User Management Templates

#### 5. **Password Reset** (`password-reset`)
- **File**: `src/modules/resend/emails/reset-password.tsx`
- **Trigger**: When a user requests a password reset
- **Purpose**: Provides secure link to reset password
- **Security**: 24-hour expiration notice

#### 6. **User Invited** (`user-invited`)
- **File**: `src/modules/resend/emails/user-invited.tsx`
- **Trigger**: When an admin invites a new team member
- **Purpose**: Invitation to join the admin team with setup link
- **Subscriber**: `src/subscribers/user-invited.ts`

### Offer Templates (Configurable)

#### 7. **Offer Active** (`offer-active`)
- **File**: `src/modules/resend/emails/offer-active.tsx`
- **Trigger**: When an offer becomes active and ready to send to customer
- **Purpose**: Notifies customer that their offer is ready with PDF attachment
- **Configurable**: Yes (via Admin Settings)
- **Subscriber**: `src/subscribers/offer-events.ts`

#### 8. **Offer Accepted** (`offer-accepted`)
- **File**: `src/modules/resend/emails/offer-accepted.tsx`
- **Trigger**: When a customer accepts an offer
- **Purpose**: Confirmation that offer was accepted with next steps
- **Configurable**: Yes (via Admin Settings)
- **Subscriber**: `src/subscribers/offer-events.ts`

#### 9. **Offer Completed** (`offer-completed`)
- **File**: `src/modules/resend/emails/offer-completed.tsx`
- **Trigger**: When an offer is fulfilled and completed
- **Purpose**: Notifies customer that their order is complete
- **Configurable**: Yes (via Admin Settings)
- **Subscriber**: `src/subscribers/offer-events.ts`

#### 10. **Offer Cancelled** (`offer-cancelled`)
- **File**: `src/modules/resend/emails/offer-cancelled.tsx`
- **Trigger**: When an offer is cancelled
- **Purpose**: Confirmation of cancellation with important notes
- **Configurable**: Yes (via Admin Settings)
- **Subscriber**: `src/subscribers/offer-events.ts`

## Email Template Architecture

### Service Layer
- **Location**: `src/modules/resend/service.ts`
- **Provider**: Resend API
- **Features**:
  - Template management
  - Subject line handling
  - Attachment support (for offer PDFs)
  - Error handling and logging

### Company Information
- **Location**: `src/modules/resend/utils/company-info.ts`
- **Purpose**: Centralized company details for email templates
- **Configuration**: Via environment variables
  - `COMPANY_NAME`
  - `COMPANY_ADDRESS`
  - `COMPANY_POSTAL_CODE`
  - `COMPANY_CITY`
  - `COMPANY_EMAIL`
  - `COMPANY_PHONE`
  - `COMPANY_WEBSITE`

## Previewing Email Templates

### Running the Preview Server

```bash
npm run dev:email
```

This command starts the React Email preview server at `http://localhost:3000`

### What You'll See

The preview server displays **all 10 email templates** with sample data:

**Order Lifecycle:**
- ✅ Order Placed - Confirmation with items
- ✅ Order Shipped - Tracking information
- ✅ Order Delivered - Delivery confirmation
- ✅ Order Cancelled - Cancellation & refund

**User Management:**
- ✅ Password Reset - Secure reset link
- ✅ User Invited - Team invitation

**Offers:**
- ✅ Offer Active - Ready to send
- ✅ Offer Accepted - Acceptance confirmation
- ✅ Offer Completed - Completion notice
- ✅ Offer Cancelled - Cancellation notice

Each template is rendered with mock data for design and content review.

### Preview Features
- **Live Preview**: See exactly how emails will look
- **Responsive Design**: Test on different screen sizes
- **Dark/Light Mode**: Check appearance in both modes
- **HTML/Plain Text**: Toggle between formats
- **Export**: Download HTML for testing

## Configuring Email Notifications

### Admin Interface

1. Navigate to **Settings** in the admin panel
2. Find **Offer Email Notifications** widget
3. Toggle each notification type:
   - **Offer Created**: Draft offers (default: OFF)
   - **Offer Active**: Ready to send (default: ON)
   - **Offer Accepted**: Customer accepted (default: ON)
   - **Offer Completed**: Order fulfilled (default: ON)
   - **Offer Cancelled**: Offer cancelled (default: OFF)

### How It Works

**Global Master Switch**:
- Settings in admin act as master switches
- If disabled globally, no emails sent for ANY offer
- If enabled globally, individual offer settings are checked

**Per-Offer Settings**:
- Each offer can override global settings
- Set via `email_notifications` field on offer
- Allows fine-grained control per customer

### API Endpoints

**Get Settings**:
```bash
GET /admin/settings/offer-email-notifications
```

**Update Settings**:
```bash
POST /admin/settings/offer-email-notifications
Content-Type: application/json

{
  "settings": {
    "offer_created": false,
    "offer_active": true,
    "offer_accepted": true,
    "offer_completed": true,
    "offer_cancelled": false
  }
}
```

## Event Flow

### Offer Lifecycle Email Triggers

```
1. Draft Created
   └─> offer.created event
       └─> Check: offer_created setting
           └─> Send: Email (if enabled)

2. Status → Active
   └─> offer.status-changed event
       └─> Check: offer_active setting
           └─> Generate: PDF
           └─> Upload: S3
           └─> Send: Email with PDF attachment

3. Status → Accepted
   └─> offer.status-changed event
       └─> Check: offer_accepted setting
           └─> Generate: PDF
           └─> Upload: S3
           └─> Send: Email with PDF attachment

4. Status → Completed
   └─> offer.status-changed event
       └─> Check: offer_completed setting
           └─> Generate: PDF
           └─> Upload: S3
           └─> Send: Email with PDF attachment

5. Status → Cancelled
   └─> offer.status-changed event
       └─> Check: offer_cancelled setting
           └─> Generate: PDF
           └─> Upload: S3
           └─> Send: Email with PDF attachment
```

## Customizing Templates

### Template Structure

Each email template follows this pattern:

```tsx
// 1. Define props interface
interface MyEmailProps {
  // Required fields
  customer_name: string;
  // Optional fields
  order_number?: string;
}

// 2. Component implementation
function MyEmailComponent(props: MyEmailProps) {
  const { customer_name, order_number } = props;

  return (
    <div style={{ /* inline styles */ }}>
      {/* Email content */}
    </div>
  );
}

// 3. Export for service
export const myEmail = (props: MyEmailProps) => (
  <MyEmailComponent {...props} />
);

// 4. Mock data for preview
const mockData: MyEmailProps = {
  customer_name: 'Max Mustermann',
  order_number: 'ORD-123',
};

// 5. Default export for preview server
export default () => <MyEmailComponent {...mockData} />;
```

### Styling Guidelines

**Use Inline Styles**:
```tsx
<div style={{
  fontFamily: 'Arial, sans-serif',
  color: '#333'
}}>
```

**Color Scheme**:
- Primary Blue: `#2c5aa0`
- Success Green: `#28a745`
- Danger Red: `#dc3545`
- Info Blue: `#007bff`
- Gray Backgrounds: `#f8f9fa`

**Responsive Design**:
```tsx
<div style={{
  maxWidth: '600px',
  margin: '0 auto'
}}>
```

## Testing Email Sending

### Test via API

```bash
# Test offer active email
curl -X POST http://localhost:9000/admin/offers/offer_123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

### Test via Admin UI

1. Create a test offer
2. Add customer email
3. Change status to trigger email
4. Check Resend dashboard for delivery

### Monitoring

**Logs**:
```bash
# Watch for email logs
docker logs -f medusa-app | grep RESEND
```

**Key Log Messages**:
- `[RESEND] Attempting to send email to...`
- `[RESEND] Email sent successfully via Resend API`
- `[OFFER-SUBSCRIBER] Email sent to...`

## Troubleshooting

### Emails Not Sending

1. **Check Global Settings**
   - Verify email notifications are enabled in admin
   - Check specific event type is enabled

2. **Check Per-Offer Settings**
   - Ensure offer has `email_notifications` not blocking
   - Verify customer email is set

3. **Check Resend API**
   - Verify `RESEND_API_KEY` environment variable
   - Check `RESEND_FROM_EMAIL` is valid
   - Review Resend dashboard for errors

4. **Check Logs**
   - Look for error messages in application logs
   - Check for PDF generation failures

### Preview Server Issues

**Port Already in Use**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Try again
npm run dev:email
```

**Templates Not Showing**:
- Ensure default export exists in each template
- Check for TypeScript compilation errors
- Verify mock data is valid

## Best Practices

### Content
- Keep subject lines under 50 characters
- Use clear, action-oriented language
- Include company branding consistently
- Provide contact information
- Add unsubscribe options (for marketing)

### Technical
- Test on multiple email clients
- Keep HTML under 102KB
- Use web-safe fonts
- Avoid JavaScript
- Include alt text for images
- Test with and without images

### Accessibility
- Use semantic HTML
- Maintain good color contrast
- Provide text alternatives
- Use proper heading hierarchy
- Test with screen readers

## Related Documentation

- [Offer Module Documentation](./src/modules/offer/README.md)
- [PDF Generation Guide](./PDF_GENERATION_GUIDE.md)
- [Email Settings API](./src/api/admin/settings/offer-email-notifications/README.md)
- [Resend Provider](https://resend.com/docs)
- [React Email](https://react.email/docs)

## Support

For issues or questions:
- Check logs first
- Review this documentation
- Consult Resend dashboard
- Contact development team

