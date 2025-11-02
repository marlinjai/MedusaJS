'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Hits } from 'react-instantsearch';

type ProductHit = {
	id: string;
	title: string;
	description: string;
	handle: string;
	thumbnail: string;
	min_price: number;
	max_price: number;
	category_names?: string[];
	hierarchical_categories?: Record<string, string>;
	tags?: string[];
	is_available?: boolean;
	total_inventory?: number;
};

function Hit({ hit }: { hit: ProductHit & { objectID: string } }) {
	return (
		<Link href={`/products/${hit.handle}`} className="group block h-full">
			<div className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 hover:bg-gray-800/70 transition-all duration-200 h-full flex flex-col">
				{/* Image */}
				<div className="relative w-full aspect-[4/3] bg-gray-900">
					{hit.thumbnail ? (
						<Image
							src={hit.thumbnail}
							alt={hit.title}
							fill
							className="object-contain group-hover:scale-105 transition-transform duration-300 p-2"
							sizes="(max-width: 768px) 50vw, 33vw"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-900">
							<svg
								className="w-16 h-16 text-gray-600"
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
				</div>

				{/* Content */}
				<div className="p-4 flex-1 flex flex-col gap-2">
					{/* Title */}
					<h3 className="font-semibold text-base text-gray-200 line-clamp-2 group-hover:text-blue-400 transition-colors">
						{hit.title}
					</h3>

					{/* Description */}
					{hit.description && (
						<p className="text-sm text-gray-400 line-clamp-3">
							{hit.description}
						</p>
					)}

					{/* Categories */}
					{hit.category_names && hit.category_names.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{hit.category_names.slice(0, 2).map((category, idx) => (
								<span
									key={idx}
									className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded-full font-medium border border-gray-600"
								>
									{category}
								</span>
							))}
						</div>
					)}

					{/* Price and Availability */}
					<div className="mt-auto pt-2 space-y-2">
						{/* Price */}
						<div className="mb-2">
							{hit.min_price && (
								<div className="flex items-baseline gap-2">
									<span className="text-lg font-semibold text-gray-300">
										€{hit.min_price.toFixed(2)}
									</span>
									{hit.max_price && hit.max_price !== hit.min_price && (
										<span className="text-sm text-gray-500 font-medium">
											- €{hit.max_price.toFixed(2)}
										</span>
									)}
								</div>
							)}
						</div>

						{/* Stock Availability */}
						<div className="flex items-center justify-between">
							<div className="flex-1">
								{hit.total_inventory !== undefined && hit.total_inventory > 0 ? (
									<span className="text-xs text-green-400 font-medium">
										● {hit.total_inventory} Stück verfügbar
									</span>
								) : hit.is_available ? (
									<span className="text-xs text-blue-400 font-medium">
										● Verfügbar
									</span>
								) : (
									<span className="text-xs text-red-400 font-medium">
										✕ Zurzeit nicht lieferbar
									</span>
								)}
							</div>
						</div>

						{/* View Details Link */}
						<div className="flex items-center gap-1 text-sm text-gray-400 group-hover:text-blue-400 transition-colors">
							<span>Details ansehen</span>
							<svg
								className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}

export default function ProductGrid() {
	return (
		<Hits
			hitComponent={Hit}
			classNames={{
				root: '',
				list: 'grid grid-cols-2 md:grid-cols-3 gap-6',
				item: 'h-full',
			}}
		/>
	);
}
