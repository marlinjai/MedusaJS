// stock-info/index.tsx
// Displays stock availability information for a product variant

'use client';

import { HttpTypes } from '@medusajs/types';

type StockInfoProps = {
	variant?: HttpTypes.StoreProductVariant;
	lowStockThreshold?: number;
};

export default function StockInfo({
	variant,
	lowStockThreshold = 5,
}: StockInfoProps) {
	if (!variant) {
		return null;
	}

	const stockQty = variant.inventory_quantity || 0;
	const allowBackorder = variant.allow_backorder || false;
	const manageInventory = variant.manage_inventory !== false;

	// Don't show stock info if inventory is not managed
	if (!manageInventory) {
		return (
			<div className="px-4 py-3 bg-green-600/10 border border-green-600/20 rounded-lg">
				<div className="flex items-center gap-2">
					<span className="text-green-600 text-lg">●</span>
					<span className="text-green-600 font-semibold">Verfügbar</span>
				</div>
			</div>
		);
	}

	// Product is in stock
	if (stockQty > 0) {
		const isLowStock = stockQty <= lowStockThreshold;

		return (
			<div
				className={`px-4 py-3 rounded-lg ${
					isLowStock
						? 'bg-orange-600/10 border border-orange-600/20'
						: 'bg-green-600/10 border border-green-600/20'
				}`}
			>
				<div className="flex items-center gap-2">
					<span
						className={`text-lg ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}
					>
						{isLowStock ? '⚠' : '●'}
					</span>
					<div className="flex flex-col">
						<span
							className={`font-semibold ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}
						>
							{stockQty} Stück verfügbar
						</span>
						{isLowStock && (
							<span className="text-xs text-orange-600/80 mt-0.5">
								Nur noch wenige verfügbar
							</span>
						)}
					</div>
				</div>
			</div>
		);
	}

	// Product is on backorder (stock = 0 but backorder allowed)
	if (allowBackorder) {
		return (
			<div className="px-4 py-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
				<div className="flex items-center gap-2">
					<span className="text-blue-600 text-lg">●</span>
					<div className="flex flex-col">
						<span className="text-blue-600 font-semibold">Verfügbar</span>
						<span className="text-xs text-blue-600/80 mt-0.5">
							Lieferzeit verlängert
						</span>
					</div>
				</div>
			</div>
		);
	}

	// Product is out of stock
	return (
		<div className="px-4 py-3 bg-red-600/10 border border-red-600/20 rounded-lg">
			<div className="flex items-center gap-2">
				<span className="text-red-600 text-lg">✕</span>
				<span className="text-red-600 font-semibold">Zurzeit nicht lieferbar</span>
			</div>
		</div>
	);
}


