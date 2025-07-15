/**
 * VariantSelector.tsx
 * Component for selecting product variants in offer creation
 * Displays variant options with prices and inventory information
 * Every product in Medusa must have at least one variant
 */
import { Badge, Select, Text } from '@medusajs/ui';
import { Package } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  // Support both old prices array and new single price object
  prices?: Array<{
    amount: number;
    currency_code: string;
  }>;
  price?: {
    amount: number;
    currency_code: string;
  };
  inventory_quantity: number;
}

interface ProductWithVariants {
  id: string;
  title?: string;
  variants?: ProductVariant[];
  variants_count?: number;
}

interface VariantSelectorProps {
  product: ProductWithVariants | null;
  selectedVariantId: string | null;
  onVariantSelect: (variant: ProductVariant) => void;
  disabled?: boolean;
  className?: string;
}

const VariantSelector = ({
  product,
  selectedVariantId,
  onVariantSelect,
  disabled = false,
  className = '',
}: VariantSelectorProps) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Update selected variant when product or selectedVariantId changes
  useEffect(() => {
    if (product && selectedVariantId) {
      const variant = product.variants?.find(v => v.id === selectedVariantId);
      setSelectedVariant(variant || null);
    } else {
      setSelectedVariant(null);
    }
  }, [product, selectedVariantId]);

  // Auto-select first variant if no variant is selected and product has variants
  useEffect(() => {
    if (product && product.variants && product.variants.length > 0 && !selectedVariant) {
      const firstVariant = product.variants[0];
      setSelectedVariant(firstVariant);
      onVariantSelect(firstVariant);
    }
  }, [product, selectedVariant, onVariantSelect]);

  // If no product is selected, show placeholder
  if (!product) {
    return (
      <div className={`${className}`}>
        <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
          Variante auswählen
        </Text>
        <div className="px-3 py-2 text-ui-fg-muted border border-ui-border-base rounded-md">
          <Text size="small">Kein Produkt ausgewählt</Text>
        </div>
      </div>
    );
  }

  // If product has no variants (shouldn't happen in Medusa, but handle gracefully)
  if (!product.variants || product.variants.length === 0) {
    return (
      <div className={`${className}`}>
        <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
          Variante auswählen
        </Text>
        <div className="px-3 py-2 text-ui-fg-muted border border-ui-border-base rounded-md">
          <Text size="small">Keine Varianten verfügbar für dieses Produkt</Text>
        </div>
      </div>
    );
  }

  const handleVariantChange = (variantId: string) => {
    const variant = product.variants?.find(v => v.id === variantId);
    if (variant) {
      setSelectedVariant(variant);
      onVariantSelect(variant);
    }
  };

  // Get the primary price for a variant (supports both old prices array and new single price object)
  const getVariantPrice = (variant: ProductVariant): number => {
    // New API format: single price object
    if (variant.price) {
      return variant.price.amount;
    }

    // Old API format: prices array
    if (variant.prices && variant.prices.length > 0) {
      // Find EUR price first, then fall back to first available
      const eurPrice = variant.prices.find(p => p.currency_code === 'EUR');
      return eurPrice ? eurPrice.amount : variant.prices[0].amount;
    }

    return 0;
  };

  // Remove any tax logic (none present in this file)
  // Ensure price formatting is correct (divide by 100 for cents to euros)
  const formatPrice = (amount: number): string => {
    return `${(amount / 100).toFixed(2)} €`;
  };

  // Get inventory status
  const getInventoryStatus = (quantity: number): { text: string; color: string } => {
    if (quantity > 10) {
      return { text: 'Verfügbar', color: 'green' };
    } else if (quantity > 0) {
      return { text: `Nur ${quantity} verfügbar`, color: 'orange' };
    } else {
      return { text: 'Nicht verfügbar', color: 'red' };
    }
  };

  return (
    <div className={`${className}`}>
      <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
        Variante auswählen *
      </Text>

      <Select value={selectedVariant?.id || ''} onValueChange={handleVariantChange} disabled={disabled}>
        <Select.Trigger>
          <Select.Value placeholder="Variante wählen..." />
        </Select.Trigger>
        <Select.Content>
          {(product.variants || []).map(variant => {
            const price = getVariantPrice(variant);
            const inventoryStatus = getInventoryStatus(variant.inventory_quantity);

            return (
              <Select.Item key={variant.id} value={variant.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center justify-between gap-4">
                    <Package className="w-4 h-4 text-ui-fg-muted" />

                    <Text size="small" weight="plus" className="text-ui-fg-base">
                      {variant.title}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      SKU: {variant.sku}
                    </Text>

                    <Text size="small" weight="plus" className="text-ui-fg-base">
                      {formatPrice(price)}
                    </Text>
                    <Badge size="small" color={inventoryStatus.color as any}>
                      {inventoryStatus.text}
                    </Badge>
                  </div>
                </div>
              </Select.Item>
            );
          })}
        </Select.Content>
      </Select>

      {/* Selected variant details */}
      {selectedVariant && (
        <div className="mt-2 p-3 bg-ui-bg-subtle rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base">
                {selectedVariant.title}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                SKU: {selectedVariant.sku}
              </Text>
            </div>
            <div className="text-right">
              <Text size="small" weight="plus" className="text-ui-fg-base">
                {formatPrice(getVariantPrice(selectedVariant))}
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                {selectedVariant.inventory_quantity} verfügbar
              </Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
