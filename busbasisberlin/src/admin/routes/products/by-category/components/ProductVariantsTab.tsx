// busbasisberlin/src/admin/routes/products/by-category/components/ProductVariantsTab.tsx
// Product variants tab with options-based variant generation and draggable columns

import { Button, Checkbox, Input, Table, Text } from '@medusajs/ui';
import {
	Check,
	CloudUpload,
	GripVertical,
	Plus,
	Star,
	Trash2,
	X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCurrencies } from '../hooks/useCurrencies';
import { generateVariantsFromOptions } from '../utils/variant-generation';
import type { ProductOption, Variant } from './ProductEditorModal';
import ProductOptionsSection from './ProductOptionsSection';

type ProductFormData = {
	variants?: Variant[];
	has_variants?: boolean;
	options?: ProductOption[];
	images?: Array<{ id?: string; url: string }>;
};

interface ProductVariantsTabProps {
	formData: Partial<ProductFormData>;
	onChange: (data: Partial<ProductFormData>) => void;
}

// Base column configuration (non-price columns)
const BASE_VARIANT_COLUMNS = [
	{ key: 'image', label: 'Bild', width: 80 },
	{ key: 'option_combination', label: 'option(z.B.Farbe) / größe', width: 250 },
	{ key: 'title', label: 'Titel', width: 200 },
	{ key: 'sku', label: 'Artikelnummer', width: 150 },
	{ key: 'manage_inventory', label: 'Verwalteter Bestand', width: 120 },
	{ key: 'allow_backorder', label: 'Rückstand zulassen', width: 120 },
];

const STORAGE_KEY = 'product-variants-table-column-widths';

