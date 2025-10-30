// image-gallery/index.tsx

'use client';

import { HttpTypes } from '@medusajs/types';
import Image from 'next/image';
import { useState } from 'react';

type ImageGalleryProps = {
	images: HttpTypes.StoreProductImage[];
};

const ImageGallery = ({ images }: ImageGalleryProps) => {
	const [selectedImage, setSelectedImage] = useState(0);

	if (!images || images.length === 0) {
		return (
			<div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
				<svg
					className="w-20 h-20 text-muted-foreground"
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
		);
	}

	return (
		<div className="flex flex-col-reverse md:flex-row gap-4">
			{/* Thumbnails - vertical on desktop, horizontal on mobile */}
			{images.length > 1 && (
				<div className="flex md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar md:max-h-[600px]">
					{images.map((image, index) => (
						<button
							key={image.id}
							onClick={() => setSelectedImage(index)}
							className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
								selectedImage === index
									? 'border-primary ring-2 ring-primary ring-offset-2'
									: 'border-border hover:border-primary/50'
							}`}
						>
							{image.url && (
								<Image
									src={image.url}
									alt={`Thumbnail ${index + 1}`}
									fill
									sizes="96px"
									className="object-cover"
								/>
							)}
						</button>
					))}
				</div>
			)}

			{/* Main Image */}
			<div className="flex-1">
				<div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden border border-border">
					{images[selectedImage]?.url && (
						<Image
							src={images[selectedImage].url}
							alt={`Product image ${selectedImage + 1}`}
							fill
							priority={selectedImage === 0}
							sizes="(max-width: 768px) 100vw, 600px"
							className="object-cover"
						/>
					)}

					{/* Image counter */}
					{images.length > 1 && (
						<div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm font-medium">
							{selectedImage + 1} / {images.length}
						</div>
					)}
				</div>

				{/* Navigation arrows for desktop */}
				{images.length > 1 && (
					<>
						<button
							onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
							className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-all hidden md:flex"
							aria-label="Vorheriges Bild"
						>
							<svg
								className="w-6 h-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
						</button>

						<button
							onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
							className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-all hidden md:flex"
							aria-label="Nächstes Bild"
						>
							<svg
								className="w-6 h-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</>
				)}
			</div>
		</div>
	);
};

export default ImageGallery;
