'use client';

import { HttpTypes } from '@medusajs/types';
import { Container } from '@medusajs/ui';
import Image from 'next/image';
import { useState } from 'react';

type ImageGalleryProps = {
	images: HttpTypes.StoreProductImage[];
};

const ImageGallery = ({ images }: ImageGalleryProps) => {
	const [selectedImage, setSelectedImage] = useState(0);

	if (!images || images.length === 0) {
		return (
			<div className="w-full aspect-square bg-neutral-800 rounded-2xl flex items-center justify-center">
				<p className="text-neutral-500">Kein Bild verfügbar</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col-reverse md:flex-row gap-4">
			{/* Thumbnail Column */}
			{images.length > 1 && (
				<div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:max-h-[600px] custom-scrollbar">
					{images.map((image, index) => (
						<button
							key={image.id}
							onClick={() => setSelectedImage(index)}
							className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden transition-all duration-300 ${
								selectedImage === index
									? 'ring-2 ring-blue-500 scale-105 shadow-lg'
									: 'ring-1 ring-neutral-700 hover:ring-neutral-600 opacity-70 hover:opacity-100'
							}`}
						>
							{!!image.url && (
								<Image
									src={image.url}
									alt={`Thumbnail ${index + 1}`}
									fill
									sizes="100px"
									className="object-cover"
								/>
							)}
						</button>
					))}
				</div>
			)}

			{/* Main Image */}
			<div className="flex-1">
				<Container className="relative aspect-square w-full overflow-hidden bg-white rounded-2xl shadow-xl">
					{!!images[selectedImage]?.url && (
						<Image
							src={images[selectedImage].url}
							priority={selectedImage === 0}
							alt={`Product image ${selectedImage + 1}`}
							fill
							sizes="(max-width: 768px) 100vw, 50vw"
							className="object-contain p-4"
						/>
					)}

					{/* Image Counter */}
					{images.length > 1 && (
						<div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
							{selectedImage + 1} / {images.length}
						</div>
					)}
				</Container>

				{/* Navigation Arrows for Mobile */}
				{images.length > 1 && (
					<div className="flex justify-center gap-2 mt-4 md:hidden">
						<button
							onClick={() =>
								setSelectedImage(prev =>
									prev === 0 ? images.length - 1 : prev - 1,
								)
							}
							className="p-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
						>
							←
						</button>
						<button
							onClick={() =>
								setSelectedImage(prev =>
									prev === images.length - 1 ? 0 : prev + 1,
								)
							}
							className="p-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
						>
							→
						</button>
					</div>
				)}
			</div>

			{/* Custom scrollbar styles */}
			<style jsx>{`
				.custom-scrollbar::-webkit-scrollbar {
					width: 6px;
					height: 6px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: rgba(255, 255, 255, 0.05);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: rgba(255, 255, 255, 0.2);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: rgba(255, 255, 255, 0.3);
				}
			`}</style>
		</div>
	);
};

export default ImageGallery;
