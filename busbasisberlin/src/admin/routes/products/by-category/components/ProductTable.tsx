// busbasisberlin/src/admin/routes/products/by-category/components/ProductTable.tsx
// Product table component with draggable column widths and inline editing

import {
	Badge,
	Button,
	Checkbox,
	Input,
	Select,
	Table,
	Text,
	toast,
} from '@medusajs/ui';
import { Edit, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MobileDataCard } from '../../../../components/MobileDataCard';
import { useIsMobile } from '../../../../utils/use-mobile';
import InlineCollectionSelector from './InlineCollectionSelector';
import InlineTagsEditor from './InlineTagsEditor';

type Product = {
	id: string;
	title: string;
	handle: string;
	status: 'published' | 'draft';
	thumbnail?: string;
	images?: Array<{ id?: string; url: string }>;
	sales_channels?: Array<{ id: string; name: string }>;
	categories?: Array<{ id: string; name: string }>;
	collection?: { id: string; title: string };
	variants?: Array<{ id: string; sku?: string; title?: string }>;
	shipping_profile?: { id: string; name: string; type: string };
	tags?: Array<{ id: string; value: string }>;
};

interface ProductTableProps {
	products: Product[];
	onEdit?: (product: Product) => void;
	onDelete?: (productId: string) => void;
	onUpdate?: (productId: string, updates: Partial<Product>) => Promise<any>;
	isLoading: boolean;
	rowSelection?: Record<string, boolean>;
	onRowSelectionChange?: (selection: Record<string, boolean>) => void;
	visibleColumns?: Set<string>;
}

interface EditableCell {
	productId: string;
	field: string;
}

// Column configuration
const columns = [
	{
		key: 'select',
		label: '',
		width: 50,
	},
	{
		key: 'thumbnail',
		label: 'Bild',
		width: 70,
	},
	{
		key: 'title',
		label: 'Titel',
		width: 300,
	},
	{
		key: 'status',
		label: 'Status',
		width: 120,
	},
	{
		key: 'collection',
		label: 'Sammlung',
		width: 200,
	},
	{
		key: 'shipping_profile',
		label: 'Versandprofil',
		width: 180,
	},
	{
		key: 'sales_channels',
		label: 'Vertriebskanäle',
		width: 200,
	},
	{
		key: 'variants',
		label: 'Artikelnummern',
		width: 250,
	},
	{
		key: 'tags',
		label: 'Tags',
		width: 200,
	},
	{
		key: 'actions',
		label: 'Aktionen',
		width: 100,
	},
];

const STORAGE_KEY = 'products-by-category-column-widths';

