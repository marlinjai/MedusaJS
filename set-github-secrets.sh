#!/bin/bash

# Set GitHub Secrets from .env.production-secrets
# Make sure to update SSH_PRIVATE_KEY first!

echo "🔐 Setting GitHub repository secrets..."

# Read the .env.production-secrets file
source .medusa-secrets/.env.production-secrets

# Infrastructure & Security
gh secret set HOST --body "$HOST"
gh secret set SSH_USER --body "$SSH_USER"  
gh secret set PROJECT_PATH --body "$PROJECT_PATH"
gh secret set POSTGRES_PASSWORD --body "$POSTGRES_PASSWORD"
gh secret set REDIS_PASSWORD --body "$REDIS_PASSWORD"
gh secret set JWT_SECRET --body "$JWT_SECRET"
gh secret set COOKIE_SECRET --body "$COOKIE_SECRET"

# S3 Storage
gh secret set S3_FILE_URL --body "$S3_FILE_URL"
gh secret set S3_ACCESS_KEY_ID --body "$S3_ACCESS_KEY_ID"
gh secret set S3_SECRET_ACCESS_KEY --body "$S3_SECRET_ACCESS_KEY"
gh secret set S3_REGION --body "$S3_REGION"
gh secret set S3_BUCKET --body "$S3_BUCKET"
gh secret set S3_ENDPOINT --body "$S3_ENDPOINT"

# Email
gh secret set RESEND_API_KEY --body "$RESEND_API_KEY"
gh secret set RESEND_FROM_EMAIL --body "$RESEND_FROM_EMAIL"

# CORS & URLs
gh secret set STORE_CORS --body "$STORE_CORS"
gh secret set ADMIN_CORS --body "$ADMIN_CORS"
gh secret set AUTH_CORS --body "$AUTH_CORS"
gh secret set MEDUSA_BACKEND_URL --body "$MEDUSA_BACKEND_URL"

# Storefront
gh secret set NEXT_PUBLIC_MEDUSA_BACKEND_URL --body "$NEXT_PUBLIC_MEDUSA_BACKEND_URL"
gh secret set NEXT_PUBLIC_BASE_URL --body "$NEXT_PUBLIC_BASE_URL"
gh secret set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY --body "$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
gh secret set NEXT_PUBLIC_DEFAULT_REGION --body "$NEXT_PUBLIC_DEFAULT_REGION"
gh secret set NEXT_PUBLIC_STRIPE_KEY --body "$NEXT_PUBLIC_STRIPE_KEY"
gh secret set REVALIDATE_SECRET --body "$REVALIDATE_SECRET"

# Company Information
gh secret set COMPANY_NAME --body "$COMPANY_NAME"
gh secret set COMPANY_ADDRESS --body "$COMPANY_ADDRESS"
gh secret set COMPANY_POSTAL_CODE --body "$COMPANY_POSTAL_CODE"
gh secret set COMPANY_CITY --body "$COMPANY_CITY"
gh secret set COMPANY_EMAIL --body "$COMPANY_EMAIL"
gh secret set COMPANY_PHONE --body "$COMPANY_PHONE"
gh secret set COMPANY_WEBSITE --body "$COMPANY_WEBSITE"
gh secret set COMPANY_TAX_ID --body "$COMPANY_TAX_ID"
gh secret set COMPANY_BANK_INFO --body "$COMPANY_BANK_INFO"

# PDF Template
gh secret set PDF_LOGO_URL --body "$PDF_LOGO_URL"
gh secret set PDF_FOOTER_TEXT --body "$PDF_FOOTER_TEXT"
gh secret set PDF_TERMS_CONDITIONS --body "$PDF_TERMS_CONDITIONS"
gh secret set PDF_PRIVACY_POLICY --body "$PDF_PRIVACY_POLICY"

# Email Templates
gh secret set EMAIL_SIGNATURE --body "$EMAIL_SIGNATURE"
gh secret set EMAIL_FOOTER --body "$EMAIL_FOOTER"

echo "✅ All secrets set successfully!"
echo ""
echo "⚠️  IMPORTANT: You still need to set SSH_PRIVATE_KEY manually:"
echo "   gh secret set SSH_PRIVATE_KEY --body 'YOUR_SSH_PRIVATE_KEY'"
echo ""
echo "📋 To verify secrets were set:"
echo "   gh secret list"

