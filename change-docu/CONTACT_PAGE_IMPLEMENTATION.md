# Contact & FAQ Sections Implementation

## Overview
Implemented comprehensive Contact and FAQ sections with Google Maps integration on the landing page for Bus Basis Berlin. Uses scroll anchors for SPA-like navigation.

## Features Implemented

### 1. Contact Form Section
- **Location**: `/src/modules/contact/templates/contact-section/index.tsx`
- Professional contact form with validation
- Fields: Name, Email, Phone (optional), Message
- Responsive grid layout (2 columns on desktop, stacked on mobile)
- Opening hours display
- Google Maps iframe integration

### 2. FAQ Section
- **Location**: `/src/modules/contact/components/faq-section/index.tsx`
- Accordion-style FAQ component
- Mobile-responsive with "show more/less" functionality
- Shows 3 FAQs initially on mobile, all on desktop
- Smooth scroll-to-view on collapse
- 7 pre-populated FAQs covering common questions

### 3. Landing Page Integration
- **Location**: `/src/app/[countryCode]/(main)/page.tsx`
- Contact and FAQ sections added to landing page
- Scroll anchor IDs: `#contact` and `#faq`
- Navigation updated to use hash links for SPA-like feel
- Accessible via `/#contact` and `/#faq` from anywhere

## Design Decisions

### Styling
- Used existing Tailwind CSS theme with custom color variables
- Matches dark mode design system with `bg-background`, `text-foreground`, etc.
- Leveraged existing utility classes like `content-container` and `contrast-btn`
- Consistent border radius, spacing, and shadows

### Responsiveness
- Mobile-first approach
- FAQ section shows fewer items initially on mobile to reduce scroll
- Grid layout adapts: 2 columns → 1 column on smaller screens
- Form inputs and text scale appropriately

### User Experience
- Clear visual hierarchy with section headers
- Smooth transitions and hover states
- Accessible form with proper labels and required field indicators
- Smart FAQ collapse/expand with smooth animations

## German Localization
All content is in German to match the website's target audience:
- Form labels and placeholders
- FAQ questions and answers
- Button text
- Section headings

## FAQs Included
1. Payment methods
2. Delivery times
3. On-site pickup availability
4. Installation service
5. Return policy
6. Used parts availability
7. Finding the right parts

## Company Information
- **Name**: Basis Camp Berlin GmbH
- **Address**: Hauptstrasse 51, 16547 Birkenwerder
- **Email**: info@basiscampberlin.de
- **Phone**: Auf Anfrage (On request)
- **Opening Hours**:
  - Monday - Friday: 8:00 - 18:00
  - Saturday: 9:00 - 14:00
  - Sunday: Closed

## Google Maps Integration
- Embedded iframe with actual workshop location (Hauptstrasse 51, Birkenwerder)
- Responsive sizing (adjusts height on mobile vs desktop)
- Lazy loading for performance
- No-referrer policy for privacy

## Testing Recommendations
1. Test form submission (currently logs to console)
2. Verify Google Maps loads correctly at Birkenwerder location
3. Test FAQ expand/collapse on mobile and desktop
4. Check "More FAQs" / "Less FAQs" button functionality on mobile
5. Verify responsive breakpoints
6. Test accessibility with screen readers
7. Test email link functionality

## Next Steps / TODO
1. **Backend Integration**: Connect contact form to email service or CRM (e.g., Resend module)
2. **Form Validation Enhancement**: Add more robust client-side validation
3. **Success/Error States**: Add proper feedback after form submission (loading states, success/error messages)
4. **Analytics**: Track form submissions and FAQ interactions
5. **Spam Protection**: Consider adding reCAPTCHA or similar
6. **Phone Number**: Update phone number when available

## Files Created
```
src/
  app/[countryCode]/(main)/
    └── page.tsx (modified - added Contact & FAQ sections)
  modules/contact/
    ├── components/
    │   └── faq-section/
    │       └── index.tsx
    └── templates/
        └── contact-section/
            └── index.tsx
  modules/layout/config/
    └── navigation.ts (modified - updated to scroll anchors)
```

## Navigation
Updated to use scroll anchors for SPA-like experience:
- Main nav: "Kontakt" → `/#contact`
- Footer nav: "Kontakt" → `/#contact`
- Footer nav: "FAQ" → `/#faq`
- Scroll anchors work from any page in the app

## Component Architecture
Follows MedusaJS storefront conventions:
- Page components in `app/[countryCode]/(main)/`
- Reusable sections in `modules/*/templates/`
- Smaller UI components in `modules/*/components/`
- Client components marked with `'use client'` directive

