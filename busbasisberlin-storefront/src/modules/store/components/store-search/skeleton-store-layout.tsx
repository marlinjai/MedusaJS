// skeleton-store-layout.tsx
// Server-side skeleton layout that renders immediately in HTML
// This prevents the "nothing" state before React hydrates

export default function SkeletonStoreLayout() {
	return (
		<div className="relative min-h-screen">
			{/* Texture Background - matches StoreSearch */}
			<div
				className="fixed inset-0 opacity-10 pointer-events-none"
				style={{
					backgroundImage: 'url(/images/texture_I.jpg)',
					backgroundSize: 'contain',
					backgroundPosition: 'center',
					backgroundRepeat: 'repeat',
					transform: ' scale(1.1)',
					transformOrigin: 'center center',
				}}
			/>
			<div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header with Search in one row - Full width */}
				<div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					{/* Title */}
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-300">
							Teile Shop
						</h1>
						<p className="text-sm text-gray-400 mt-1 hidden sm:block">
							Durchsuchen Sie unseren vollständigen Produktkatalog
						</p>
					</div>

					{/* Search Box Skeleton */}
					<div className="w-full sm:w-auto sm:flex-1 sm:max-w-md bg-stone-950 rounded-xl p-4">
						<div className="relative">
							<div className="w-full h-12 bg-stone-800 rounded-lg animate-pulse" />
						</div>
					</div>
				</div>

				{/* Main Content Area with Sidebar and Toolbar aligned */}
				<div className="flex flex-col lg:flex-row gap-8">
					{/* Filters Sidebar Skeleton */}
					<aside className="w-full lg:w-80 flex-shrink-0">
						<div className="space-y-6">
							{/* Category Tree Skeleton */}
							<div className="bg-stone-950 border border-stone-800 rounded-xl p-5 animate-pulse">
								<div className="h-6 bg-stone-800 rounded w-32 mb-4" />
								<div className="space-y-2">
									<div className="h-4 bg-stone-800 rounded w-full" />
									<div className="h-4 bg-stone-800 rounded w-5/6" />
									<div className="h-4 bg-stone-800 rounded w-4/5" />
								</div>
							</div>

							{/* Filter Section Skeleton */}
							<div className="bg-stone-950 border border-stone-800 rounded-xl p-5 animate-pulse">
								<div className="h-6 bg-stone-800 rounded w-24 mb-5" />
								<div className="space-y-3">
									<div className="h-4 bg-stone-800 rounded w-32 mb-3" />
									<div className="h-8 bg-stone-800 rounded w-full" />
									<div className="h-8 bg-stone-800 rounded w-full" />
								</div>
							</div>

							{/* Sort Section Skeleton */}
							<div className="bg-stone-950 border border-stone-800 rounded-xl p-5 animate-pulse">
								<div className="h-6 bg-stone-800 rounded w-28 mb-5" />
								<div className="h-10 bg-stone-800 rounded w-full" />
							</div>
						</div>
					</aside>

					{/* Main Content Area */}
					<div className="flex-1 min-w-0">
						{/* Toolbar Skeleton */}
						<div className="bg-stone-950 rounded-xl border border-stone-800 p-4 mb-6 shadow-lg animate-pulse">
							<div className="flex flex-col gap-4">
								{/* Top Row: Stats and Clear Filters */}
								<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
									{/* Results Count skeleton */}
									<div className="h-5 bg-stone-800 rounded w-48" />
									{/* Clear Filters Button skeleton */}
									<div className="h-10 bg-stone-800 rounded-lg w-40" />
								</div>

								{/* Bottom Row: View Toggle and Display Options */}
								<div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-800">
									{/* View Toggle skeleton */}
									<div className="h-10 bg-stone-800 rounded-lg w-32" />
									{/* Divider */}
									<div className="h-6 w-px bg-stone-700" />
									{/* Results per page skeleton */}
									<div className="h-10 bg-stone-800 rounded-lg w-32" />
								</div>
							</div>
						</div>

						{/* Products Grid Skeleton - 12 cards matching default hits per page */}
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
							{Array.from({ length: 12 }).map((_, index) => (
								<div
									key={index}
									className="bg-stone-950 rounded-xl overflow-hidden border border-gray-700 h-full flex flex-col animate-pulse"
								>
									{/* Image skeleton - matches grid view aspect ratio [4/3] */}
									<div className="relative w-full aspect-[4/3] bg-stone-800" />

									{/* Content skeleton */}
									<div className="p-4 flex-1 flex flex-col gap-3">
										{/* Title */}
										<div className="h-5 bg-stone-800 rounded w-3/4" />
										<div className="h-5 bg-stone-800 rounded w-1/2" />

										{/* Description */}
										<div className="h-4 bg-stone-800 rounded w-full" />
										<div className="h-4 bg-stone-800 rounded w-5/6" />

										{/* Categories */}
										<div className="flex gap-2">
											<div className="h-6 bg-stone-800 rounded-full w-20" />
											<div className="h-6 bg-stone-800 rounded-full w-16" />
										</div>

										{/* Price and availability */}
										<div className="mt-auto pt-2 space-y-2">
											<div className="h-6 bg-stone-800 rounded w-24" />
											<div className="h-4 bg-stone-800 rounded w-32" />
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}


