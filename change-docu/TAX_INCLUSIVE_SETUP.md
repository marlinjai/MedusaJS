# Tax-Inclusive Pricing Setup Guide

## Problem

Preise zeigen nicht "inkl. MwSt." und Warenkorb zeigt €0.00 MwSt., obwohl alle Preise bereits 19% MwSt. enthalten sollten.

## Root Cause

Die **Region-Konfiguration** im Backend muss auf **tax-inclusive** gesetzt werden. Aktuell ist sie auf `tax-exclusive` (Standard), was bedeutet:
- Preise werden als **netto** behandelt
- MwSt. wird **on top** berechnet
- Resultat: Falsche Preise!

## Solution - Backend Konfiguration

### Option 1: Via Medusa Admin UI (Empfohlen)

1. **Login zum Admin**:
   ```
   http://localhost:9000/app
   ```

2. **Navigiere zu Settings → Regions**

3. **Wähle "Europe" Region**

4. **Unter "Tax Settings" oder "Currency Settings"**:
   - Finde "Tax Inclusive Pricing"
   - Aktiviere Toggle für "Tax Inclusive"
   - Oder setze "Include Taxes in Prices" = ✅

5. **Save**

### Option 2: Via SQL (Schneller)

```sql
-- Update Region to use tax-inclusive pricing
UPDATE region
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{is_tax_inclusive}',
  'true'::jsonb
)
WHERE currency_code = 'eur';

-- Update Currency to use tax-inclusive pricing
UPDATE currency
SET includes_tax = true
WHERE code = 'eur';
```

### Option 3: Via API

```bash
curl -X POST http://localhost:9000/admin/regions/{region_id} \
  -H "Content-Type: application/json" \
  -d '{
    "includes_tax": true
  }'
```

## What Was Fixed in Storefront

### 1. Product Price Display

**Before**:
```tsx
€49.99
```

**After**:
```tsx
€49.99
inkl. MwSt.  ✅
```

**Files**:
- ✅ `src/modules/products/components/product-price/index.tsx`
- ✅ `src/modules/products/components/product-preview/price.tsx`
- ✅ `src/modules/store/components/store-search/product-grid.tsx`

### 2. Price Calculation

**File**: `src/lib/util/get-product-price.ts`

**Before**:
```typescript
calculated_amount  // Without tax
```

**After**:
```typescript
calculated_amount_with_tax || calculated_amount  // With tax fallback
```

### 3. Cart Totals

**File**: `src/modules/common/components/cart-totals/index.tsx`

**Before**:
```
Zwischensumme (exkl. Versand und Steuern)  €100
Versand                                     €5
Steuern                                     €19
```

**After**:
```
Zwischensumme (inkl. 19% MwSt.)            €100
Versand                                     €10
davon MwSt. (19%)                          €17.48  (kleingedruckt)
```

## Verification After Backend Update

### 1. Check in Admin

1. Go to Products
2. Check a product price
3. Should show base price (already includes 19% MwSt.)

### 2. Check in Storefront

1. Open any product page
2. Price should show "€XX.XX inkl. MwSt."
3. Add to cart
4. Cart should show "Zwischensumme (inkl. 19% MwSt.)"
5. "davon MwSt." should show correct tax amount (not €0.00)

### 3. Check Calculation

**For €10.25 total (tax-inclusive)**:
- Netto: €10.25 / 1.19 = €8.61
- MwSt. (19%): €10.25 - €8.61 = €1.64

Should see **€1.64** as "davon MwSt." (not €0.00)!

## German Legal Requirement (§1 PAngV)

In Deutschland **MÜSSEN** alle B2C-Preise inkl. MwSt. angezeigt werden:

✅ **Richtig**:
```
€49.99 inkl. MwSt.
```

❌ **Falsch** (nur für B2B erlaubt):
```
€42.01 zzgl. 19% MwSt.
```

## Current Status

### Storefront ✅
- ✅ Zeigt "inkl. MwSt." bei allen Preisen
- ✅ Verwendet `calculated_amount_with_tax`
- ✅ Warenkorb zeigt "(inkl. 19% MwSt.)"
- ✅ MwSt.-Anteil wird angezeigt

### Backend ⚠️
- ⚠️ **Muss noch konfiguriert werden**: Region auf tax-inclusive setzen
- ⚠️ **Dann wird MwSt. korrekt berechnet** (nicht €0.00)

## Next Steps

1. **Setze Region auf tax-inclusive** (Admin UI oder SQL)
2. **Restart Backend** (falls nötig)
3. **Test im Storefront**:
   - Produkt anschauen → "inkl. MwSt." ✅
   - In Warenkorb → "davon MwSt." zeigt korrekten Betrag ✅
4. **Fertig!** 🎉

## Files Modified (Storefront)

```
✅ src/lib/util/get-product-price.ts
✅ src/modules/products/components/product-price/index.tsx
✅ src/modules/products/components/product-preview/price.tsx
✅ src/modules/common/components/cart-totals/index.tsx
✅ src/modules/store/components/store-search/product-grid.tsx
```

## Environment Variables (Optional)

You can also set in `.env`:
```env
# Tax Configuration
DEFAULT_TAX_RATE=19
TAX_INCLUSIVE_PRICING=true
```

---

**Status**: Storefront ✅ Ready | Backend ⚠️ Needs tax-inclusive config