const ProductTable = ({
	products,
	onEdit,
	onDelete,
	onUpdate,
	isLoading,
	rowSelection = {},
	onRowSelectionChange,
	visibleColumns,
}: ProductTableProps) => {
	const isMobile = useIsMobile();

	// Keyboard navigation state
	const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
	const tableContainerRef = useRef<HTMLDivElement>(null);

	// Inline editing state
	const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
	const [tempValues, setTempValues] = useState<Record<string, any>>({});
	const editInputRef = useRef<HTMLInputElement>(null);

	// Tags editor modal state
	const [tagsEditorOpen, setTagsEditorOpen] = useState(false);
	const [tagsEditorProduct, setTagsEditorProduct] = useState<Product | null>(
		null,
	);
	const [tagsEditorAnchor, setTagsEditorAnchor] = useState<HTMLElement | null>(
		null,
	);

	// Collection selector modal state
	const [collectionSelectorOpen, setCollectionSelectorOpen] = useState(false);
	const [collectionSelectorProduct, setCollectionSelectorProduct] =
		useState<Product | null>(null);
	const [collectionSelectorAnchor, setCollectionSelectorAnchor] =
		useState<HTMLElement | null>(null);

	// Column reordering state
	const [columnOrder, setColumnOrder] = useState<string[]>(() => {
		const saved = localStorage.getItem('products-table-column-order');
		if (saved) {
			try {
				const savedOrder = JSON.parse(saved);
				// Filter out 'open' if it exists and filter to valid columns
				const filteredOrder = savedOrder.filter((key: string) =>
					key !== 'open' && columns.some(c => c.key === key)
				);
				return filteredOrder.length > 0 ? filteredOrder : columns.map(c => c.key);
			} catch {
				return columns.map(c => c.key);
			}
		}
		return columns.map(c => c.key);
	});

	const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
	const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

	// Persist column order to localStorage
	useEffect(() => {
		localStorage.setItem(
			'products-table-column-order',
			JSON.stringify(columnOrder),
		);
	}, [columnOrder]);

	// Get ordered columns based on saved order, filtered by visibility
	const orderedColumns = columnOrder
		.map(key => columns.find(c => c.key === key))
		.filter((c): c is (typeof columns)[0] => c !== undefined)
		.filter(c => !visibleColumns || visibleColumns.has(c.key));

	// Column drag and drop handlers
	const handleColumnDragStart = (columnKey: string) => {
		// Don't allow reordering of select and actions columns
		if (columnKey === 'select' || columnKey === 'actions') return;
		setDraggedColumn(columnKey);
	};

	const handleColumnDragOver = (e: React.DragEvent, columnKey: string) => {
		e.preventDefault();
		if (columnKey === 'select' || columnKey === 'actions') return;
		setDragOverColumn(columnKey);
	};

	const handleColumnDrop = (e: React.DragEvent, targetColumnKey: string) => {
		e.preventDefault();
		if (!draggedColumn || draggedColumn === targetColumnKey) {
			setDraggedColumn(null);
			setDragOverColumn(null);
			return;
		}

		// Reorder columns
		const newOrder = [...columnOrder];
		const draggedIndex = newOrder.indexOf(draggedColumn);
		const targetIndex = newOrder.indexOf(targetColumnKey);

		if (draggedIndex !== -1 && targetIndex !== -1) {
			newOrder.splice(draggedIndex, 1);
			newOrder.splice(targetIndex, 0, draggedColumn);
			setColumnOrder(newOrder);
		}

		setDraggedColumn(null);
		setDragOverColumn(null);
	};

	const handleColumnDragEnd = () => {
		setDraggedColumn(null);
		setDragOverColumn(null);
	};

	// Load column widths from localStorage or use defaults
	const loadColumnWidths = () => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				// Merge with defaults to ensure all columns exist
				const widths: { [key: string]: number } = {};
				columns.forEach(col => {
					widths[col.key] = parsed[col.key] || col.width;
				});
				return widths;
			} catch (e) {
				// If parsing fails, use defaults
			}
		}
		// Default widths
		const widths: { [key: string]: number } = {};
		columns.forEach(col => {
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

	// Focus on edit input when editing starts
	useEffect(() => {
		if (editingCell && editInputRef.current) {
			editInputRef.current.focus();
			editInputRef.current.select();
		}
	}, [editingCell]);

	// Keyboard navigation handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't handle keys when editing a cell
			if (editingCell) return;

			// Don't handle if user is typing in an input/textarea/select
			const activeElement = document.activeElement;
			if (
				activeElement &&
				(activeElement.tagName === 'INPUT' ||
					activeElement.tagName === 'TEXTAREA' ||
					activeElement.tagName === 'SELECT' ||
					activeElement.isContentEditable ||
					activeElement.closest('[role="dialog"]') || // Don't handle in modals
					activeElement.closest('[role="menu"]')) // Don't handle in dropdowns
			) {
				return;
			}

			// Check if table container is visible and contains the active element
			const isTableVisible = tableContainerRef.current &&
				tableContainerRef.current.offsetParent !== null;

			if (!isTableVisible) return;

			// Allow keyboard navigation when:
			// 1. Table container is focused
			// 2. Active element is inside the table
			// 3. No specific input is focused (body/document is active)
			const isTableFocused = tableContainerRef.current && (
				document.activeElement === tableContainerRef.current ||
				tableContainerRef.current.contains(document.activeElement) ||
				document.activeElement === document.body ||
				document.activeElement === document.documentElement
			);

			if (!isTableFocused) return;

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					e.stopPropagation();
					setFocusedRowIndex(prev => {
						const newIndex = prev === null ? 0 : Math.min(products.length - 1, prev + 1);
						// Scroll into view
						setTimeout(() => {
							const rowElement = tableContainerRef.current?.querySelector(
								`[data-row-index="${newIndex}"]`
							);
							rowElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
						}, 0);
						return newIndex;
					});
					// Focus the table container
					tableContainerRef.current?.focus();
					break;
				case 'ArrowUp':
					e.preventDefault();
					e.stopPropagation();
					setFocusedRowIndex(prev => {
						const newIndex = prev === null ? products.length - 1 : Math.max(0, prev - 1);
						// Scroll into view
						setTimeout(() => {
							const rowElement = tableContainerRef.current?.querySelector(
								`[data-row-index="${newIndex}"]`
							);
							rowElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
						}, 0);
						return newIndex;
					});
					// Focus the table container
					tableContainerRef.current?.focus();
					break;
				case 'Enter':
					if (focusedRowIndex !== null) {
						e.preventDefault();
						e.stopPropagation();
						const product = products[focusedRowIndex];
						if (product && onRowSelectionChange) {
							handleSelectRow(product.id, !rowSelection[product.id]);
						}
					}
					break;
				case ' ':
					if (focusedRowIndex !== null) {
						e.preventDefault();
						e.stopPropagation();
						const product = products[focusedRowIndex];
						if (product && onEdit) {
							onEdit(product);
						}
					}
					break;
			}
		};

		// Add event listener
		window.addEventListener('keydown', handleKeyDown, true); // Use capture phase

		return () => {
			window.removeEventListener('keydown', handleKeyDown, true);
		};
	}, [focusedRowIndex, products, rowSelection, onRowSelectionChange, onEdit, editingCell]);

	// Start editing a cell
	const startEditing = (
		productId: string,
		field: string,
		currentValue: any,
	) => {
		setEditingCell({ productId, field });
		setTempValues({
			...tempValues,
			[`${productId}-${field}`]: currentValue,
		});
	};

	// Save edited value
	const saveEdit = async () => {
		if (!editingCell || !onUpdate) return;

		const key = `${editingCell.productId}-${editingCell.field}`;
		const newValue = tempValues[key];

		// Don't save if value hasn't changed
		const currentValue = products.find(p => p.id === editingCell.productId)?.[
			editingCell.field as keyof Product
		];
		if (newValue === currentValue) {
			setEditingCell(null);
			return;
		}

		try {
			await onUpdate(editingCell.productId, {
				[editingCell.field]: newValue,
			} as Partial<Product>);
			toast.success('Produkt erfolgreich aktualisiert');
			setEditingCell(null);
		} catch (error) {
			toast.error('Fehler beim Aktualisieren des Produkts');
			console.error('Error updating product:', error);
			// Keep editing state on error so user can retry
		}
	};

	// Cancel editing
	const cancelEdit = () => {
		setEditingCell(null);
		setTempValues({});
	};

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

	// Get minimum width for each column type
	const getMinimumWidth = (columnKey: string) => {
		switch (columnKey) {
			case 'status':
				return 80;
			case 'actions':
				return 80;
			case 'title':
				return 150;
			default:
				return 100;
		}
	};

	// Handle row selection
	const handleSelectRow = (productId: string, checked: boolean) => {
		if (!onRowSelectionChange) return;
		const newSelection = { ...rowSelection };
		if (checked) {
			newSelection[productId] = true;
		} else {
			delete newSelection[productId];
		}
		onRowSelectionChange(newSelection);
	};

	// Handle select all
	const handleSelectAll = (checked: boolean) => {
		if (!onRowSelectionChange) return;
		if (checked) {
			const newSelection: Record<string, boolean> = {};
			products.forEach(product => {
				newSelection[product.id] = true;
			});
			onRowSelectionChange(newSelection);
		} else {
			onRowSelectionChange({});
		}
	};

	const allSelected =
		products.length > 0 && products.every(p => rowSelection[p.id]);
	const someSelected = products.some(p => rowSelection[p.id]);

	// Render cell content with inline editing support
	const renderCellContent = (product: Product, columnKey: string) => {
		const isEditing =
			editingCell?.productId === product.id && editingCell?.field === columnKey;
		const key = `${product.id}-${columnKey}`;

		switch (columnKey) {
			case 'select':
				return (
					<div className="flex items-center justify-center">
						<Checkbox
							checked={!!rowSelection[product.id]}
							onCheckedChange={checked =>
								handleSelectRow(product.id, checked as boolean)
							}
							onClick={e => e.stopPropagation()}
						/>
					</div>
				);
			case 'thumbnail':
				const imageUrl = product.thumbnail || product.images?.[0]?.url;
				return (
					<div
						className="flex items-center justify-center cursor-pointer group"
						onClick={() => onEdit && onEdit(product)}
						title={imageUrl ? 'Klicken zum Bearbeiten' : 'Kein Bild'}
					>
						{imageUrl ? (
							<img
								src={imageUrl}
								alt={product.title}
								className="w-12 h-12 object-cover rounded border border-ui-border-base group-hover:border-ui-fg-interactive transition-colors shadow-sm"
							/>
						) : (
							<div className="w-12 h-12 bg-ui-bg-subtle rounded border border-dashed border-ui-border-base flex items-center justify-center group-hover:border-ui-fg-subtle transition-colors">
								<Text size="small" className="text-ui-fg-muted">—</Text>
							</div>
						)}
					</div>
				);
			case 'title':
				if (isEditing && onUpdate) {
					return (
						<Input
							ref={editInputRef}
							value={tempValues[key] || product.title || ''}
							onChange={e =>
								setTempValues({ ...tempValues, [key]: e.target.value })
							}
							onBlur={saveEdit}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									e.preventDefault();
									saveEdit();
								} else if (e.key === 'Escape') {
									cancelEdit();
								}
							}}
							className="text-sm border-none bg-transparent focus:bg-ui-bg-field focus:border-ui-border-base h-7 px-2"
							onClick={e => e.stopPropagation()}
							onMouseDown={e => e.stopPropagation()}
						/>
					);
				}
				return (
					<div
						className="relative group cursor-pointer px-1 py-0.5 rounded h-7 flex items-center w-full"
						onClick={e => {
							e.stopPropagation();
							if (onUpdate) {
								startEditing(product.id, 'title', product.title);
							}
						}}
					>
						<Text
							className="font-medium truncate flex-1 pr-28"
							title={product.title}
							size="small"
						>
							{product.title}
						</Text>
						{onEdit && (
							<Button
								variant="transparent"
								size="small"
								onClick={e => {
									e.stopPropagation();
									onEdit(product);
								}}
								className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-ui-bg-base/80 backdrop-blur-sm border border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-base flex items-center gap-1.5 h-6 px-2 rounded shadow-sm"
								title="Produkt bearbeiten"
							>
								<Edit className="w-3.5 h-3.5" />
								<Text size="small">Bearbeiten</Text>
							</Button>
						)}
					</div>
				);
			case 'status':
				if (isEditing && onUpdate) {
					const currentStatus = tempValues[key] || product.status;
					const isPublished = currentStatus === 'published';
					return (
						<Select
							value={currentStatus}
							onValueChange={async value => {
								setTempValues({ ...tempValues, [key]: value });
								try {
									await onUpdate(product.id, {
										status: value as 'published' | 'draft',
									});
									setEditingCell(null);
								} catch (error) {
									console.error('Error updating status:', error);
								}
							}}
							onOpenChange={open => {
								if (!open && editingCell) {
									setEditingCell(null);
								}
							}}
						>
							<Select.Trigger className="h-auto border-none bg-transparent shadow-none p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto">
								<div
									className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
										isPublished
											? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
											: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
									}`}
								>
									{isPublished ? 'Veröffentlicht' : 'Entwurf'}
								</div>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="published">Veröffentlicht</Select.Item>
								<Select.Item value="draft">Entwurf</Select.Item>
							</Select.Content>
						</Select>
					);
				}
				// Notion-style status pill
				const isPublished = product.status === 'published';
				return (
					<div
						className="cursor-pointer group"
						onClick={e => {
							e.stopPropagation();
							if (onUpdate) {
								startEditing(product.id, 'status', product.status);
							}
						}}
					>
						<div
							className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
								isPublished
									? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
									: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
							} group-hover:opacity-80`}
						>
							{isPublished ? 'Veröffentlicht' : 'Entwurf'}
						</div>
					</div>
				);
			case 'collection':
				// Collection selector - click to open inline selector
				return (
					<div
						className="cursor-pointer hover:bg-ui-bg-subtle px-2 py-1 rounded flex items-center transition-colors"
						onClick={e => {
							e.stopPropagation();
							setCollectionSelectorProduct(product);
							setCollectionSelectorAnchor(e.currentTarget);
							setCollectionSelectorOpen(true);
						}}
					>
						{product.collection ? (
							<Badge size="small" rounded="full">
								{product.collection.title}
							</Badge>
						) : (
							<Text size="small" className="text-ui-fg-subtle">
								+ Sammlung hinzufügen
							</Text>
						)}
					</div>
				);
			case 'shipping_profile':
				// Shipping profile - click to edit in modal
				return (
					<div
						className="cursor-pointer hover:bg-ui-bg-subtle px-1 py-0.5 rounded h-7 flex items-center w-full"
						onClick={() => onEdit && onEdit(product)}
					>
						<Text
							size="small"
							className="truncate"
							title={product.shipping_profile?.name}
						>
							{product.shipping_profile?.name || '-'}
						</Text>
					</div>
				);
			case 'sales_channels':
				// Sales channels editing is complex - use modal for now
				return (
					<div
						className="cursor-pointer hover:bg-ui-bg-subtle px-1 py-0.5 rounded h-7 flex items-center w-full"
						onClick={() => onEdit && onEdit(product)}
					>
						{!product.sales_channels || product.sales_channels.length === 0 ? (
							<Text size="small">-</Text>
						) : (
							<Text size="small" className="truncate">
								{product.sales_channels.map(sc => sc.name).join(', ')}
							</Text>
						)}
					</div>
				);
			case 'variants':
				// Variants are read-only in table - use modal for editing
				if (!product.variants || product.variants.length === 0) {
					return <Text size="small">-</Text>;
				}
				return (
					<Text size="small" className="truncate">
						{product.variants
							.map(v => v.sku)
							.filter(Boolean)
							.join(', ')}
					</Text>
				);
			case 'tags':
				// Tags displayed as badges with click-to-edit via inline editor
				if (!product.tags || product.tags.length === 0) {
					return (
						<Button
							variant="transparent"
							size="small"
							onClick={e => {
								e.stopPropagation();
								setTagsEditorProduct(product);
								setTagsEditorAnchor(e.currentTarget);
								setTagsEditorOpen(true);
							}}
							className="text-ui-fg-subtle hover:text-ui-fg-base"
						>
							<Text size="small">+ Tag hinzufügen</Text>
						</Button>
					);
				}
				return (
					<div
						className="flex flex-wrap gap-1 cursor-pointer hover:opacity-80 transition-opacity"
						onClick={e => {
							e.stopPropagation();
							setTagsEditorProduct(product);
							setTagsEditorAnchor(e.currentTarget);
							setTagsEditorOpen(true);
						}}
					>
						{product.tags.slice(0, 3).map(tag => (
							<Badge key={tag.id} size="small" rounded="full">
								{tag.value}
							</Badge>
						))}
						{product.tags.length > 3 && (
							<Badge size="small" rounded="full">
								+{product.tags.length - 3}
							</Badge>
						)}
					</div>
				);
			case 'actions':
				return (
					<div className="flex items-center gap-2">
						{onEdit && (
							<Button
								variant="transparent"
								size="small"
								onClick={e => {
									e.stopPropagation();
									onEdit(product);
								}}
							>
								<Edit className="w-5 h-5" />
							</Button>
						)}
						{onDelete && (
							<Button
								variant="transparent"
								size="small"
								onClick={e => {
									e.stopPropagation();
									onDelete(product.id);
								}}
							>
								<Trash2 className="w-5 h-5" />
							</Button>
						)}
					</div>
				);
			default:
				return null;
		}
	};

	// Mobile Card View
	const renderMobileCards = () => {
		const toggleSelect = (productId: string) => {
			if (!onRowSelectionChange) return;
			const newSelection = { ...rowSelection };
			if (newSelection[productId]) {
				delete newSelection[productId];
			} else {
				newSelection[productId] = true;
			}
			onRowSelectionChange(newSelection);
		};

		return (
			<div className="space-y-2 p-2">
				{products.map(product => {
					const productImageUrl = product.thumbnail || product.images?.[0]?.url;
					return (
					<MobileDataCard
						key={product.id}
						recordId={product.title}
						imageUrl={productImageUrl}
						rows={[
							{
								label: 'Status',
								value: (
									<Badge
										color={product.status === 'published' ? 'green' : 'grey'}
										size="small"
									>
										{product.status === 'published'
											? 'Veröffentlicht'
											: 'Entwurf'}
									</Badge>
								),
							},
							...((!visibleColumns || visibleColumns.has('collection')) &&
							product.collection
								? [
										{
											label: 'Sammlung',
											value: product.collection.title,
										},
									]
								: []),
							...((!visibleColumns || visibleColumns.has('variants')) &&
							product.variants &&
							product.variants.length > 0
								? [
										{
											label: 'Artikelnummern',
											value:
												product.variants
													.map(v => v.sku)
													.filter(Boolean)
													.join(', ') || '-',
										},
									]
								: []),
							...((!visibleColumns || visibleColumns.has('categories')) &&
							product.categories &&
							product.categories.length > 0
								? [
										{
											label: 'Kategorien',
											value: product.categories.map(c => c.name).join(', '),
										},
									]
								: []),
							...((!visibleColumns || visibleColumns.has('shipping_profile')) &&
							product.shipping_profile
								? [
										{
											label: 'Versandprofil',
											value: product.shipping_profile.name,
										},
									]
								: []),
							...((!visibleColumns || visibleColumns.has('sales_channels')) &&
							product.sales_channels &&
							product.sales_channels.length > 0
								? [
										{
											label: 'Vertriebskanäle',
											value: product.sales_channels
												.map(sc => sc.name)
												.join(', '),
										},
									]
								: []),
							...((!visibleColumns || visibleColumns.has('tags')) &&
							product.tags &&
							product.tags.length > 0
								? [
										{
											label: 'Tags',
											value: product.tags.map(t => t.value).join(', '),
										},
									]
								: []),
						]}
						actions={[
							{
								icon: <Edit className="w-4 h-4" />,
								onClick: () => onEdit?.(product),
								label: 'Bearbeiten',
							},
							{
								icon: <Trash2 className="w-4 h-4" />,
								onClick: () => {
									if (
										window.confirm(
											`Möchten Sie "${product.title}" wirklich löschen?`,
										)
									) {
										onDelete?.(product.id);
									}
								},
								label: 'Löschen',
							},
						]}
						onSelect={
							onRowSelectionChange ? () => toggleSelect(product.id) : undefined
						}
						selected={rowSelection[product.id]}
					/>
				)})}
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Text>Lade Produkte...</Text>
			</div>
		);
	}

	if (products.length === 0) {
		return (
			<div className="flex items-center justify-center h-64">
				<Text>Keine Produkte gefunden</Text>
			</div>
		);
	}

	if (isMobile) {
		return (
			<div className="flex-1 overflow-auto pb-20">{renderMobileCards()}</div>
		);
	}

	return (
		<div
			ref={tableContainerRef}
			className="relative overflow-x-auto outline-none"
			tabIndex={0}
			onClick={(e) => {
				// Focus table container when clicking on it
				if (e.currentTarget === e.target || e.currentTarget.contains(e.target as Node)) {
					tableContainerRef.current?.focus();
					// Set focus to clicked row if clicking on a row
					const rowElement = (e.target as HTMLElement).closest('[data-row-index]');
					if (rowElement) {
						const index = parseInt(rowElement.getAttribute('data-row-index') || '-1');
						if (index >= 0) {
							setFocusedRowIndex(index);
						}
					}
				}
			}}
			onFocus={() => {
				// Set initial focus if none
				if (focusedRowIndex === null && products.length > 0) {
					setFocusedRowIndex(0);
				}
			}}
		>
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
						{orderedColumns.map((column, index) => (
							<Table.HeaderCell
								key={column.key}
								draggable={column.key !== 'select' && column.key !== 'actions'}
								onDragStart={() => handleColumnDragStart(column.key)}
								onDragOver={e => handleColumnDragOver(e, column.key)}
								onDrop={e => handleColumnDrop(e, column.key)}
								onDragEnd={handleColumnDragEnd}
								style={{
									width: `${columnWidths[column.key]}px`,
									maxWidth: `${columnWidths[column.key]}px`,
									minWidth: `${columnWidths[column.key]}px`,
									position: 'relative',
									overflow: 'visible',
									opacity: draggedColumn === column.key ? 0.5 : 1,
									cursor:
										column.key !== 'select' && column.key !== 'actions'
											? 'grab'
											: 'default',
								}}
								className={`select-none ${
									dragOverColumn === column.key
										? 'border-l-2 border-ui-border-interactive'
										: ''
								}`}
							>
								{column.key === 'select' ? (
									<div className="flex items-center justify-center">
										<Checkbox
											checked={allSelected}
											onCheckedChange={handleSelectAll}
											{...(someSelected && !allSelected
												? { indeterminate: true }
												: {})}
										/>
									</div>
								) : (
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
								)}

								{/* Resize handle */}
								{index < columns.length - 1 && (
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
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{products.map((product, index) => {
						const isFocused = focusedRowIndex === index;
						return (
						<Table.Row
							key={product.id}
							data-row-index={index}
							className={isFocused ? 'bg-ui-bg-subtle' : ''}
							onClick={() => setFocusedRowIndex(index)}
						>
							{orderedColumns.map(column => (
								<Table.Cell
									key={column.key}
									style={{
										width: `${columnWidths[column.key]}px`,
										maxWidth: `${columnWidths[column.key]}px`,
										minWidth: `${columnWidths[column.key]}px`,
										overflow: 'visible',
									}}
									className="px-2 py-1"
									onClick={e => {
										// Prevent row click from interfering with cell editing
										if (column.key !== 'actions') {
											e.stopPropagation();
										}
									}}
								>
									{renderCellContent(product, column.key)}
								</Table.Cell>
							))}
						</Table.Row>
					)})}
				</Table.Body>
			</Table>

			{/* Inline Tags Editor Modal */}
			{tagsEditorOpen && tagsEditorProduct && onUpdate && (
				<InlineTagsEditor
					product={tagsEditorProduct}
					onClose={() => {
						setTagsEditorOpen(false);
						setTagsEditorProduct(null);
						setTagsEditorAnchor(null);
					}}
					onUpdate={onUpdate}
					anchorEl={tagsEditorAnchor || undefined}
				/>
			)}

			{/* Inline Collection Selector Modal */}
			{collectionSelectorOpen && collectionSelectorProduct && onUpdate && (
				<InlineCollectionSelector
					product={collectionSelectorProduct}
					onClose={() => {
						setCollectionSelectorOpen(false);
						setCollectionSelectorProduct(null);
						setCollectionSelectorAnchor(null);
					}}
					onUpdate={onUpdate}
					anchorEl={collectionSelectorAnchor || undefined}
				/>
			)}
		</div>
	);
};

export default ProductTable;
