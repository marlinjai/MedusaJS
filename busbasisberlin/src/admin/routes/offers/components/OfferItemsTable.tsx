/**
 * OfferItemsTable.tsx
 * Advanced table component for displaying and managing offer items
 * Features: collapsible rows, drag-and-drop reordering, resizable columns, inline editing
 */
import {
	DndContext,
	DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Select, Text, Textarea } from '@medusajs/ui';
import {
	ChevronDown,
	ChevronRight,
	GripVertical,
	Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Offer Item interface
export type OfferItem = {
	id: string;
	item_type: 'product' | 'service';
	title: string;
	description: string;
	quantity: number;
	unit: string;
	unit_price: number;
	discount_percentage: number;
	tax_rate: number;
	total_price: number;
	product_id?: string;
	service_id?: string;
	sku?: string;
	variant_id?: string;
	variant_title?: string;
	category?: string;
	inventory_quantity?: number;
	display_order?: number;
};

type OfferItemsTableProps = {
	items: OfferItem[];
	onItemsChange: (items: OfferItem[]) => void;
	onItemUpdate: (itemId: string, updates: Partial<OfferItem>) => void;
	onItemRemove: (itemId: string) => void;
	currency?: string;
};

type ColumnWidths = {
	dragHandle: number;
	expand: number;
	title: number;
	quantity: number;
	unit: number;
	price: number;
	discount: number;
	total: number;
	actions: number;
};

// Default column widths (in pixels)
const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
	dragHandle: 40,
	expand: 40,
	title: 200,
	quantity: 100,
	unit: 80,
	price: 120,
	discount: 100,
	total: 120,
	actions: 60,
};

// Common unit options for the unit dropdown
const COMMON_UNITS = ['STK', 'Std', 'Psch', 'Set', 'm', 'kg'];