const ProductVariantsTab = ({
	formData,
	onChange,
}: ProductVariantsTabProps) => {
	const hasVariants = formData.has_variants || false;
	const options = formData.options || [];

	// Fetch available currencies dynamically using React Query
	const { data: currencies = [], isLoading: currenciesLoading, isPlaceholderData, isFetching } = useCurrencies();

	// Debug logging for currencies
	useEffect(() => {
		console.log('[ProductVariantsTab] Currencies state:', {
			count: currencies.length,
			codes: currencies.map(c => c.code),
			isLoading: currenciesLoading,
			isPlaceholderData,
			isFetching,
		});
	}, [currencies, currenciesLoading, isPlaceholderData, isFetching]);

	// Build variant columns dynamically based on available currencies
	const variantColumns = useMemo(() => {
		const currencyColumns = currencies.map(currency => ({
			key: `price_${currency.code}`,
			label: `Preis ${currency.code.toUpperCase()} (${currency.symbol})`,
			width: 120,
			currency: currency, // Store currency metadata for rendering
		}));

		console.log('[ProductVariantsTab] Building columns with', currencies.length, 'currencies');
		return [...BASE_VARIANT_COLUMNS, ...currencyColumns];
	}, [currencies]);

	const existingVariants = formData.variants || [];
	const productImages = formData.images || [];

	// Image selector state
	const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
	const [selectedVariantIndex, setSelectedVariantIndex] = useState<
		number | null
	>(null);
	const [selectedImageUrls, setSelectedImageUrls] = useState<Set<string>>(
		new Set(),
	);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	// Handle clicking on variant image to open selector
	const handleImageClick = (variantIndex: number) => {
		const variant = mergedVariants[variantIndex];
		// Initialize selected images with current variant images
		const currentImages = new Set(variant.images?.map(img => img.url) || []);
		setSelectedImageUrls(currentImages);
		setSelectedVariantIndex(variantIndex);
		setImageSelectorOpen(true);
	};

	// Toggle image selection (multi-select)
	const toggleImageSelection = (imageUrl: string) => {
		const newSelection = new Set(selectedImageUrls);
		if (newSelection.has(imageUrl)) {
			newSelection.delete(imageUrl);
		} else {
			newSelection.add(imageUrl);
		}
		setSelectedImageUrls(newSelection);
	};

	// Set image as variant thumbnail (works with multiple selected - uses first)
	const setAsVariantThumbnail = () => {
		if (selectedVariantIndex === null || selectedImageUrls.size === 0) return;

		const newVariants = [...mergedVariants];
		// Use first selected image as thumbnail
		const thumbnailUrl = Array.from(selectedImageUrls)[0];
		newVariants[selectedVariantIndex] = {
			...newVariants[selectedVariantIndex],
			variant_thumbnail: thumbnailUrl,
		};
		onChange({
			...formData,
			variants: newVariants,
		});
	};

	// Handle file selection for upload
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
			// Add to product images
			const newProductImages = [...productImages, ...images];

			// Add to selected variant images
			const newSelectedUrls = new Set(selectedImageUrls);
			images.forEach(img => newSelectedUrls.add(img.url));
			setSelectedImageUrls(newSelectedUrls);

			// Update formData
			onChange({
				...formData,
				images: newProductImages,
			});
		});
	};

	// Handle drag and drop
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

	// Save selected images to variant
	const saveVariantImages = () => {
		if (selectedVariantIndex === null) return;

		const newVariants = [...mergedVariants];
		const imageArray = Array.from(selectedImageUrls).map(url => ({ url }));

		// Auto-set thumbnail if only one image
		const autoThumbnail =
			imageArray.length === 1 ? imageArray[0].url : undefined;

		// Ensure all variant images are in product images
		const currentProductImages = formData.images || [];
		const missingImages = imageArray.filter(
			img => !currentProductImages.some(prodImg => prodImg.url === img.url),
		);

		newVariants[selectedVariantIndex] = {
			...newVariants[selectedVariantIndex],
			images: imageArray.length > 0 ? imageArray : undefined,
			variant_thumbnail:
				autoThumbnail ||
				(newVariants[selectedVariantIndex].variant_thumbnail &&
				selectedImageUrls.has(
					newVariants[selectedVariantIndex].variant_thumbnail!,
				)
					? newVariants[selectedVariantIndex].variant_thumbnail
					: imageArray.length > 0
						? imageArray[0].url
						: undefined),
		};

		onChange({
			...formData,
			images: [...currentProductImages, ...missingImages],
			variants: newVariants,
		});
		setImageSelectorOpen(false);
		setSelectedVariantIndex(null);
		setSelectedImageUrls(new Set());
	};

	// Remove selected images from variant (keeps them in product images)
	const removeSelectedVariantImages = () => {
		if (selectedVariantIndex === null || selectedImageUrls.size === 0) return;

		const newVariants = [...mergedVariants];
		const variant = newVariants[selectedVariantIndex];
		const currentVariantImages = variant.images || [];

		// Remove only selected images from variant (not from product)
		const remainingImages = currentVariantImages.filter(
			img => !selectedImageUrls.has(img.url),
		);

		// Clear thumbnail if it was removed
		const newThumbnail =
			variant.variant_thumbnail &&
			!selectedImageUrls.has(variant.variant_thumbnail)
				? variant.variant_thumbnail
				: remainingImages.length > 0
					? remainingImages[0].url
					: undefined;

		newVariants[selectedVariantIndex] = {
			...newVariants[selectedVariantIndex],
			images: remainingImages.length > 0 ? remainingImages : undefined,
			variant_thumbnail: newThumbnail,
		};

		// Update selected images in modal to reflect removal
		const newSelectedUrls = new Set(selectedImageUrls);
		currentVariantImages
			.filter(img => selectedImageUrls.has(img.url))
			.forEach(img => newSelectedUrls.delete(img.url));

		onChange({
			...formData,
			variants: newVariants,
		});
		setSelectedImageUrls(newSelectedUrls);
	};

	// Remove all images from variant
	const removeAllVariantImages = () => {
		if (selectedVariantIndex === null) return;

		const newVariants = [...mergedVariants];
		newVariants[selectedVariantIndex] = {
			...newVariants[selectedVariantIndex],
			images: undefined,
			variant_thumbnail: undefined,
		};
		onChange({
			...formData,
			variants: newVariants,
		});
		setImageSelectorOpen(false);
		setSelectedVariantIndex(null);
		setSelectedImageUrls(new Set());
	};

	// Save selected images to variant (for manual mode - now supports multiple)
	const saveVariantImagesManual = () => {
		if (selectedVariantIndex === null) return;

		const newVariants = [...mergedVariants];
		const imageArray = Array.from(selectedImageUrls).map(url => ({ url }));

		// Ensure all variant images are in product images
		const currentProductImages = formData.images || [];
		const missingImages = imageArray.filter(
			img => !currentProductImages.some(prodImg => prodImg.url === img.url),
		);

		// Preserve thumbnail if it's still in selected images, otherwise use first
		const currentThumbnail =
			mergedVariants[selectedVariantIndex]?.variant_thumbnail;
		const newThumbnail =
			currentThumbnail && selectedImageUrls.has(currentThumbnail)
				? currentThumbnail
				: imageArray.length > 0
					? imageArray[0].url
					: undefined;

		newVariants[selectedVariantIndex] = {
			...newVariants[selectedVariantIndex],
			images: imageArray.length > 0 ? imageArray : undefined,
			variant_thumbnail: newThumbnail,
		};

		onChange({
			...formData,
			images: [...currentProductImages, ...missingImages],
			variants: newVariants,
		});
		setImageSelectorOpen(false);
		setSelectedVariantIndex(null);
		setSelectedImageUrls(new Set());
	};

	// Generate variants from options when in options mode
	const generatedVariants = useMemo(() => {
		if (!hasVariants || options.length === 0) {
			return [];
		}
		return generateVariantsFromOptions(options);
	}, [hasVariants, options]);

	// Merge generated variants with existing variant data (preserve user edits)
	const mergedVariants = useMemo(() => {
		if (!hasVariants || generatedVariants.length === 0) {
			return existingVariants;
		}

		// Map existing variants by their option combination
		const existingMap = new Map<string, Variant>();
		existingVariants.forEach(v => {
			const key = v.option_values?.join(' / ') || v.title;
			existingMap.set(key, v);
		});

		// Merge: use existing data if available, otherwise use generated
		return generatedVariants.map(genVariant => {
			const key = genVariant.option_values?.join(' / ') || genVariant.title;
			const existing = existingMap.get(key);
			return existing
				? { ...genVariant, ...existing } // Preserve user edits
				: genVariant;
		});
	}, [hasVariants, generatedVariants, existingVariants]);

	// Load column widths from localStorage
	const loadColumnWidths = () => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				const widths: { [key: string]: number } = {};
				variantColumns.forEach(col => {
					widths[col.key] = parsed[col.key] || col.width;
				});
				return widths;
			} catch (e) {
				// Use defaults
			}
		}
		const widths: { [key: string]: number } = {};
		variantColumns.forEach(col => {
			widths[col.key] = col.width;
		});
		return widths;
	};

	const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(
		loadColumnWidths,
	);

	// Sync column widths when variantColumns changes (e.g., when currencies load)
	// This ensures new columns get initialized with proper widths
	useEffect(() => {
		setColumnWidths(prevWidths => {
			const newWidths = { ...prevWidths };
			let hasChanges = false;

			// Add widths for new columns that don't exist yet
			variantColumns.forEach(col => {
				if (!(col.key in newWidths)) {
					newWidths[col.key] = col.width;
					hasChanges = true;
				}
			});

			// Remove widths for columns that no longer exist
			Object.keys(newWidths).forEach(key => {
				if (!variantColumns.find(col => col.key === key)) {
					delete newWidths[key];
					hasChanges = true;
				}
			});

			return hasChanges ? newWidths : prevWidths;
		});
	}, [variantColumns]);
	const [isResizing, setIsResizing] = useState<string | null>(null);
	const tableRef = useRef<HTMLTableElement>(null);

	// Save column widths to localStorage
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
	}, [columnWidths]);

	// Update variants when options change (only in options mode)
	// This ensures variants are regenerated when options are modified
	useEffect(() => {
		if (hasVariants && options.length > 0 && generatedVariants.length > 0) {
			// Only update if the number of generated variants changed
			// This prevents infinite loops while still updating when options change
			const currentVariantCount = existingVariants.length;
			const newVariantCount = generatedVariants.length;

			if (currentVariantCount !== newVariantCount) {
				onChange({
					...formData,
					variants: mergedVariants,
				});
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasVariants, options.length, generatedVariants.length]);

	// Calculate total table width
	const totalTableWidth = Object.values(columnWidths).reduce(
		(sum, width) => sum + width,
		0,
	);

	// Handle column resize
	const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
		e.preventDefault();
		e.stopPropagation();
		setIsResizing(columnKey);

		const startX = e.clientX;
		const startWidth = columnWidths[columnKey];

		const handleMouseMove = (e: MouseEvent) => {
			const diff = e.clientX - startX;
			const minWidth = getMinimumWidth(columnKey);
			const newWidth = Math.max(minWidth, startWidth + diff);
			setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
		};

		const handleMouseUp = () => {
			setIsResizing(null);
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	};

	const getMinimumWidth = (columnKey: string) => {
		switch (columnKey) {
			case 'option_combination':
			case 'title':
				return 200;
		case 'sku':
			return 150;
		case 'manage_inventory':
		case 'allow_backorder':
			return 120;
		default:
			// Handle all price columns dynamically
			if (columnKey.startsWith('price_')) {
				return 120;
			}
			return 100;
	}
};

	const handleOptionsChange = (newOptions: ProductOption[]) => {
		onChange({
			...formData,
			options: newOptions,
		});
	};

	const updateVariant = (index: number, field: keyof Variant, value: any) => {
		const newVariants = [...mergedVariants];
		newVariants[index] = {
			...newVariants[index],
			[field]: value,
		};
		onChange({
			...formData,
			variants: newVariants,
		});
	};

	const toggleVariantEnabled = (index: number) => {
		updateVariant(index, 'enabled', !mergedVariants[index].enabled);
	};

	const addManualVariant = () => {
		const newVariant: any = {
			title: '',
			sku: '',
			manage_inventory: false,
			allow_backorder: false,
			enabled: true,
		};

		// Add price fields for all available currencies dynamically
		currencies.forEach(currency => {
			newVariant[`price_${currency.code}`] = 0;
		});

		onChange({
			...formData,
			variants: [...mergedVariants, newVariant as Variant],
		});
	};

	const removeVariant = (index: number) => {
		const newVariants = mergedVariants.filter((_, i) => i !== index);
		onChange({
			...formData,
			variants: newVariants,
		});
	};

	// Options Mode: Show options section + generated variants
	if (hasVariants) {
		return (
			<div className="space-y-6">
				{/* Product Options Section */}
				<ProductOptionsSection
					options={options}
					onChange={handleOptionsChange}
				/>

				{/* Product Variants Section */}
				<div className="space-y-4">
					<div>
						<Text size="base" weight="plus" className="mb-2">
							Produktvarianten
						</Text>
						<Text size="small" className="text-ui-fg-subtle">
							Dieses Ranking wirkt sich auf die Reihenfolge der Varianten in
							Ihrem Store aus.
						</Text>
					</div>

					{generatedVariants.length === 0 ? (
						<div className="border border-ui-border-base rounded-lg p-6 text-center">
							<Text size="small" className="text-ui-fg-subtle">
								Fügen Sie Optionen hinzu, um Varianten zu erstellen.
							</Text>
						</div>
					) : (
						<div className="border border-ui-border-base rounded-lg">
							<div className="divide-y divide-ui-border-base">
								{mergedVariants.map((variant, index) => (
									<div
										key={index}
										className="flex items-center gap-4 p-4 hover:bg-ui-bg-subtle"
									>
										<Checkbox
											checked={variant.enabled !== false}
											onCheckedChange={() => toggleVariantEnabled(index)}
										/>
										<GripVertical className="w-4 h-4 text-ui-fg-muted cursor-move" />
										<Text size="small" className="flex-1">
											{variant.option_values?.join(' / ') || variant.title}
										</Text>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Variant Table for Editing */}
					{mergedVariants.length > 0 && (
						<div className="relative overflow-x-auto">
							<Text size="small" className="text-ui-fg-subtle mb-4">
								Verwalten Sie Varianten für dieses Produkt
							</Text>
							<Table
								ref={tableRef}
								style={{
									width: `${totalTableWidth}px`,
									minWidth: `${totalTableWidth}px`,
									tableLayout: 'fixed',
								}}
							>
								<Table.Header>
									<Table.Row>
										{variantColumns.map((column, colIndex) => (
											<Table.HeaderCell
												key={column.key}
												style={{
													width: `${columnWidths[column.key]}px`,
													maxWidth: `${columnWidths[column.key]}px`,
													minWidth: `${columnWidths[column.key]}px`,
													position: 'relative',
													overflow: 'visible',
												}}
												className="select-none"
											>
												<div className="flex items-center min-w-0 text-sm">
													<div
														className="mr-1.5"
														style={{
															whiteSpace: 'nowrap',
															overflow: 'hidden',
															textOverflow: 'ellipsis',
														}}
														title={column.label}
													>
														{column.label}
													</div>
												</div>

												{colIndex < variantColumns.length - 1 && (
													<div
														className={`absolute top-0 right-0 w-4 h-full cursor-col-resize hover:bg-blue-200 hover:border-l-2 hover:border-blue-400 transition-all duration-200 z-30 ${
															isResizing === column.key
																? 'bg-blue-300 border-l-2 border-blue-500'
																: ''
														}`}
														onMouseDown={e => handleMouseDown(e, column.key)}
														style={{
															right: '-2px',
															zIndex: 30,
														}}
														title="Drag to resize column"
													/>
												)}
											</Table.HeaderCell>
										))}
										<Table.HeaderCell style={{ width: '80px' }}>
											Aktionen
										</Table.HeaderCell>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{mergedVariants
										.filter(v => v.enabled !== false)
										.map((variant, index) => {
											const actualIndex = mergedVariants.indexOf(variant);
											return (
												<Table.Row key={actualIndex}>
													{variantColumns.map(column => (
														<Table.Cell
															key={column.key}
															style={{
																width: `${columnWidths[column.key]}px`,
																maxWidth: `${columnWidths[column.key]}px`,
																minWidth: `${columnWidths[column.key]}px`,
													overflow: 'hidden',
												}}
												className="px-2"
											>
												{renderCellContent(
													variant,
													column.key,
													column, // Pass full column object
													actualIndex,
													updateVariant,
													productImages,
																handleImageClick,
															)}
														</Table.Cell>
													))}
													<Table.Cell>
														<Button
															variant="transparent"
															size="small"
															onClick={() => removeVariant(actualIndex)}
															className="text-red-500 hover:text-red-700"
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</Table.Cell>
												</Table.Row>
											);
										})}
								</Table.Body>
							</Table>
						</div>
					)}

					{/* Tip Box */}
					<div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4">
						<Text size="small" weight="plus" className="mb-2">
							Tipp:
						</Text>
						<Text size="small" className="text-ui-fg-subtle">
							Varianten, die nicht aktiviert sind, werden nicht erstellt. Sie
							können nachträglich jederzeit Varianten erstellen und bearbeiten,
							diese Liste passt jedoch zu den Variationen in Ihren
							Produktoptionen.
						</Text>
					</div>
				</div>

				{/* Image Selector Modal */}
				{imageSelectorOpen && selectedVariantIndex !== null && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
						<div className="bg-ui-bg-base rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
							<div className="flex items-center justify-between mb-4">
								<Text weight="plus">Bilder für Variante auswählen</Text>
								<Button
									variant="transparent"
									size="small"
									onClick={() => {
										setImageSelectorOpen(false);
										setSelectedVariantIndex(null);
										setSelectedImageUrls(new Set());
										setIsDragging(false);
									}}
								>
									<X className="w-4 h-4" />
								</Button>
							</div>

							{/* File Upload Section */}
							<div
								className={`border-2 border-dashed rounded-lg p-6 mb-4 transition-colors ${
									isDragging
										? 'border-ui-fg-interactive bg-ui-bg-subtle'
										: 'border-ui-border-base hover:border-ui-fg-subtle'
								}`}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
							>
								<div className="flex flex-col items-center justify-center gap-3">
									<CloudUpload className="w-8 h-8 text-ui-fg-subtle" />
									<Text size="small" className="text-ui-fg-subtle text-center">
										Ziehen Sie Bilder hierher oder klicken Sie zum Hochladen
									</Text>
									<Button
										variant="secondary"
										size="small"
										onClick={() => fileInputRef.current?.click()}
									>
										<CloudUpload className="w-4 h-4 mr-2" />
										Bilder hochladen
									</Button>
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										multiple
										className="hidden"
										onChange={e => handleFileSelect(e.target.files)}
									/>
									<Text size="small" className="text-ui-fg-muted text-center">
										Hochgeladene Bilder werden automatisch zu Produktbildern
										hinzugefügt
									</Text>
								</div>
							</div>

							{/* Existing Product Images */}
							{productImages.length === 0 ? (
								<div className="text-center py-4">
									<Text size="small" className="text-ui-fg-subtle">
										Keine Produktbilder verfügbar. Laden Sie Bilder hoch oder
										verwenden Sie den "Details" Tab.
									</Text>
								</div>
							) : (
								<>
									<div className="grid grid-cols-4 gap-3 mb-4">
										{productImages.map((image, imgIndex) => {
											const isSelected = selectedImageUrls.has(image.url);
											const isThumbnail =
												mergedVariants[selectedVariantIndex]
													?.variant_thumbnail === image.url;
											return (
												<div
													key={imgIndex}
													className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all group ${
														isSelected
															? 'border-blue-500 ring-2 ring-blue-200'
															: 'border-ui-border-base hover:border-ui-fg-subtle'
													}`}
													onClick={() => toggleImageSelection(image.url)}
												>
													<img
														src={image.url}
														alt={`Image ${imgIndex + 1}`}
														className="w-full h-24 object-cover"
													/>
													{/* Selection Checkbox */}
													<div
														className={`absolute top-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
															isSelected
																? 'bg-blue-500 border-blue-500'
																: 'bg-white/80 border-ui-border-base opacity-0 group-hover:opacity-100'
														}`}
													>
														{isSelected && (
															<Check className="w-3 h-3 text-white" />
														)}
													</div>
													{/* Thumbnail Badge */}
													{isThumbnail && (
														<div className="absolute top-1 left-1 flex items-center gap-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
															<Star className="w-3 h-3 fill-current" />
															<span>Miniatur</span>
														</div>
													)}
												</div>
											);
										})}
									</div>
									{/* Action Bar */}
									{selectedImageUrls.size > 0 && (
										<div className="flex items-center gap-3 p-3 bg-ui-bg-subtle rounded-lg border border-ui-border-base mb-4">
											<Text size="small" className="text-ui-fg-subtle">
												{selectedImageUrls.size} ausgewählt
											</Text>
											<div className="flex-1" />
											<Button
												variant="secondary"
												size="small"
												onClick={setAsVariantThumbnail}
											>
												<Star className="w-4 h-4 mr-2" />
												Als Miniatur
											</Button>
											<Button
												variant="secondary"
												size="small"
												onClick={removeSelectedVariantImages}
												className="text-red-500 hover:text-red-700"
											>
												<Trash2 className="w-4 h-4 mr-2" />
												Entfernen ({selectedImageUrls.size})
											</Button>
										</div>
									)}
									{/* Action Buttons */}
									<div className="flex gap-3">
										<Button
											variant="primary"
											size="small"
											onClick={saveVariantImages}
											className="flex-1"
										>
											Speichern ({selectedImageUrls.size})
										</Button>
										{mergedVariants[selectedVariantIndex]?.images &&
											mergedVariants[selectedVariantIndex].images!.length >
												0 && (
												<Button
													variant="secondary"
													size="small"
													onClick={removeAllVariantImages}
													className="text-red-500"
												>
													<Trash2 className="w-4 h-4 mr-2" />
													Alle entfernen
												</Button>
											)}
									</div>
								</>
							)}
						</div>
					</div>
				)}
			</div>
		);
	}

	// Manual Mode: Show manual variant table
	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<Text size="small" className="text-ui-fg-subtle">
					Verwalten Sie Varianten für dieses Produkt
				</Text>
				<Button variant="secondary" size="small" onClick={addManualVariant}>
					<Plus className="w-4 h-4 mr-2" />
					Variante hinzufügen
				</Button>
			</div>

			{mergedVariants.length === 0 ? (
				<div className="flex items-center justify-center py-12 border border-ui-border-base rounded-lg">
					<Text size="small" className="text-ui-fg-subtle">
						Keine Varianten vorhanden. Klicken Sie auf "Variante hinzufügen"
					</Text>
				</div>
			) : (
				<div className="relative overflow-x-auto">
					<Table
						ref={tableRef}
						style={{
							width: `${totalTableWidth}px`,
							minWidth: `${totalTableWidth}px`,
							tableLayout: 'fixed',
						}}
					>
						<Table.Header>
							<Table.Row>
								{variantColumns.map((column, colIndex) => (
									<Table.HeaderCell
										key={column.key}
										style={{
											width: `${columnWidths[column.key]}px`,
											maxWidth: `${columnWidths[column.key]}px`,
											minWidth: `${columnWidths[column.key]}px`,
											position: 'relative',
											overflow: 'visible',
										}}
										className="select-none"
									>
										<div className="flex items-center min-w-0 text-sm">
											<div
												className="mr-1.5"
												style={{
													whiteSpace: 'nowrap',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
												}}
												title={column.label}
											>
												{column.label}
											</div>
										</div>

										{colIndex < variantColumns.length - 1 && (
											<div
												className={`absolute top-0 right-0 w-4 h-full cursor-col-resize hover:bg-blue-200 hover:border-l-2 hover:border-blue-400 transition-all duration-200 z-30 ${
													isResizing === column.key
														? 'bg-blue-300 border-l-2 border-blue-500'
														: ''
												}`}
												onMouseDown={e => handleMouseDown(e, column.key)}
												style={{
													right: '-2px',
													zIndex: 30,
												}}
												title="Drag to resize column"
											/>
										)}
									</Table.HeaderCell>
								))}
								<Table.HeaderCell style={{ width: '80px' }}>
									Aktionen
								</Table.HeaderCell>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{mergedVariants.map((variant, index) => (
								<Table.Row key={index}>
									{variantColumns.map(column => (
										<Table.Cell
											key={column.key}
											style={{
												width: `${columnWidths[column.key]}px`,
												maxWidth: `${columnWidths[column.key]}px`,
											minWidth: `${columnWidths[column.key]}px`,
											overflow: 'hidden',
										}}
										className="px-2"
									>
										{renderCellContent(
											variant,
											column.key,
											column, // Pass full column object
											index,
											updateVariant,
											productImages,
												handleImageClick,
											)}
										</Table.Cell>
									))}
									<Table.Cell>
										<Button
											variant="transparent"
											size="small"
											onClick={() => removeVariant(index)}
											className="text-red-500 hover:text-red-700"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							))}
						</Table.Body>
					</Table>
				</div>
			)}

			{/* Image Selector Modal */}
			{imageSelectorOpen && selectedVariantIndex !== null && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-ui-bg-base rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-auto">
						<div className="flex items-center justify-between mb-4">
							<Text weight="plus">Bild für Variante auswählen</Text>
							<Button
								variant="transparent"
								size="small"
								onClick={() => {
									setImageSelectorOpen(false);
									setSelectedVariantIndex(null);
									setSelectedImageUrls(new Set());
									setIsDragging(false);
								}}
							>
								<X className="w-4 h-4" />
							</Button>
						</div>

						{/* File Upload Section */}
						<div
							className={`border-2 border-dashed rounded-lg p-6 mb-4 transition-colors ${
								isDragging
									? 'border-ui-fg-interactive bg-ui-bg-subtle'
									: 'border-ui-border-base hover:border-ui-fg-subtle'
							}`}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
						>
							<div className="flex flex-col items-center justify-center gap-3">
								<CloudUpload className="w-8 h-8 text-ui-fg-subtle" />
								<Text size="small" className="text-ui-fg-subtle text-center">
									Ziehen Sie Bilder hierher oder klicken Sie zum Hochladen
								</Text>
								<Button
									variant="secondary"
									size="small"
									onClick={() => fileInputRef.current?.click()}
								>
									<CloudUpload className="w-4 h-4 mr-2" />
									Bilder hochladen
								</Button>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									multiple
									className="hidden"
									onChange={e => handleFileSelect(e.target.files)}
								/>
								<Text size="small" className="text-ui-fg-muted text-center">
									Hochgeladene Bilder werden automatisch zu Produktbildern
									hinzugefügt
								</Text>
							</div>
						</div>

						{productImages.length === 0 ? (
							<div className="text-center py-8">
								<Text size="small" className="text-ui-fg-subtle">
									Keine Produktbilder verfügbar. Laden Sie Bilder hoch oder
									verwenden Sie den "Details" Tab.
								</Text>
							</div>
						) : (
							<>
								<div className="grid grid-cols-4 gap-3 mb-4">
									{productImages.map((image, imgIndex) => {
										const isSelected = selectedImageUrls.has(image.url);
										const isThumbnail =
											mergedVariants[selectedVariantIndex]
												?.variant_thumbnail === image.url;
										return (
											<div
												key={imgIndex}
												className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all group ${
													isSelected
														? 'border-blue-500 ring-2 ring-blue-200'
														: 'border-ui-border-base hover:border-ui-fg-subtle'
												}`}
												onClick={() => toggleImageSelection(image.url)}
											>
												<img
													src={image.url}
													alt={`Image ${imgIndex + 1}`}
													className="w-full h-24 object-cover"
												/>
												{/* Selection Checkbox */}
												<div
													className={`absolute top-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
														isSelected
															? 'bg-blue-500 border-blue-500'
															: 'bg-white/80 border-ui-border-base opacity-0 group-hover:opacity-100'
													}`}
												>
													{isSelected && (
														<Check className="w-3 h-3 text-white" />
													)}
												</div>
												{/* Thumbnail Badge */}
												{isThumbnail && (
													<div className="absolute top-1 left-1 flex items-center gap-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
														<Star className="w-3 h-3 fill-current" />
														<span>Miniatur</span>
													</div>
												)}
											</div>
										);
									})}
								</div>
								{/* Action Bar */}
								{selectedImageUrls.size > 0 && (
									<div className="flex items-center gap-3 p-3 bg-ui-bg-subtle rounded-lg border border-ui-border-base mb-4">
										<Text size="small" className="text-ui-fg-subtle">
											{selectedImageUrls.size} ausgewählt
										</Text>
										<div className="flex-1" />
										<Button
											variant="secondary"
											size="small"
											onClick={setAsVariantThumbnail}
										>
											<Star className="w-4 h-4 mr-2" />
											Als Miniatur
										</Button>
										<Button
											variant="secondary"
											size="small"
											onClick={removeSelectedVariantImages}
											className="text-red-500 hover:text-red-700"
										>
											<Trash2 className="w-4 h-4 mr-2" />
											Entfernen ({selectedImageUrls.size})
										</Button>
									</div>
								)}
								{/* Action Buttons */}
								<div className="flex gap-3">
									<Button
										variant="primary"
										size="small"
										onClick={saveVariantImagesManual}
										className="flex-1"
									>
										Speichern ({selectedImageUrls.size})
									</Button>
									{mergedVariants[selectedVariantIndex]?.images &&
										mergedVariants[selectedVariantIndex].images!.length > 0 && (
											<Button
												variant="secondary"
												size="small"
												onClick={removeAllVariantImages}
												className="text-red-500"
											>
												<Trash2 className="w-4 h-4 mr-2" />
												Alle entfernen
											</Button>
										)}
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

// Helper function to render cell content
function renderCellContent(
	variant: Variant,
	columnKey: string,
	column: any, // Column object with currency metadata
	index: number,
	updateVariant: (index: number, field: keyof Variant, value: any) => void,
	productImages?: Array<{ id?: string; url: string }>,
	onImageClick?: (index: number) => void,
) {
	// Handle all price columns dynamically
	if (columnKey.startsWith('price_')) {
		const currency = column.currency;
		if (!currency) return null;

	return (
		<div className="flex items-center gap-1">
			<Text size="small">{currency.symbol}</Text>
			<Input
				type="text"
				inputMode="decimal"
				value={(variant as any)[columnKey] || 0}
				onChange={e => {
					const value = e.target.value;
					// Allow empty string, numbers, and decimal points while typing
					if (value === '' || /^\d*\.?\d*$/.test(value)) {
						updateVariant(index, columnKey as keyof Variant, value === '' ? 0 : parseFloat(value) || 0);
					}
				}}
				onBlur={e => {
					// Ensure valid number on blur
					const value = parseFloat(e.target.value) || 0;
					updateVariant(index, columnKey as keyof Variant, value);
				}}
				placeholder="0.00"
				size="small"
				className="flex-1"
			/>
		</div>
	);
	}

	// Handle non-price columns
	switch (columnKey) {
		case 'image':
			const variantThumbnail =
				variant.variant_thumbnail || variant.images?.[0]?.url;
			const imageCount = variant.images?.length || 0;
			return (
				<div
					className="flex items-center justify-center cursor-pointer relative"
					onClick={() => onImageClick?.(index)}
				>
					{variantThumbnail ? (
						<div className="relative">
							<img
								src={variantThumbnail}
								alt={variant.title || 'Variant'}
								className="w-12 h-12 object-cover rounded border border-ui-border-base hover:border-ui-fg-interactive transition-colors"
							/>
							{imageCount > 1 && (
								<div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
									{imageCount}
								</div>
							)}
							{variant.variant_thumbnail && (
								<div className="absolute -top-1 -left-1 bg-yellow-500 rounded-full p-0.5">
									<Star className="w-2.5 h-2.5 text-white fill-current" />
								</div>
							)}
						</div>
					) : (
						<div className="w-12 h-12 bg-ui-bg-subtle rounded border border-dashed border-ui-border-base flex items-center justify-center hover:border-ui-fg-interactive transition-colors">
							<Plus className="w-4 h-4 text-ui-fg-muted" />
						</div>
					)}
				</div>
			);
		case 'option_combination':
			return (
				<Text size="small" className="truncate">
					{variant.option_values?.join(' / ') || variant.title}
				</Text>
			);
		case 'title':
			return (
				<Input
					value={variant.title || ''}
					onChange={e => updateVariant(index, 'title', e.target.value)}
					placeholder="Titel"
					size="small"
					className="w-full"
				/>
			);
		case 'sku':
			return (
				<Input
					value={variant.sku || ''}
					onChange={e => updateVariant(index, 'sku', e.target.value)}
					placeholder="SKU"
					size="small"
					className="w-full"
				/>
			);
		case 'manage_inventory':
			return (
				<Checkbox
					checked={variant.manage_inventory || false}
					onCheckedChange={checked =>
						updateVariant(index, 'manage_inventory', checked)
					}
				/>
		);
	case 'allow_backorder':
		return (
			<Checkbox
				checked={variant.allow_backorder || false}
				onCheckedChange={checked =>
					updateVariant(index, 'allow_backorder', checked)
				}
			/>
		);
	default:
		return null;
	}
}

export default ProductVariantsTab;
