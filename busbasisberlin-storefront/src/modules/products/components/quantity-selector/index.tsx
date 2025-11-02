// quantity-selector/index.tsx
// Dropdown selector for product quantity with stock-aware limits

'use client';

import { HttpTypes } from '@medusajs/types';

type QuantitySelectorProps = {
	quantity: number;
	setQuantity: (qty: number) => void;
	variant?: HttpTypes.StoreProductVariant;
	disabled?: boolean;
};

export default function QuantitySelector({
	quantity,
	setQuantity,
	variant,
	disabled = false,
}: QuantitySelectorProps) {
	if (!variant) {
		return null;
	}

	const stockQty = variant.inventory_quantity || 0;
	const allowBackorder = variant.allow_backorder || false;
	const manageInventory = variant.manage_inventory !== false;

	// Calculate max quantity for selector
	let maxQuantity = 10; // Default max for dropdown

	if (manageInventory && !allowBackorder) {
		// Limit to available stock if inventory is managed and backorder not allowed
		maxQuantity = Math.min(stockQty, 10);
	} else if (allowBackorder) {
		// Allow up to 99 for backorder items
		maxQuantity = Math.min(99, 10); // Still cap dropdown at 10 for UX
	}

	// If max is 0 or less, don't show selector
	if (maxQuantity < 1) {
		return null;
	}

	// Generate options array
	const options = Array.from({ length: maxQuantity }, (_, i) => i + 1);

	return (
		<div className="mb-4">
			<label
				htmlFor="quantity-select"
				className="text-sm font-medium mb-2 block text-foreground"
			>
				Menge:
			</label>
			<select
				id="quantity-select"
				value={quantity}
				onChange={e => setQuantity(Number(e.target.value))}
				disabled={disabled}
				className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
			>
				{options.map(num => (
					<option key={num} value={num}>
						{num} {num === 1 ? 'Stück' : 'Stück'}
					</option>
				))}
				{/* Show option for "more" if backorder is allowed */}
				{allowBackorder && maxQuantity >= 10 && (
					<option value={10} disabled>
						Mehr? Mehrmals hinzufügen
					</option>
				)}
			</select>
			{stockQty > 0 && stockQty < 10 && !allowBackorder && (
				<p className="text-xs text-muted-foreground mt-1">
					Maximal {stockQty} Stück verfügbar
				</p>
			)}
		</div>
	);
}


