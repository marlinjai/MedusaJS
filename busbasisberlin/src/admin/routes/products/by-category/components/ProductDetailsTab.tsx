// busbasisberlin/src/admin/routes/products/by-category/components/ProductDetailsTab.tsx
// Product details tab for basic product information

import { Button, Input, Label, Switch, Text, Textarea } from '@medusajs/ui';
import { Check, CloudUpload, Star, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';

type ProductFormData = {
	title?: string;
	subtitle?: string;
	handle?: string;
	description?: string;
	status?: 'published' | 'draft';
	has_variants?: boolean;
	images?: Array<{ id?: string; url: string }>;
	thumbnail?: string;
};

interface ProductDetailsTabProps {
	formData: Partial<ProductFormData>;
	onChange: (data: Partial<ProductFormData>) => void;
}

const ProductDetailsTab = ({
	formData,
	onChange,
}: ProductDetailsTabProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

	// Toggle image selection
	const toggleImageSelection = (index: number, e: React.MouseEvent) => {
		e.stopPropagation();
		const newSelection = new Set(selectedImages);
		if (newSelection.has(index)) {
			newSelection.delete(index);
		} else {
			newSelection.add(index);
		}
		setSelectedImages(newSelection);
	};

	// Clear selection
	const clearSelection = () => {
		setSelectedImages(new Set());
	};

	// Delete selected images
	const deleteSelectedImages = () => {
		const newImages = (formData.images || []).filter((_, i) => !selectedImages.has(i));
		// If the thumbnail was deleted, clear it
		const deletedUrls = (formData.images || [])
			.filter((_, i) => selectedImages.has(i))
			.map(img => img.url);
		const newThumbnail = deletedUrls.includes(formData.thumbnail || '')
			? undefined
			: formData.thumbnail;

		onChange({
			...formData,
			images: newImages,
			thumbnail: newThumbnail,
		});
		clearSelection();
	};

	// Set selected image as thumbnail
	const setAsThumbnail = () => {
		if (selectedImages.size !== 1) return;
		const selectedIndex = Array.from(selectedImages)[0];
		const selectedImage = formData.images?.[selectedIndex];
		if (selectedImage) {
			onChange({
				...formData,
				thumbnail: selectedImage.url,
			});
			clearSelection();
		}
	};

	const handleFileSelect = (files: FileList | null) => {
		if (!files || files.length === 0) return;

		const fileArray = Array.from(files);
		const imagePromises = fileArray.map(file => {
			return new Promise<{ url: string }>(resolve => {
				const reader = new FileReader();
				reader.onload = e => {
					const result = e.target?.result;
					if (typeof result === 'string') {
						resolve({ url: result });
					}
				};
				reader.readAsDataURL(file);
			});
		});

		Promise.all(imagePromises).then(images => {
			onChange({
				...formData,
				images: [...(formData.images || []), ...images],
			});
		});
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		handleFileSelect(e.dataTransfer.files);
	};

	return (
		<div className="space-y-6">
			{/* Allgemein Section */}
			<div className="space-y-4">
				<div>
					<Label htmlFor="title" className="mb-2">
						Titel *
					</Label>
					<Input
						id="title"
						value={formData.title || ''}
						onChange={e =>
							onChange({
								...formData,
								title: e.target.value,
							})
						}
						placeholder="Produkttitel"
						required
					/>
				</div>

				<div>
					<Label htmlFor="subtitle" className="mb-2">
						Untertitel (Optional)
					</Label>
					<Input
						id="subtitle"
						value={formData.subtitle || ''}
						onChange={e =>
							onChange({
								...formData,
								subtitle: e.target.value,
							})
						}
						placeholder="Untertitel"
					/>
				</div>

				<div>
					<Label htmlFor="handle" className="mb-2">
						Handle (Optional)
					</Label>
					<Input
						id="handle"
						value={formData.handle || ''}
						onChange={e =>
							onChange({
								...formData,
								handle: e.target.value,
							})
						}
						placeholder="/ produkt-handle"
					/>
					<Text size="small" className="text-ui-fg-subtle mt-1">
						Wird automatisch aus dem Titel generiert, wenn leer gelassen
					</Text>
				</div>

				<div>
					<Label htmlFor="description" className="mb-2">
						Beschreibung (Optional)
					</Label>
					<Textarea
						id="description"
						value={formData.description || ''}
						onChange={e =>
							onChange({
								...formData,
								description: e.target.value,
							})
						}
						placeholder="Produktbeschreibung"
						rows={6}
					/>
				</div>
			</div>

			{/* Medien Section */}
			<div>
				<Label className="mb-2">Medien (Optional)</Label>
				<div
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
						isDragging
							? 'border-ui-fg-interactive bg-ui-bg-interactive'
							: 'border-ui-border-base'
					}`}
				>
					<CloudUpload className="w-12 h-12 mx-auto mb-4 text-ui-fg-subtle" />
					<Text size="small" className="text-ui-fg-subtle mb-2">
						Bilder hochladen
					</Text>
					<Text size="small" className="text-ui-fg-muted mb-4">
						Ziehen Sie Bilder per Drag-and-Drop hierher oder klicken Sie zum
						Hochladen.
					</Text>
					<Button
						variant="secondary"
						size="small"
						onClick={() => fileInputRef.current?.click()}
					>
						Dateien auswählen
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept="image/*"
						className="hidden"
						onChange={e => handleFileSelect(e.target.files)}
					/>
				</div>

				{/* Action Bar - shown when images are selected */}
				{selectedImages.size > 0 && (
					<div className="flex items-center gap-3 mt-4 p-3 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
						<Text size="small" className="text-ui-fg-subtle">
							{selectedImages.size} ausgewählt
						</Text>
						<div className="flex-1" />
						{selectedImages.size === 1 && (
							<Button
								variant="secondary"
								size="small"
								onClick={setAsThumbnail}
							>
								<Star className="w-4 h-4 mr-2" />
								Als Hauptbild
							</Button>
						)}
						<Button
							variant="secondary"
							size="small"
							onClick={deleteSelectedImages}
							className="text-red-500 hover:text-red-700"
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Löschen ({selectedImages.size})
						</Button>
						<Button
							variant="transparent"
							size="small"
							onClick={clearSelection}
						>
							<X className="w-4 h-4" />
						</Button>
					</div>
				)}

				{/* Image Grid */}
				{formData.images && formData.images.length > 0 && (
					<div className="grid grid-cols-4 gap-4 mt-4">
						{formData.images.map((image, index) => {
							const isSelected = selectedImages.has(index);
							const isThumbnail = formData.thumbnail === image.url;

							return (
								<div
									key={index}
									className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
										isSelected
											? 'border-blue-500 ring-2 ring-blue-200'
											: 'border-ui-border-base hover:border-ui-fg-subtle'
									}`}
									onClick={(e) => toggleImageSelection(index, e)}
								>
									{/* Thumbnail Badge */}
									{isThumbnail && (
										<div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
											<Star className="w-3 h-3 fill-current" />
											<span>Hauptbild</span>
										</div>
									)}

									{/* Selection Checkbox */}
									<div
										className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
											isSelected
												? 'bg-blue-500 border-blue-500'
												: 'bg-white/80 border-ui-border-base opacity-0 group-hover:opacity-100'
										}`}
									>
										{isSelected && <Check className="w-4 h-4 text-white" />}
									</div>

									{/* Image */}
									<img
										src={image.url}
										alt={`Upload ${index + 1}`}
										className="w-full h-32 object-cover"
									/>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Varianten Toggle */}
			<div className="flex items-center gap-3 pt-4 border-t border-ui-border-base">
				<Switch
					checked={formData.has_variants || false}
					onCheckedChange={checked =>
						onChange({
							...formData,
							has_variants: checked,
						})
					}
				/>
				<div>
					<Label>Ja, es handelt sich um ein Produkt mit Varianten</Label>
					<Text size="small" className="text-ui-fg-subtle block mt-1">
						Wenn diese Option deaktiviert ist, erstellen wir eine Standardvariante
						für Sie
					</Text>
				</div>
			</div>
		</div>
	);
};

export default ProductDetailsTab;

