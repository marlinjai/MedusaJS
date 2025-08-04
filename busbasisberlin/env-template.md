# Environment Variables Template

Copy this template to your `.env` file and configure it for your business.

## Database Configuration

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/medusa
```

## HTTP Configuration

```bash
STORE_CORS=http://localhost:8000,http://localhost:3000
ADMIN_CORS=http://localhost:7000,http://localhost:7001
AUTH_CORS=http://localhost:9000
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret
```

## S3/File Storage Configuration

```bash
S3_FILE_URL=https://your-project.supabase.co/storage/v1/object/public/your-bucket
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_REGION=your-region
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://your-project.supabase.co
```

## Email Configuration (Resend)

```bash
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourcompany.com
```

## Company Information (for PDF generation and emails)

```bash
COMPANY_NAME=Your Company Name
COMPANY_ADDRESS=Your Company Address
COMPANY_POSTAL_CODE=12345
COMPANY_CITY=Your City
COMPANY_EMAIL=info@yourcompany.com
```

## Optional: Additional Company Details

```bash
COMPANY_PHONE=+49 123 456789
COMPANY_WEBSITE=https://yourcompany.com
COMPANY_TAX_ID=DE123456789
COMPANY_BANK_INFO=Bank: Your Bank, IBAN: DE123456789, BIC: YOURBIC
```

## Optional: PDF Template Customization

```bash
PDF_LOGO_URL=https://yourcompany.com/logo.png
PDF_FOOTER_TEXT=Thank you for your business
PDF_TERMS_CONDITIONS=https://yourcompany.com/terms
PDF_PRIVACY_POLICY=https://yourcompany.com/privacy
```

## Optional: Email Template Customization

```bash
EMAIL_SIGNATURE=Best regards,\nYour Company Team
EMAIL_FOOTER=© 2024 Your Company. All rights reserved.
```

## Development Configuration

```bash
NODE_ENV=development
REDIS_URL=redis://localhost:6379
```

## Usage Instructions

1. Copy this template to your `.env` file
2. Replace all placeholder values with your actual configuration
3. For company information, use your real business details
4. For S3 configuration, use your Supabase or AWS S3 credentials
5. For email configuration, use your Resend API key and sender email

## Template Repository Benefits

This template repository is now fully configurable through environment variables, making it easy to:

- **Reuse for multiple businesses**: Just change the environment variables
- **Deploy to different environments**: Development, staging, production
- **Customize branding**: Company name, logo, colors, etc.
- **Comply with local regulations**: Tax IDs, bank information, etc.
- **Maintain consistency**: All PDFs and emails use the same company information
