/**
 * ServiceTableAdvanced.tsx
 * Advanced service table with resizable columns, reorderable columns, and inline editing
 * Based on ProductTable.tsx patterns
 */
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

import ColumnVisibilityControl from '../../../components/ColumnVisibilityControl';
import { LandscapePrompt } from '../../../components/LandscapePrompt';
import { MobileDataCard } from '../../../components/MobileDataCard';
import { useIsMobile, useLandscapePrompt } from '../../../utils/use-mobile';

type Service = {
	id: string;
	title: string;
	service_code: string | null;
	description: string | null;
	category: string | null;
	category_level_1: string | null;
	category_level_2: string | null;
	category_level_3: string | null;
	category_level_4: string | null;
	base_price: number | null;
	service_type: string | null;
	status: string;
	is_active: boolean;
	currency_code: string;
};

type ServiceTableProps = {
	services: Service[];
	onEdit?: (service: Service) => void;
	onDelete?: (serviceId: string) => void;
	onUpdate?: (serviceId: string, updates: Partial<Service>) => Promise<void>;
	isLoading: boolean;
	rowSelection?: Record<string, boolean>;
	onRowSelectionChange?: (selection: Record<string, boolean>) => void;
};

// Column configuration
const columns = [
	{ key: 'select', label: '', width: 50, resizable: false, draggable: false },
	{
		key: 'service_code',
		label: 'Code',
		width: 120,
		resizable: true,
		draggable: true,
	},
	{
		key: 'title',
		label: 'Titel',
		width: 300,
		resizable: true,
		draggable: true,
	},
	{
		key: 'category',
		label: 'Kategorie',
		width: 200,
		resizable: true,
		draggable: true,
	},
	{
		key: 'base_price',
		label: 'Preis',
		width: 120,
		resizable: true,
		draggable: true,
	},
	{
		key: 'service_type',
		label: 'Typ',
		width: 120,
		resizable: true,
		draggable: true,
	},
	{
		key: 'status',
		label: 'Status',
		width: 100,
		resizable: true,
		draggable: true,
	},
	{
		key: 'actions',
		label: 'Aktionen',
		width: 100,
		resizable: false,
		draggable: false,
	},
];

const STORAGE_KEY_WIDTHS = 'services-table-column-widths';
const STORAGE_KEY_ORDER = 'services-table-column-order';

