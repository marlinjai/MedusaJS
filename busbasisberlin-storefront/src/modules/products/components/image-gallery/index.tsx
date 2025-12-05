// image-gallery/index.tsx

'use client';

import { HttpTypes } from '@medusajs/types';
import Image from 'next/image';
import { MouseEvent, useRef, useState } from 'react';

type ImageGalleryProps = {
	images: HttpTypes.StoreProductImage[];
};

const ImageGallery = ({ images }: ImageGalleryProps) => {
	const [selectedImage, setSelectedImage] = useState(0);
	const [isZoomed, setIsZoomed] = useState(false);
	const [isClickZoomed, setIsClickZoomed] = useState(false);
	const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
	const imageRef = useRef<HTMLDivElement>(null);

	// Handle mouse move for zoom effect (desktop only)
	const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
		if (!imageRef.current) return;

		const rect = imageRef.current.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;

		setZoomPosition({ x, y });
	};

	// Toggle click zoom
	const handleClick = () => {
		setIsClickZoomed(!isClickZoomed);
	};

	// Calculate zoom level based on hover and click states
	const getZoomScale = () => {
		if (isClickZoomed) return 'md:scale-[2.5]'; // 2.5x zoom when clicked
		if (isZoomed) return 'md:scale-150'; // 1.5x zoom on hover
		return 'scale-100'; // Normal size
	};

	if (!images || images.length === 0) {
		return (
			<div className="w-full aspect-square md:max-w-md lg:max-w-lg bg-muted rounded-lg flex items-center justify-center">
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
		<div className="flex flex-col-reverse md:flex-row gap-3 md:max-w-md lg:max-w-lg">
			{/* Thumbnails - vertical on desktop, horizontal on mobile */}
			{images.length > 1 && (
				<div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar md:max-h-[400px]">
					{images.map((image, index) => (
						<button
							key={image.id}
							onClick={() => setSelectedImage(index)}
							className={`relative flex-shrink-0 w-16 h-16 md:w-16 md:h-16 rounded-md overflow-hidden border-2 transition-all duration-200 ${
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
									quality={85}
									sizes="64px"
									className="object-contain p-1"
								/>
							)}
						</button>
					))}
				</div>
			)}

			{/* Main Image */}
			<div className="flex-1">
				<div
					ref={imageRef}
					className={`relative w-full aspect-square bg-muted rounded-lg overflow-hidden border border-border ${
						isClickZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
					} md:hover:${isClickZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
					onMouseEnter={() => setIsZoomed(true)}
					onMouseLeave={() => setIsZoomed(false)}
					onMouseMove={handleMouseMove}
					onClick={handleClick}
				>
					{images[selectedImage]?.url && (
						<Image
							src={images[selectedImage].url}
							alt={`Product image ${selectedImage + 1}`}
							fill
							priority={selectedImage === 0}
							quality={90}
							sizes="(max-width: 768px) 100vw, 500px"
							className={`object-contain p-3 transition-transform duration-200 ease-out ${getZoomScale()}`}
							style={
								isZoomed || isClickZoomed
									? {
											transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
									  }
									: undefined
							}
						/>
					)}

					{/* Zoom icon indicator */}
					<div className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-full pointer-events-none">
						{isClickZoomed ? (
							// Zoom out icon (minus)
							<svg
								className="w-4 h-4 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
								/>
							</svg>
						) : (
							// Zoom in icon (plus)
							<svg
								className="w-4 h-4 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
								/>
							</svg>
						)}
					</div>

					{/* Image counter */}
					{images.length > 1 && (
						<div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium pointer-events-none">
							{selectedImage + 1} / {images.length}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ImageGallery;
