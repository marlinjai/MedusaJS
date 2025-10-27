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
};

function Hit({ hit }: { hit: ProductHit & { objectID: string } }) {
	return (
		<Link href={`/products/${hit.handle}`} className="group block">
			<div className="bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 h-full flex flex-col">
				{/* Image */}
				<div className="relative w-full aspect-square bg-gray-50">
					{hit.thumbnail ? (
						<Image
							src={hit.thumbnail}
							alt={hit.title}
							fill
							className="object-cover group-hover:scale-105 transition-transform duration-300"
							sizes="(max-width: 768px) 50vw, 33vw"
						/>
					) : (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-100">
							<svg
								className="w-16 h-16 text-gray-400"
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
				<div className="p-4 flex-1 flex flex-col">
					<h3 className="font-semibold text-base text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
						{hit.title}
					</h3>

					{/* Categories */}
					{hit.category_names && hit.category_names.length > 0 && (
						<div className="mb-2">
							<div className="flex flex-wrap gap-1">
								{hit.category_names.slice(0, 2).map((category, idx) => (
									<span
										key={idx}
										className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium"
									>
										{category}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Price */}
					<div className="mt-auto pt-2 flex items-center justify-between">
						<div>
							{hit.is_available ? (
								hit.min_price && (
									<>
										<div className="flex items-baseline gap-2">
											<span className="text-xl font-bold text-blue-600">
												€{hit.min_price.toFixed(2)}
											</span>
											{hit.max_price && hit.max_price !== hit.min_price && (
												<span className="text-sm text-gray-500 font-medium">
													- €{hit.max_price.toFixed(2)}
												</span>
											)}
										</div>
									</>
								)
							) : (
								<div className="flex items-center gap-1">
									<span className="text-sm font-semibold text-red-600">
										Ausverkauft
									</span>
								</div>
							)}
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
				list: 'grid grid-cols-2 md:grid-cols-3 gap-4',
				item: '',
			}}
		/>
	);
}
