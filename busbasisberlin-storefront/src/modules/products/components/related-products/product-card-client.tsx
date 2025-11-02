// product-card-client.tsx
// Client-safe product card for infinite scroll slider

'use client';

import { HttpTypes } from '@medusajs/types';
import Image from 'next/image';
import Link from 'next/link';

type ProductCardClientProps = {
	product: any; // MeiliSearch hit
	region: HttpTypes.StoreRegion;
};

export default function ProductCardClient({
	product,
	region,
}: ProductCardClientProps) {
	const price = product.min_price
		? `€${product.min_price.toFixed(2)}`
		: 'Preis auf Anfrage';

	return (
		<Link href={`/products/${product.handle}`} className="group block">
			<div className="bg-card rounded-lg overflow-hidden border border-border hover:border-primary hover:shadow-lg transition-all duration-200 h-full flex flex-col">
				{/* Image */}
				<div className="relative w-full aspect-square bg-muted">
					{product.thumbnail ? (
						<Image
							src={product.thumbnail}
							alt={product.title}
							fill
							className="object-cover group-hover:scale-105 transition-transform duration-300"
							sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center">
							<svg
								className="w-16 h-16 text-muted-foreground"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
					)}

					{/* Availability Badge */}
					{product.is_available === false && (
						<div className="absolute top-2 right-2">
							<span className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
								Ausverkauft
							</span>
						</div>
					)}
				</div>

				{/* Content */}
				<div className="p-4 flex-1 flex flex-col">
					<h3 className="font-semibold text-base text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[3rem]">
						{product.title}
					</h3>

					{/* Price */}
					<div className="mt-auto pt-2">
						<div className="flex items-baseline gap-2">
							<span className="text-lg font-bold text-primary">{price}</span>
							{product.max_price && product.max_price !== product.min_price && (
								<span className="text-sm text-muted-foreground">
									- €{product.max_price.toFixed(2)}
								</span>
							)}
						</div>
						{/* Availability Status - always shown to maintain consistent card height */}
						<div className="mt-1">
							{product.is_available !== false ? (
								<span className="text-xs text-green-600 font-medium">
									● Verfügbar
								</span>
							) : (
								<span className="text-xs text-red-600 font-medium">
									● Ausverkauft
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}

