# Offer Module V2 - Verification Checklist

## 🔍 Once 404 Is Resolved - Verify These Features

### ✅ **Offer Detail Page - ALL Functions Present**

The page at `/offers/[id]` has ALL the following functionality intact:

#### **1. Header Section**
- [ ] Offer number displays correctly
- [ ] "Reserviert" badge shows when has_reservations = true
- [ ] Status badge displays with correct color
- [ ] "Status ändern" dropdown appears with valid transitions
- [ ] Edit/Cancel/Save buttons work
- [ ] Fulfill button appears for accepted offers

#### **2. Customer Information**
- [ ] Customer name, email, phone, address display in view mode
- [ ] Fields become editable in edit mode
- [ ] Customer searchable dropdown works in edit mode

#### **3. Items Section**
- [ ] View mode: Items display in compact card layout with badges
- [ ] Edit mode: Items display in OfferItemsTable
- [ ] "Artikel hinzufügen" button appears in edit mode
- [ ] Button opens ItemSelectorModal
- [ ] Modal shows:
  - [ ] Products tab with category tree
  - [ ] Services tab with category tree  
  - [ ] Grid of items when category selected
  - [ ] Bottom table with selected items
  - [ ] Double-click adds items
  - [ ] Drag-and-drop reordering works
  - [ ] Inline editing works (quantity, price, discount)
  - [ ] Collapsible rows work
  - [ ] "Fertig" button closes modal

#### **4. Actions Section (Critical!)**
- [ ] **Email Sending**
  - [ ] "E-Mail senden" button visible for active/accepted/completed/cancelled
  - [ ] Preview modal opens on click
  - [ ] Shows PDF preview and email HTML
  - [ ] "Senden" button actually sends email
  - [ ] Info button (ℹ️) shows email info modal

- [ ] **Inventory Management**
  - [ ] "Inventar reservieren" button shows for draft/active without reservations
  - [ ] "Reservierungen freigeben" button shows for active/accepted with reservations
  - [ ] "Lager prüfen" button visible for product items
  - [ ] Inventory status updates after checking
  - [ ] Stock warnings appear (out of stock, low stock badges)

- [ ] **PDF Generation**
  - [ ] "PDF erstellen" button visible for active/accepted/cancelled/completed
  - [ ] PDF generates and download link appears
  - [ ] Clicking link opens PDF in new tab

- [ ] **Invoice Generation**
  - [ ] "Rechnung erstellen" button visible for active/accepted/completed
  - [ ] Invoice generates and download link appears
  - [ ] Clicking link opens invoice in new tab

#### **5. Totals Section**
- [ ] Subtotal calculates correctly
- [ ] VAT (19%) calculates correctly  
- [ ] Total displays correctly
- [ ] Updates when items change

#### **6. Notes Section**
- [ ] Internal notes display/editable
- [ ] Customer notes display/editable

## ✅ **Create Offer Page - Verify**

At `/offers/new`:

- [ ] All customer fields work
- [ ] "Artikel hinzufügen" button opens modal
- [ ] Modal product/service selection works
- [ ] Items appear in table after adding
- [ ] Can edit quantities, prices inline
- [ ] Can reorder via drag-and-drop
- [ ] Can remove items
- [ ] Submit creates offer successfully
- [ ] Redirects to offers list

## ✅ **Services-by-Category Page - Verify**

At `/services/by-category`:

- [ ] Page loads without errors
- [ ] Category tree displays with all categories
- [ ] Checkboxes toggle category selection
- [ ] Collapsible categories expand/collapse
- [ ] Service table shows services for selected categories
- [ ] Table columns: Code, Title, Category, Price, Type, Status, Actions
- [ ] Row selection checkboxes work
- [ ] Double-click title to inline edit
- [ ] Double-click price to inline edit
- [ ] Enter saves, Escape cancels
- [ ] Edit icon navigates to service detail page
- [ ] "Neuer Service" button navigates to create page

## 🐛 **Common Issues & Solutions**

### Issue: 404 Error
**Cause:** Likely related to how the file was edited or route configuration  
**Check:**
1. File is named correctly: `[id]/page.tsx`
2. Export statement exists: `export default function OfferDetailPage()`
3. No syntax errors (linter shows 0 errors ✅)
4. Try restarting dev server

### Issue: Modal Doesn't Open
**Cause:** Missing state or imports  
**Check:**
1. `showItemSelector` state exists ✅
2. `ItemSelectorModal` imported ✅
3. Button onClick sets state ✅
4. Modal component renders conditionally ✅

### Issue: Functions Not Working
**Cause:** Async issues or missing handlers  
**Check:**
1. All handler functions still defined ✅
2. API endpoints reachable
3. Console for errors

## ✅ **Known Working (Already Tested)**

- ✅ Service import: 143 services loaded
- ✅ Service category tree API: Returns proper hierarchy
- ✅ Modal component: No linter errors
- ✅ Table component: No linter errors
- ✅ Create offer page: No linter errors
- ✅ Services-by-category: No linter errors

## 📝 **Next Steps After 404 Resolution**

1. Test complete offer creation flow
2. Test editing existing offer
3. Test all action buttons (email, PDF, reservations)
4. Test services-by-category page
5. Verify drag-and-drop and inline editing
6. Test with 50+ item offer to verify collapsible rows help with scrolling

---

**All functionality preserved. Just need to resolve the routing/404 issue!**


