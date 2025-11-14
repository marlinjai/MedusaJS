// busbasisberlin/src/admin/routes/products/by-category/components/ProductVariantsTab.tsx
// Product variants tab with options-based variant generation and draggable columns

import { Button, Checkbox, Input, Table, Text } from '@medusajs/ui';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProductOption, Variant } from './ProductEditorModal';
import ProductOptionsSection from './ProductOptionsSection';
import {
	generateVariantsFromOptions,
} from '../utils/variant-generation';

type ProductFormData = {
	variants?: Variant[];
	has_variants?: boolean;
	options?: ProductOption[];
};

interface ProductVariantsTabProps {
	formData: Partial<ProductFormData>;
	onChange: (data: Partial<ProductFormData>) => void;
}

// Column configuration for variant table
const variantColumns = [
	{ key: 'option_combination', label: 'option(z.B.Farbe) / größe', width: 800 },
	{ key: 'title', label: 'Titel', width: 800 },
	{ key: 'sku', label: 'Artikelnummer', width: 200 },
	{ key: 'manage_inventory', label: 'Verwalteter Bestand', width: 120 },
	{ key: 'allow_backorder', label: 'Rückstand zulassen', width: 120 },
	{ key: 'with_inventory_set', label: 'Mit Inventarset', width: 120 },
	{ key: 'price_eur', label: 'Preis EUR', width: 150 },
	{ key: 'price_europe', label: 'Preis Europe', width: 150 },
];

const STORAGE_KEY = 'product-variants-table-column-widths';

const ProductVariantsTab = ({
	formData,
	onChange,
}: ProductVariantsTabProps) => {
	const hasVariants = formData.has_variants || false;
	const options = formData.options || [];
	const existingVariants = formData.variants || [];

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
			case 'with_inventory_set':
				return 120;
			case 'price_eur':
			case 'price_europe':
				return 100;
			default:
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
		const newVariant: Variant = {
			title: '',
			sku: '',
			manage_inventory: false,
			allow_backorder: false,
			with_inventory_set: false,
			price_eur: 0,
			price_europe: 0,
			enabled: true,
		};
		onChange({
			...formData,
			variants: [...mergedVariants, newVariant],
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
							Dieses Ranking wirkt sich auf die Reihenfolge der Varianten in Ihrem
							Store aus.
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
														onMouseDown={e =>
															handleMouseDown(e, column.key)
														}
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
																actualIndex,
																updateVariant,
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
							Varianten, die nicht aktiviert sind, werden nicht erstellt. Sie können
							nachträglich jederzeit Varianten erstellen und bearbeiten, diese Liste
							passt jedoch zu den Variationen in Ihren Produktoptionen.
						</Text>
					</div>
				</div>
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
												index,
												updateVariant,
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
		</div>
	);
};

// Helper function to render cell content
function renderCellContent(
	variant: Variant,
	columnKey: string,
	index: number,
	updateVariant: (index: number, field: keyof Variant, value: any) => void,
) {
	switch (columnKey) {
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
		case 'with_inventory_set':
			return (
				<Checkbox
					checked={variant.with_inventory_set || false}
					onCheckedChange={checked =>
						updateVariant(index, 'with_inventory_set', checked)
					}
				/>
			);
		case 'price_eur':
			return (
				<div className="flex items-center gap-1">
					<Text size="small">€</Text>
					<Input
						type="number"
						value={variant.price_eur || 0}
						onChange={e =>
							updateVariant(
								index,
								'price_eur',
								parseFloat(e.target.value) || 0,
							)
						}
						placeholder="0.00"
						size="small"
						className="flex-1"
					/>
				</div>
			);
		case 'price_europe':
			return (
				<div className="flex items-center gap-1">
					<Text size="small">€</Text>
					<Input
						type="number"
						value={variant.price_europe || 0}
						onChange={e =>
							updateVariant(
								index,
								'price_europe',
								parseFloat(e.target.value) || 0,
							)
						}
						placeholder="0.00"
						size="small"
						className="flex-1"
					/>
				</div>
			);
		default:
			return null;
	}
}

export default ProductVariantsTab;