// Sortable row component
function SortableRow({
	item,
	expanded,
	onToggleExpand,
	onUpdate,
	onRemove,
	currency,
	columnWidths,
}: {
	item: OfferItem;
	expanded: boolean;
	onToggleExpand: () => void;
	onUpdate: (updates: Partial<OfferItem>) => void;
	onRemove: () => void;
	currency: string;
	columnWidths: ColumnWidths;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	// Check if this is a manual item (no product_id or service_id)
	const isManualItem = !item.product_id && !item.service_id;

	// Local state for inline editing
	const [editingField, setEditingField] = useState<string | null>(null);
	const [editValues, setEditValues] = useState({
		title: item.title,
		quantity: item.quantity.toString(),
		unit: item.unit,
		unit_price: (item.unit_price / 100).toFixed(2),
		discount_percentage: item.discount_percentage.toString(),
	});
	const [isCustomUnit, setIsCustomUnit] = useState(
		!COMMON_UNITS.includes(item.unit),
	);

	const handleFieldBlur = (field: keyof typeof editValues) => {
		setEditingField(null);
		const value = editValues[field];

		if (field === 'title') {
			if (value && value.trim()) {
				onUpdate({ title: value.trim() });
			}
		} else if (field === 'quantity') {
			const num = parseInt(value);
			if (!isNaN(num) && num > 0) {
				onUpdate({ quantity: num });
			}
		} else if (field === 'unit') {
			if (value && value.trim()) {
				onUpdate({ unit: value.trim() });
			}
		} else if (field === 'unit_price') {
			const num = parseFloat(value.replace(',', '.'));
			if (!isNaN(num) && num >= 0) {
				onUpdate({ unit_price: Math.round(num * 100) });
			}
		} else if (field === 'discount_percentage') {
			const num = parseFloat(value);
			if (!isNaN(num) && num >= 0 && num <= 100) {
				onUpdate({ discount_percentage: num });
			}
		}
	};

	return (
		<div ref={setNodeRef} style={style} className="border-b border-ui-border-base">
			{/* Main row */}
			<div className="flex items-center hover:bg-ui-bg-subtle">
				{/* Drag handle */}
				<div
					{...attributes}
					{...listeners}
					className="cursor-grab active:cursor-grabbing p-2 hover:bg-ui-bg-subtle-hover"
					style={{ width: columnWidths.dragHandle }}
				>
					<GripVertical className="w-4 h-4 text-ui-fg-muted" />
				</div>

				{/* Expand/collapse */}
				<div
					className="p-2 cursor-pointer"
					onClick={onToggleExpand}
					style={{ width: columnWidths.expand }}
				>
					{expanded ? (
						<ChevronDown className="w-4 h-4" />
					) : (
						<ChevronRight className="w-4 h-4" />
					)}
				</div>

				{/* Title - editable for manual items */}
				<div
					className="p-2 flex-1 overflow-hidden"
					style={{ minWidth: columnWidths.title }}
					onClick={isManualItem ? () => setEditingField('title') : undefined}
				>
					{isManualItem && editingField === 'title' ? (
						<Input
							value={editValues.title}
							onChange={e =>
								setEditValues(prev => ({ ...prev, title: e.target.value }))
							}
							onBlur={() => handleFieldBlur('title')}
							autoFocus
							placeholder="Artikelbezeichnung..."
							className="w-full"
						/>
					) : (
						<>
							<Text
								size="small"
								className={`font-medium truncate ${isManualItem ? 'cursor-pointer hover:bg-ui-bg-subtle p-1 rounded' : ''}`}
							>
								{item.title || (isManualItem ? 'Artikelbezeichnung eingeben...' : '')}
							</Text>
							{item.sku && (
								<Text size="xsmall" className="text-ui-fg-subtle">
									SKU: {item.sku}
								</Text>
							)}
						</>
					)}
				</div>

				{/* Quantity - inline editable */}
				<div
					className="p-2"
					style={{ width: columnWidths.quantity }}
					onClick={() => setEditingField('quantity')}
				>
					{editingField === 'quantity' ? (
						<Input
							type="number"
							value={editValues.quantity}
							onChange={e =>
								setEditValues(prev => ({ ...prev, quantity: e.target.value }))
							}
							onBlur={() => handleFieldBlur('quantity')}
							autoFocus
							min="1"
							className="w-full"
						/>
					) : (
						<Text size="small" className="cursor-pointer hover:bg-ui-bg-subtle p-1 rounded">
							{item.quantity}
						</Text>
					)}
				</div>

				{/* Unit - inline editable */}
				<div
					className="p-2"
					style={{ width: columnWidths.unit }}
					onClick={() => setEditingField('unit')}
				>
					{editingField === 'unit' ? (
						isCustomUnit ? (
							<Input
								value={editValues.unit}
								onChange={e =>
									setEditValues(prev => ({ ...prev, unit: e.target.value }))
								}
								onBlur={() => handleFieldBlur('unit')}
								autoFocus
								placeholder="Einheit..."
								className="w-full"
							/>
						) : (
							<Select
								value={editValues.unit}
								onValueChange={val => {
									if (val === '__custom__') {
										setIsCustomUnit(true);
										setEditValues(prev => ({ ...prev, unit: '' }));
									} else {
										setEditValues(prev => ({ ...prev, unit: val }));
										onUpdate({ unit: val });
										setEditingField(null);
									}
								}}
							>
								<Select.Trigger className="w-full" autoFocus />
								<Select.Content className="z-[100]">
									{COMMON_UNITS.map(u => (
										<Select.Item key={u} value={u}>
											{u}
										</Select.Item>
									))}
									<Select.Item value="__custom__">Andere...</Select.Item>
								</Select.Content>
							</Select>
						)
					) : (
						<Text
							size="small"
							className="cursor-pointer hover:bg-ui-bg-subtle p-1 rounded"
						>
							{item.unit}
						</Text>
					)}
				</div>

				{/* Price - inline editable */}
				<div
					className="p-2"
					style={{ width: columnWidths.price }}
					onClick={() => setEditingField('unit_price')}
				>
					{editingField === 'unit_price' ? (
						<Input
							type="number"
							value={editValues.unit_price}
							onChange={e =>
								setEditValues(prev => ({ ...prev, unit_price: e.target.value }))
							}
							onBlur={() => handleFieldBlur('unit_price')}
							autoFocus
							step="0.01"
							className="w-full"
						/>
					) : (
						<Text size="small" className="cursor-pointer hover:bg-ui-bg-subtle p-1 rounded">
							{(item.unit_price / 100).toFixed(2)} {currency}
						</Text>
					)}
				</div>

				{/* Discount - inline editable */}
				<div
					className="p-2"
					style={{ width: columnWidths.discount }}
					onClick={() => setEditingField('discount_percentage')}
				>
					{editingField === 'discount_percentage' ? (
						<Input
							type="number"
							value={editValues.discount_percentage}
							onChange={e =>
								setEditValues(prev => ({
									...prev,
									discount_percentage: e.target.value,
								}))
							}
							onBlur={() => handleFieldBlur('discount_percentage')}
							autoFocus
							min="0"
							max="100"
							className="w-full"
						/>
					) : (
						<Text size="small" className="cursor-pointer hover:bg-ui-bg-subtle p-1 rounded">
							{item.discount_percentage}%
						</Text>
					)}
				</div>

				{/* Total */}
				<div className="p-2" style={{ width: columnWidths.total }}>
					<Text size="small" weight="plus">
						{(item.total_price / 100).toFixed(2)} {currency}
					</Text>
				</div>

				{/* Actions */}
				<div className="p-2" style={{ width: columnWidths.actions }}>
					<Button
						variant="transparent"
						size="small"
						onClick={onRemove}
						className="hover:text-red-600"
					>
						<Trash2 className="w-4 h-4" />
					</Button>
				</div>
			</div>

			{/* Expanded details */}
			{expanded && (
				<div className="bg-ui-bg-subtle p-4 space-y-3">
					{/* Item type selector for manual items */}
					{isManualItem && (
						<div className="flex items-center gap-4">
							<Text size="small" weight="plus">
								Artikeltyp:
							</Text>
							<div className="flex gap-2">
								<button
									onClick={() => onUpdate({ item_type: 'product' })}
									className={`px-3 py-1 rounded text-sm transition-colors ${
										item.item_type === 'product'
											? 'bg-ui-bg-interactive text-ui-fg-on-color'
											: 'bg-ui-bg-base hover:bg-ui-bg-base-hover border border-ui-border-base'
									}`}
								>
									Produkt
								</button>
								<button
									onClick={() => onUpdate({ item_type: 'service' })}
									className={`px-3 py-1 rounded text-sm transition-colors ${
										item.item_type === 'service'
											? 'bg-ui-bg-interactive text-ui-fg-on-color'
											: 'bg-ui-bg-base hover:bg-ui-bg-base-hover border border-ui-border-base'
									}`}
								>
									Service
								</button>
							</div>
						</div>
					)}

					<div>
						<Text size="small" weight="plus" className="mb-2">
							Beschreibung
						</Text>
						<Textarea
							value={item.description}
							onChange={e => onUpdate({ description: e.target.value })}
							rows={3}
							className="w-full"
						/>
					</div>

					{item.variant_title && (
						<div>
							<Text size="small" className="text-ui-fg-subtle">
								Variante: {item.variant_title}
							</Text>
						</div>
					)}

					{item.category && (
						<div>
							<Text size="small" className="text-ui-fg-subtle">
								Kategorie: {item.category}
							</Text>
						</div>
					)}

					{item.inventory_quantity !== undefined && (
						<div>
							<Text size="small" className="text-ui-fg-subtle">
								Lagerbestand: {item.inventory_quantity}
							</Text>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default function OfferItemsTable({
	items,
	onItemsChange,
	onItemUpdate,
	onItemRemove,
	currency = 'EUR',
}: OfferItemsTableProps) {
	// Drag and drop sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Expanded rows state
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	// Column widths (can be persisted to localStorage)
	const [columnWidths, setColumnWidths] = useState<ColumnWidths>(
		DEFAULT_COLUMN_WIDTHS,
	);

	// Load column widths from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem('offerItemsTable_columnWidths');
		if (stored) {
			try {
				setColumnWidths(JSON.parse(stored));
			} catch (e) {
				console.error('Failed to parse stored column widths', e);
			}
		}
	}, []);

	// Handle drag end
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = items.findIndex(item => item.id === active.id);
			const newIndex = items.findIndex(item => item.id === over.id);

			const reorderedItems = arrayMove(items, oldIndex, newIndex).map(
				(item, index) => ({
					...item,
					display_order: index,
				}),
			);

			onItemsChange(reorderedItems);
		}
	};

	// Toggle row expansion
	const toggleRowExpansion = (itemId: string) => {
		setExpandedRows(prev => {
			const newSet = new Set(prev);
			if (newSet.has(itemId)) {
				newSet.delete(itemId);
			} else {
				newSet.add(itemId);
			}
			return newSet;
		});
	};

	if (items.length === 0) {
		return (
			<div className="text-center py-8 bg-ui-bg-subtle rounded-lg">
				<Text size="small" className="text-ui-fg-muted">
					Keine Artikel vorhanden. Wählen Sie Produkte oder Services aus dem
					Katalog aus.
				</Text>
			</div>
		);
	}

	return (
		<div className="border border-ui-border-base rounded-lg overflow-hidden">
			{/* Table header */}
			<div className="flex items-center bg-ui-bg-subtle border-b border-ui-border-base font-medium">
				<div style={{ width: columnWidths.dragHandle }} className="p-2" />
				<div style={{ width: columnWidths.expand }} className="p-2" />
				<div
					style={{ minWidth: columnWidths.title }}
					className="p-2 flex-1"
				>
					<Text size="xsmall" weight="plus">
						Artikel
					</Text>
				</div>
				<div style={{ width: columnWidths.quantity }} className="p-2">
					<Text size="xsmall" weight="plus">
						Menge
					</Text>
				</div>
				<div style={{ width: columnWidths.unit }} className="p-2">
					<Text size="xsmall" weight="plus">
						Einheit
					</Text>
				</div>
				<div style={{ width: columnWidths.price }} className="p-2">
					<Text size="xsmall" weight="plus">
						Preis
					</Text>
				</div>
				<div style={{ width: columnWidths.discount }} className="p-2">
					<Text size="xsmall" weight="plus">
						Rabatt
					</Text>
				</div>
				<div style={{ width: columnWidths.total }} className="p-2">
					<Text size="xsmall" weight="plus">
						Summe
					</Text>
				</div>
				<div style={{ width: columnWidths.actions }} className="p-2" />
			</div>

			{/* Table body with drag and drop */}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={items.map(item => item.id)}
					strategy={verticalListSortingStrategy}
				>
					{items.map(item => (
						<SortableRow
							key={item.id}
							item={item}
							expanded={expandedRows.has(item.id)}
							onToggleExpand={() => toggleRowExpansion(item.id)}
							onUpdate={updates => onItemUpdate(item.id, updates)}
							onRemove={() => onItemRemove(item.id)}
							currency={currency}
							columnWidths={columnWidths}
						/>
					))}
				</SortableContext>
			</DndContext>
		</div>
	);
}