export default function ServiceTableAdvanced({
	services,
	onEdit,
	onDelete,
	onUpdate,
	isLoading,
	rowSelection = {},
	onRowSelectionChange,
}: ServiceTableProps) {
	const isMobile = useIsMobile();

	// Column widths state
	const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
		() => {
			const saved = localStorage.getItem(STORAGE_KEY_WIDTHS);
			if (saved) {
				try {
					return JSON.parse(saved);
				} catch {
					return columns.reduce(
						(acc, col) => ({ ...acc, [col.key]: col.width }),
						{},
					);
				}
			}
			return columns.reduce(
				(acc, col) => ({ ...acc, [col.key]: col.width }),
				{},
			);
		},
	);

	// Column order state
	const [columnOrder, setColumnOrder] = useState<string[]>(() => {
		const saved = localStorage.getItem(STORAGE_KEY_ORDER);
		if (saved) {
			try {
				return JSON.parse(saved);
			} catch {
				return columns.map(c => c.key);
			}
		}
		return columns.map(c => c.key);
	});

	// Column resizing state
	const [resizingColumn, setResizingColumn] = useState<string | null>(null);
	const [resizeStartX, setResizeStartX] = useState<number>(0);
	const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);

	// Column drag and drop state
	const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
	const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

	// Inline editing state
	const [editingCell, setEditingCell] = useState<{
		serviceId: string;
		field: string;
	} | null>(null);
	const [tempValue, setTempValue] = useState<string>('');

	// Column visibility state
	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
		const saved = localStorage.getItem('services-table-visible-columns');
		if (saved) {
			try {
				return new Set(JSON.parse(saved));
			} catch {
				return new Set(columns.map(c => c.key));
			}
		}
		return new Set(columns.map(c => c.key));
	});

	// Keyboard navigation state
	const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
	const [selectionAnchorIndex, setSelectionAnchorIndex] = useState<
		number | null
	>(null);
	const [isTableFocused, setIsTableFocused] = useState(false);
	const tableContainerRef = useRef<HTMLDivElement>(null);

	// Get ordered columns filtered by visibility (must be before useLandscapePrompt)
	const orderedColumns = columnOrder
		.map(key => columns.find(c => c.key === key))
		.filter((c): c is (typeof columns)[0] => c !== undefined)
		.filter(c => visibleColumns.has(c.key));

	// Landscape prompt for mobile (7+ columns)
	const { shouldShow, dismiss } = useLandscapePrompt(
		orderedColumns.length,
		'services-table-landscape-prompt',
	);

	// Persist column widths
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(columnWidths));
	}, [columnWidths]);

	// Persist column order
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(columnOrder));
	}, [columnOrder]);

	// Persist column visibility
	useEffect(() => {
		localStorage.setItem(
			'services-table-visible-columns',
			JSON.stringify([...visibleColumns]),
		);
	}, [visibleColumns]);

	// Keyboard navigation handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't handle keys when editing a cell
			if (editingCell) return;

			// Only handle keys when table is focused
			if (!isTableFocused) return;

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					e.stopPropagation();
					setFocusedRowIndex(prev => {
						const newIndex =
							prev === null ? 0 : Math.min(services.length - 1, prev + 1);

						// Handle Shift key for range selection
						if (e.shiftKey && onRowSelectionChange) {
							// Set anchor if not set
							if (selectionAnchorIndex === null) {
								setSelectionAnchorIndex(prev === null ? 0 : prev);
							}

							// Calculate range from anchor to new index
							const anchor =
								selectionAnchorIndex !== null
									? selectionAnchorIndex
									: prev === null
										? 0
										: prev;
							const startIndex = Math.min(anchor, newIndex);
							const endIndex = Math.max(anchor, newIndex);

							// Select all rows in range
							const newSelection = { ...rowSelection };
							for (let i = startIndex; i <= endIndex; i++) {
								if (services[i]) {
									newSelection[services[i].id] = true;
								}
							}
							onRowSelectionChange(newSelection);
						} else {
							// Reset anchor when not using Shift
							setSelectionAnchorIndex(null);
						}

						// Scroll into view
						setTimeout(() => {
							const rowElement = tableContainerRef.current?.querySelector(
								`[data-row-index="${newIndex}"]`,
							);
							rowElement?.scrollIntoView({
								behavior: 'smooth',
								block: 'nearest',
							});
						}, 0);
						return newIndex;
					});
					break;

				case 'ArrowUp':
					e.preventDefault();
					e.stopPropagation();
					setFocusedRowIndex(prev => {
						const newIndex =
							prev === null ? services.length - 1 : Math.max(0, prev - 1);

						// Handle Shift key for range selection
						if (e.shiftKey && onRowSelectionChange) {
							// Set anchor if not set
							if (selectionAnchorIndex === null) {
								setSelectionAnchorIndex(
									prev === null ? services.length - 1 : prev,
								);
							}

							// Calculate range from anchor to new index
							const anchor =
								selectionAnchorIndex !== null
									? selectionAnchorIndex
									: prev === null
										? services.length - 1
										: prev;
							const startIndex = Math.min(anchor, newIndex);
							const endIndex = Math.max(anchor, newIndex);

							// Select all rows in range
							const newSelection = { ...rowSelection };
							for (let i = startIndex; i <= endIndex; i++) {
								if (services[i]) {
									newSelection[services[i].id] = true;
								}
							}
							onRowSelectionChange(newSelection);
						} else {
							// Reset anchor when not using Shift
							setSelectionAnchorIndex(null);
						}

						// Scroll into view
						setTimeout(() => {
							const rowElement = tableContainerRef.current?.querySelector(
								`[data-row-index="${newIndex}"]`,
							);
							rowElement?.scrollIntoView({
								behavior: 'smooth',
								block: 'nearest',
							});
						}, 0);
						return newIndex;
					});
					break;

				case ' ':
					e.preventDefault();
					e.stopPropagation();
					// Toggle selection of focused row
					if (
						focusedRowIndex !== null &&
						services[focusedRowIndex] &&
						onRowSelectionChange
					) {
						const serviceId = services[focusedRowIndex].id;
						const newSelection = { ...rowSelection };
						newSelection[serviceId] = !newSelection[serviceId];
						onRowSelectionChange(newSelection);
					}
					break;

				case 'Escape':
					// Clear focus and selection anchor
					setFocusedRowIndex(null);
					setSelectionAnchorIndex(null);
					setIsTableFocused(false);
					break;
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [
		editingCell,
		isTableFocused,
		focusedRowIndex,
		selectionAnchorIndex,
		services,
		rowSelection,
		onRowSelectionChange,
	]);

	// Column resize handlers
	const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
		e.preventDefault();
		setResizingColumn(columnKey);
		setResizeStartX(e.clientX);
		setResizeStartWidth(columnWidths[columnKey] || 100);
	};

	useEffect(() => {
		if (!resizingColumn) return;

		const handleMouseMove = (e: MouseEvent) => {
			const diff = e.clientX - resizeStartX;
			const newWidth = Math.max(50, resizeStartWidth + diff);
			setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
		};

		const handleMouseUp = () => {
			setResizingColumn(null);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [resizingColumn, resizeStartX, resizeStartWidth]);

	// Column drag and drop handlers
	const handleColumnDragStart = (columnKey: string) => {
		const col = columns.find(c => c.key === columnKey);
		if (!col?.draggable) return;
		setDraggedColumn(columnKey);
	};

	const handleColumnDragOver = (e: React.DragEvent, columnKey: string) => {
		e.preventDefault();
		const col = columns.find(c => c.key === columnKey);
		if (!col?.draggable) return;
		setDragOverColumn(columnKey);
	};

	const handleColumnDrop = (e: React.DragEvent, targetColumnKey: string) => {
		e.preventDefault();
		if (!draggedColumn || draggedColumn === targetColumnKey) {
			setDraggedColumn(null);
			setDragOverColumn(null);
			return;
		}

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

	// Inline editing handlers
	const startEditing = (
		serviceId: string,
		field: string,
		currentValue: any,
	) => {
		setEditingCell({ serviceId, field });
		setTempValue(currentValue?.toString() || '');
	};

	const saveEdit = async () => {
		if (!editingCell || !onUpdate) {
			setEditingCell(null);
			return;
		}

		try {
			const updates: Partial<Service> = {};

			if (editingCell.field === 'title') {
				updates.title = tempValue;
			} else if (editingCell.field === 'base_price') {
				if (tempValue.trim() === '') {
					toast.error('Bitte geben Sie einen Preis ein');
					setEditingCell(null);
					return;
				}
				const price = parseFloat(tempValue.replace(',', '.'));
				if (!isNaN(price) && price >= 0) {
					updates.base_price = Math.round(price * 100);
				} else {
					toast.error('Ungültiger Preis');
					setEditingCell(null);
					return;
				}
			} else if (editingCell.field === 'service_type') {
				updates.service_type = tempValue;
			}

			await onUpdate(editingCell.serviceId, updates);
			toast.success('Service aktualisiert');
		} catch (error: any) {
			// Display the actual error message from backend
			toast.error(error.message || 'Fehler beim Aktualisieren');
		} finally {
			setEditingCell(null);
		}
	};

	const cancelEdit = () => {
		setEditingCell(null);
		setTempValue('');
	};

	// Row selection handlers
	const toggleSelectAll = () => {
		if (!onRowSelectionChange) return;

		if (Object.keys(rowSelection).length === services.length) {
			onRowSelectionChange({});
		} else {
			const allSelected = services.reduce(
				(acc, service) => ({ ...acc, [service.id]: true }),
				{},
			);
			onRowSelectionChange(allSelected);
		}
	};

	const toggleSelectRow = (serviceId: string) => {
		if (!onRowSelectionChange) return;

		const newSelection = { ...rowSelection };
		if (newSelection[serviceId]) {
			delete newSelection[serviceId];
		} else {
			newSelection[serviceId] = true;
		}
		onRowSelectionChange(newSelection);
	};

	// Render mobile card view
	const renderMobileCards = () => {
		const toggleSelect = (serviceId: string) => {
			if (!onRowSelectionChange) return;
			const newSelection = { ...rowSelection };
			if (newSelection[serviceId]) {
				delete newSelection[serviceId];
			} else {
				newSelection[serviceId] = true;
			}
			onRowSelectionChange(newSelection);
		};

		return (
			<div className="space-y-2 p-2">
				{services.map(service => (
					<MobileDataCard
						key={service.id}
						recordId={
							service.service_code || service.id.slice(-6).toUpperCase()
						}
						actions={[
							{
								icon: <Edit className="w-4 h-4" />,
								onClick: () => onEdit?.(service),
								label: 'Bearbeiten',
							},
							{
								icon: <Trash2 className="w-4 h-4" />,
								onClick: () => {
									if (
										window.confirm(
											`Dienstleistung "${service.title}" wirklich löschen?`,
										)
									) {
										onDelete?.(service.id);
									}
								},
								label: 'Löschen',
							},
						]}
						rows={[
							{
								label: 'Titel',
								value: service.title,
							},
							...(service.category
								? [
										{
											label: 'Kategorie',
											value: service.category,
										},
									]
								: []),
							...(service.base_price !== null
								? [
										{
											label: 'Preis',
											value: new Intl.NumberFormat('de-DE', {
												style: 'currency',
												currency: service.currency_code || 'EUR',
											}).format(service.base_price / 100),
										},
									]
								: []),
							...(service.service_type
								? [
										{
											label: 'Typ',
											value: service.service_type,
										},
									]
								: []),
							{
								label: 'Status',
								value: (
									<Badge
										size="small"
										color={service.is_active ? 'green' : 'grey'}
									>
										{service.is_active ? 'Aktiv' : 'Inaktiv'}
									</Badge>
								),
							},
						]}
						onSelect={
							onRowSelectionChange ? () => toggleSelect(service.id) : undefined
						}
						selected={rowSelection[service.id]}
					/>
				))}
			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Text>Lade Dienstleistungen...</Text>
			</div>
		);
	}

	if (services.length === 0) {
		return (
			<div className="flex items-center justify-center h-64">
				<Text>Keine Dienstleistungen gefunden</Text>
			</div>
		);
	}

	if (isMobile) {
		return (
			<div className="flex-1 overflow-auto pb-20">{renderMobileCards()}</div>
		);
	}

	return (
		<>
			{shouldShow && <LandscapePrompt onDismiss={dismiss} />}
			<div className="w-full">
				{/* Column Visibility Toolbar */}
				<div className="flex items-center justify-between gap-2 mb-2">
					<Text size="xsmall" className="text-ui-fg-subtle">
						💡 Tipp: Klicken Sie auf die Tabelle und verwenden Sie ↑↓ + Shift
						für Mehrfachauswahl
					</Text>
					<ColumnVisibilityControl
						columns={columns}
						visibleColumns={visibleColumns}
						onToggle={key => {
							const newVisible = new Set(visibleColumns);
							if (newVisible.has(key)) {
								newVisible.delete(key);
							} else {
								newVisible.add(key);
							}
							setVisibleColumns(newVisible);
						}}
						onShowAll={() =>
							setVisibleColumns(new Set(columns.map(c => c.key)))
						}
						onHideAll={() =>
							setVisibleColumns(new Set(['select', 'title', 'actions']))
						}
					/>
				</div>

				{/* Table */}
				<div
					ref={tableContainerRef}
					className="w-full overflow-x-auto -mx-2 md:mx-0 touch-pan-x focus:outline-none"
					tabIndex={0}
					onFocus={() => setIsTableFocused(true)}
					onBlur={e => {
						// Only blur if focus is moving outside the table container
						if (!e.currentTarget.contains(e.relatedTarget)) {
							setIsTableFocused(false);
							setFocusedRowIndex(null);
							setSelectionAnchorIndex(null);
						}
					}}
				>
					<Table>
						<Table.Header>
							<Table.Row>
								{orderedColumns.map(col => (
									<Table.HeaderCell
										key={col.key}
										style={{ width: columnWidths[col.key] || col.width }}
										draggable={col.draggable}
										onDragStart={() => handleColumnDragStart(col.key)}
										onDragOver={e => handleColumnDragOver(e, col.key)}
										onDrop={e => handleColumnDrop(e, col.key)}
										onDragEnd={() => setDraggedColumn(null)}
										className={`relative px-1 md:px-2 ${col.draggable ? 'cursor-move' : ''} ${
											dragOverColumn === col.key ? 'bg-ui-bg-subtle' : ''
										}`}
									>
										<div className="flex items-center justify-between gap-2">
											{col.key === 'select' ? (
												<Checkbox
													checked={
														services.length > 0 &&
														Object.keys(rowSelection).length === services.length
													}
													onCheckedChange={toggleSelectAll}
												/>
											) : (
												<Text
													size="xsmall"
													weight="plus"
													className="text-xs md:text-sm"
												>
													{col.label}
												</Text>
											)}

											{/* Resize handle */}
											{col.resizable && (
												<div
													className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 group"
													onMouseDown={e => handleResizeStart(e, col.key)}
												>
													<div className="w-full h-full group-hover:bg-blue-500/50" />
												</div>
											)}
										</div>
									</Table.HeaderCell>
								))}
							</Table.Row>
						</Table.Header>

						<Table.Body>
							{isLoading ? (
								<Table.Row>
									{/* @ts-ignore - colSpan is valid but not in type definition */}
									<Table.Cell colSpan={orderedColumns.length}>
										<div className="flex items-center justify-center py-8">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-fg-base"></div>
										</div>
									</Table.Cell>
								</Table.Row>
							) : services.length === 0 ? (
								<Table.Row>
									{/* @ts-ignore - colSpan is valid but not in type definition */}
									<Table.Cell colSpan={orderedColumns.length}>
										<div className="text-center py-8">
											<Text size="small" className="text-ui-fg-muted">
												Keine Services gefunden
											</Text>
										</div>
									</Table.Cell>
								</Table.Row>
							) : (
								services.map((service, index) => (
									<Table.Row
										key={service.id}
										data-row-index={index}
										className={`hover:bg-ui-bg-subtle cursor-pointer ${
											focusedRowIndex === index ? 'bg-ui-bg-subtle-pressed' : ''
										}`}
										onClick={e => {
											// Set focus on row click
											setFocusedRowIndex(index);
											setIsTableFocused(true);

											// Handle selection
											if (
												e.shiftKey &&
												onRowSelectionChange &&
												selectionAnchorIndex !== null
											) {
												// Shift+click range selection
												const startIndex = Math.min(
													selectionAnchorIndex,
													index,
												);
												const endIndex = Math.max(selectionAnchorIndex, index);
												const newSelection = { ...rowSelection };
												for (let i = startIndex; i <= endIndex; i++) {
													if (services[i]) {
														newSelection[services[i].id] = true;
													}
												}
												onRowSelectionChange(newSelection);
											} else {
												// Regular click - set anchor
												setSelectionAnchorIndex(index);
											}
										}}
									>
										{orderedColumns.map(col => {
											if (col.key === 'select') {
												return (
													<Table.Cell
														key={col.key}
														className="px-1 py-1 md:px-2 md:py-2"
													>
														<Checkbox
															checked={rowSelection[service.id] || false}
															onCheckedChange={() =>
																toggleSelectRow(service.id)
															}
														/>
													</Table.Cell>
												);
											}

											if (col.key === 'service_code') {
												return (
													<Table.Cell key={col.key}>
														<Text size="small" className="font-mono">
															{service.service_code || '-'}
														</Text>
													</Table.Cell>
												);
											}

											if (col.key === 'title') {
												return (
													<Table.Cell
														key={col.key}
														onDoubleClick={() =>
															startEditing(service.id, 'title', service.title)
														}
														className="cursor-pointer"
													>
														{editingCell?.serviceId === service.id &&
														editingCell?.field === 'title' ? (
															<Input
																value={tempValue}
																onChange={e => setTempValue(e.target.value)}
																onBlur={saveEdit}
																onKeyDown={e => {
																	if (e.key === 'Enter') saveEdit();
																	if (e.key === 'Escape') cancelEdit();
																}}
																autoFocus
																className="w-full"
															/>
														) : (
															<Text size="small">{service.title}</Text>
														)}
													</Table.Cell>
												);
											}

											if (col.key === 'category') {
												return (
													<Table.Cell
														key={col.key}
														className="px-1 py-1 md:px-2 md:py-2 text-xs md:text-sm"
													>
														<Text size="small" className="text-ui-fg-subtle">
															{service.category_level_2 ||
																service.category ||
																'-'}
														</Text>
													</Table.Cell>
												);
											}

											if (col.key === 'base_price') {
												return (
													<Table.Cell
														key={col.key}
														onDoubleClick={() =>
															startEditing(
																service.id,
																'base_price',
																service.base_price
																	? service.base_price / 100
																	: '',
															)
														}
														className="cursor-pointer"
													>
														{editingCell?.serviceId === service.id &&
														editingCell?.field === 'base_price' ? (
															<Input
																type="number"
																value={tempValue}
																onChange={e => setTempValue(e.target.value)}
																onBlur={saveEdit}
																onKeyDown={e => {
																	if (e.key === 'Enter') saveEdit();
																	if (e.key === 'Escape') cancelEdit();
																}}
																autoFocus
																step="0.01"
																className="w-full"
															/>
														) : (
															<Text size="small">
																{service.base_price
																	? `${(service.base_price / 100).toFixed(2)} ${service.currency_code}`
																	: '-'}
															</Text>
														)}
													</Table.Cell>
												);
											}

											if (col.key === 'service_type') {
												return (
													<Table.Cell
														key={col.key}
														onClick={() => {
															if (
																editingCell?.serviceId !== service.id ||
																editingCell?.field !== 'service_type'
															) {
																startEditing(
																	service.id,
																	'service_type',
																	service.service_type,
																);
															}
														}}
														className="cursor-pointer px-1 py-1 md:px-2 md:py-2 text-xs md:text-sm"
													>
														{editingCell?.serviceId === service.id &&
														editingCell?.field === 'service_type' ? (
															<Select
																value={tempValue}
																onValueChange={value => {
																	setTempValue(value);
																	// Auto-save on selection
																	setEditingCell({
																		serviceId: service.id,
																		field: 'service_type',
																	});
																	setTempValue(value);
																	setTimeout(() => {
																		const updates: Partial<Service> = {
																			service_type: value,
																		};
																		onUpdate?.(service.id, updates)
																			.then(() => {
																				toast.success('Service aktualisiert');
																				setEditingCell(null);
																			})
																			.catch(() => {
																				toast.error(
																					'Fehler beim Aktualisieren',
																				);
																				setEditingCell(null);
																			});
																	}, 0);
																}}
															>
																<Select.Trigger className="w-full">
																	<Select.Value placeholder="Typ wählen" />
																</Select.Trigger>
																<Select.Content>
																	<Select.Item value="Pauschal">
																		Pauschal
																	</Select.Item>
																	<Select.Item value="Stunden">
																		Stunden
																	</Select.Item>
																	<Select.Item value="Material">
																		Material
																	</Select.Item>
																	<Select.Item value="Kombiniert">
																		Kombiniert
																	</Select.Item>
																</Select.Content>
															</Select>
														) : service.service_type ? (
															<Badge size="small">{service.service_type}</Badge>
														) : (
															<Text size="small" className="text-ui-fg-muted">
																-
															</Text>
														)}
													</Table.Cell>
												);
											}

											if (col.key === 'status') {
												return (
													<Table.Cell
														key={col.key}
														className="px-1 py-1 md:px-2 md:py-2 text-xs md:text-sm"
													>
														<Badge
															size="small"
															color={service.is_active ? 'green' : 'grey'}
														>
															{service.is_active ? 'Aktiv' : 'Inaktiv'}
														</Badge>
													</Table.Cell>
												);
											}

											if (col.key === 'actions') {
												return (
													<Table.Cell
														key={col.key}
														className="px-1 py-1 md:px-2 md:py-2"
													>
														<div className="flex items-center gap-2">
															{onEdit && (
																<Button
																	variant="transparent"
																	size="small"
																	onClick={() => onEdit(service)}
																>
																	<Edit className="w-4 h-4 md:w-5 md:h-5" />
																</Button>
															)}
															{onDelete && (
																<Button
																	variant="transparent"
																	size="small"
																	onClick={() => onDelete(service.id)}
																>
																	<Trash2 className="w-4 h-4 md:w-5 md:h-5" />
																</Button>
															)}
														</div>
													</Table.Cell>
												);
											}

											return (
												<Table.Cell
													key={col.key}
													className="px-1 py-1 md:px-2 md:py-2 text-xs md:text-sm"
												>
													-
												</Table.Cell>
											);
										})}
									</Table.Row>
								))
							)}
						</Table.Body>
					</Table>
				</div>
			</div>
		</>
	);
}
