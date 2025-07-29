/**
 * product-suppliers.tsx
 * Enhanced Notion-style admin widget for managing product-supplier relationships
 * Features: Hierarchical display, inline editing, multiple entries per supplier
 */
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import {
	ChevronDown,
	ChevronRight,
	EllipsisHorizontal,
	Plus,
	SquareTwoStack,
	Star,
	Trash,
} from '@medusajs/icons';
import {
	Badge,
	Button,
	Checkbox,
	Container,
	DropdownMenu,
	IconButton,
	Input,
	Text,
	Textarea,
	toast,
} from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

// Types
interface ProductSupplier {
	id: string;
	product_id: string;
	supplier_id: string;
	variant_name: string | null;
	variant_description: string | null;
	is_primary: boolean;
	supplier_price: number | null; // Legacy field
	supplier_price_netto: number | null;
	supplier_price_brutto: number | null;
	supplier_vat_rate: number | null;
	supplier_sku: string | null;
	supplier_product_name: string | null;
	supplier_lead_time: number | null;
	supplier_stock: number | null;
	sort_order: number;
	is_favorite: boolean;
	is_active: boolean;
	notes: string | null;
}

interface ProductVariant {
	id: string;
	title: string;
	sku: string;
}

interface GroupedSupplierRelationship {
	supplier: {
		id: string;
		company: string;
		supplier_number: string | null;
		website: string | null;
	};
	relationships: ProductSupplier[];
	totalRelationships: number;
	primaryRelationship?: ProductSupplier;
}

interface EditableCell {
	relationshipId: string;
	field: string;
	value: any;
}

const ProductSuppliersWidget = ({
	data: product,
}: {
	data: { id: string };
}) => {
	const queryClient = useQueryClient();

	// State management
	const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(
		new Set(),
	);
	const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
	const [isAddingSupplier, setIsAddingSupplier] = useState(false);
	const [selectedSupplierId, setSelectedSupplierId] = useState('');
	const [tempValues, setTempValues] = useState<Record<string, any>>({});

	// Refs for inline editing
	const editInputRef = useRef<HTMLInputElement>(null);
	const editTextareaRef = useRef<HTMLTextAreaElement>(null);

	// Fetch product details including variants
	const { data: productData, isLoading: isLoadingProduct } = useQuery({
		queryKey: ['product-details', product?.id],
		queryFn: async () => {
			const res = await fetch(`/admin/products/${product.id}`, {
				credentials: 'include',
			});
			if (!res.ok) throw new Error('Failed to fetch product');
			const { product: productDetails } = await res.json();
			return productDetails;
		},
		enabled: !!product?.id,
	});

	// Fetch grouped suppliers for this product
	const { data: groupedSuppliers = [], isLoading } = useQuery({
		queryKey: ['product-suppliers-grouped', product?.id],
		queryFn: async () => {
			const res = await fetch(
				`/admin/products/${product.id}/suppliers/grouped`,
				{
					credentials: 'include',
				},
			);
			if (!res.ok) throw new Error('Failed to fetch grouped suppliers');
			const { groups } = await res.json();
			return groups as GroupedSupplierRelationship[];
		},
		enabled: !!product?.id,
	});

	// Fetch all suppliers for dropdown
	const { data: allSuppliers = [], isLoading: isLoadingAllSuppliers } =
		useQuery({
			queryKey: ['admin-suppliers'],
			queryFn: async () => {
				const res = await fetch('/admin/suppliers', { credentials: 'include' });
				if (!res.ok) throw new Error('Failed to fetch suppliers');
				const { suppliers } = await res.json();
				return suppliers;
			},
			enabled: isAddingSupplier,
		});

	// Auto-expand suppliers with relationships
	useEffect(() => {
		if (groupedSuppliers.length > 0) {
			const newExpanded = new Set(expandedSuppliers);
			groupedSuppliers.forEach(group => {
				if (group.relationships.length > 0) {
					newExpanded.add(group.supplier.id);
				}
			});
			setExpandedSuppliers(newExpanded);
		}
	}, [groupedSuppliers]);

	// Focus on edit input when editing starts
	useEffect(() => {
		if (editingCell) {
			const input = editInputRef.current || editTextareaRef.current;
			if (input) {
				input.focus();
				if (input instanceof HTMLInputElement) {
					input.select();
				}
			}
		}
	}, [editingCell]);

	// Mutations
	const addSupplierMutation = useMutation({
		mutationFn: async (supplierId: string) => {
			const res = await fetch(`/admin/products/${product.id}/suppliers`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ supplier_id: supplierId }),
			});
			if (!res.ok) throw new Error('Failed to add supplier');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['product-suppliers-grouped', product.id],
			});
			toast.success('Supplier successfully added');
			setIsAddingSupplier(false);
			setSelectedSupplierId('');
		},
		onError: (e: any) => toast.error(e.message),
	});

	const updateRelationshipMutation = useMutation({
		mutationFn: async ({
			relationshipId,
			data,
		}: {
			relationshipId: string;
			data: any;
		}) => {
			const res = await fetch(
				`/admin/products/${product.id}/suppliers/relationships/${relationshipId}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(data),
				},
			);
			if (!res.ok) throw new Error('Failed to update relationship');
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['product-suppliers-grouped', product.id],
			});
			toast.success('Updated successfully');
		},
		onError: (e: any) => toast.error(e.message),
	});

	const deleteRelationshipMutation = useMutation({
		mutationFn: async (relationshipId: string) => {
			const res = await fetch(
				`/admin/products/${product.id}/suppliers/relationships/${relationshipId}`,
				{
					method: 'DELETE',
					credentials: 'include',
				},
			);
			if (!res.ok) throw new Error('Failed to delete relationship');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['product-suppliers-grouped', product.id],
			});
			toast.success('Relationship deleted');
		},
		onError: (e: any) => toast.error(e.message),
	});

	const addVariantMutation = useMutation({
		mutationFn: async (supplierId: string) => {
			console.log('🚀 Adding variant for supplier:', supplierId);
			console.log('🚀 Product ID:', product.id);

			const requestData = {
				supplier_id: supplierId,
				variant_name: 'New Variant',
			};
			console.log('🚀 Request data:', requestData);

			const res = await fetch(`/admin/products/${product.id}/suppliers`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(requestData),
			});

			console.log('🚀 Response status:', res.status);

			if (!res.ok) {
				const errorData = await res.text();
				console.error('🚀 Error response:', errorData);
				throw new Error(`Failed to add variant: ${res.status} - ${errorData}`);
			}

			const data = await res.json();
			console.log('🚀 Success response:', data);
			return data;
		},
		onSuccess: data => {
			console.log('🚀 Variant added successfully:', data);
			queryClient.invalidateQueries({
				queryKey: ['product-suppliers-grouped', product.id],
			});
			toast.success('Variant added successfully');
		},
		onError: (e: any) => {
			console.error('🚀 Add variant error:', e);
			toast.error(e.message);
		},
	});

	// Helper functions
	const toggleSupplierExpansion = (supplierId: string) => {
		const newExpanded = new Set(expandedSuppliers);
		if (newExpanded.has(supplierId)) {
			newExpanded.delete(supplierId);
		} else {
			newExpanded.add(supplierId);
		}
		setExpandedSuppliers(newExpanded);
	};

	const startEditing = (
		relationshipId: string,
		field: string,
		currentValue: any,
	) => {
		setEditingCell({ relationshipId, field, value: currentValue });
		setTempValues({
			...tempValues,
			[`${relationshipId}-${field}`]: currentValue,
		});
	};

	const saveEdit = () => {
		if (!editingCell) return;

		const key = `${editingCell.relationshipId}-${editingCell.field}`;
		const newValue = tempValues[key];

		// Convert values based on field type
		let processedValue = newValue;
		if (
			[
				'supplier_price',
				'supplier_price_netto',
				'supplier_price_brutto',
			].includes(editingCell.field) &&
			newValue
		) {
			processedValue = Math.round(parseFloat(newValue) * 100); // Convert to cents
		} else if (
			[
				'supplier_lead_time',
				'supplier_stock',
				'sort_order',
				'supplier_vat_rate',
			].includes(editingCell.field)
		) {
			processedValue = newValue ? parseFloat(newValue) : null;
		}

		updateRelationshipMutation.mutate({
			relationshipId: editingCell.relationshipId,
			data: { [editingCell.field]: processedValue },
		});

		setEditingCell(null);
	};

	const cancelEdit = () => {
		setEditingCell(null);
		setTempValues({});
	};

	const formatPrice = (price: number | null) => {
		if (!price) return '';
		return (price / 100).toFixed(2);
	};

	const formatVatRate = (vatRate: number | null) => {
		if (!vatRate) return '';
		return `${vatRate}%`;
	};

	const handleDragEnd = (result: any) => {
		if (!result.destination) return;

		const { source, destination } = result;

		// Handle reordering within the same supplier group
		if (source.droppableId === destination.droppableId) {
			const supplierId = source.droppableId;
			const supplierGroup = groupedSuppliers.find(
				g => g.supplier.id === supplierId,
			);

			if (supplierGroup) {
				const relationshipIds = supplierGroup.relationships.map(r => r.id);
				const [removed] = relationshipIds.splice(source.index, 1);
				relationshipIds.splice(destination.index, 0, removed);

				// Update sort order on server
				fetch(`/admin/products/${product.id}/suppliers/${supplierId}/reorder`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ relationshipIds }),
				}).then(() => {
					queryClient.invalidateQueries({
						queryKey: ['product-suppliers-grouped', product.id],
					});
				});
			}
		}
	};

	const renderEditableCell = (
		relationship: ProductSupplier,
		field: string,
		currentValue: any,
	) => {
		const isEditing =
			editingCell?.relationshipId === relationship.id &&
			editingCell?.field === field;
		const key = `${relationship.id}-${field}`;

		if (isEditing) {
			if (field === 'notes' || field === 'variant_description') {
				return (
					<Textarea
						ref={editTextareaRef}
						value={tempValues[key] || ''}
						onChange={e =>
							setTempValues({ ...tempValues, [key]: e.target.value })
						}
						onBlur={saveEdit}
						onKeyDown={e => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								saveEdit();
							} else if (e.key === 'Escape') {
								cancelEdit();
							}
						}}
						className="text-sm min-h-[32px] resize-none"
						placeholder={
							field === 'variant_description'
								? 'Enter description...'
								: 'Enter notes...'
						}
					/>
				);
			} else {
				const inputType = [
					'supplier_price',
					'supplier_price_netto',
					'supplier_price_brutto',
					'supplier_vat_rate',
				].includes(field)
					? 'number'
					: ['supplier_lead_time', 'supplier_stock', 'sort_order'].includes(
								field,
						  )
						? 'number'
						: 'text';
				const step = [
					'supplier_price',
					'supplier_price_netto',
					'supplier_price_brutto',
				].includes(field)
					? '0.01'
					: field === 'supplier_vat_rate'
						? '0.1'
						: undefined;

				return (
					<Input
						ref={editInputRef}
						type={inputType}
						step={step}
						value={tempValues[key] || ''}
						onChange={e =>
							setTempValues({ ...tempValues, [key]: e.target.value })
						}
						onBlur={saveEdit}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								saveEdit();
							} else if (e.key === 'Escape') {
								cancelEdit();
							}
						}}
						className="text-sm border-none bg-transparent focus:bg-ui-bg-field focus:border-ui-border-base"
						placeholder={
							field === 'supplier_vat_rate'
								? '19.0'
								: field === 'supplier_price'
									? '0.00'
									: 'Enter value...'
						}
					/>
				);
			}
		}

		// Display value
		let displayValue = currentValue;
		if (
			field === 'supplier_price' ||
			field === 'supplier_price_netto' ||
			field === 'supplier_price_brutto'
		) {
			displayValue = currentValue ? `€${formatPrice(currentValue)}` : '';
		} else if (field === 'supplier_vat_rate') {
			displayValue = currentValue ? formatVatRate(currentValue) : '';
		} else if (field === 'supplier_lead_time') {
			displayValue = currentValue ? `${currentValue} days` : '';
		} else if (field === 'is_primary') {
			return (
				<Checkbox
					checked={currentValue}
					onCheckedChange={checked => {
						updateRelationshipMutation.mutate({
							relationshipId: relationship.id,
							data: { is_primary: checked },
						});
					}}
				/>
			);
		} else if (field === 'is_favorite') {
			return (
				<IconButton
					variant={currentValue ? 'primary' : 'transparent'}
					onClick={() => {
						updateRelationshipMutation.mutate({
							relationshipId: relationship.id,
							data: { is_favorite: !currentValue },
						});
					}}
				>
					<Star className={currentValue ? 'fill-yellow-400' : ''} />
				</IconButton>
			);
		}

		return (
			<div
				className="cursor-pointer hover:bg-ui-bg-subtle p-1 rounded h-[32px] flex items-center w-full"
				onClick={() => startEditing(relationship.id, field, currentValue)}
			>
				<Text
					size="small"
					className="truncate w-full"
					title={displayValue || '—'}
				>
					{displayValue || '—'}
				</Text>
			</div>
		);
	};

	if (isLoading || isLoadingProduct) {
		return (
			<Container className="p-4">
				<Text className="text-ui-fg-subtle">Loading suppliers...</Text>
			</Container>
		);
	}

	return (
		<Container className="p-4">
			<div className="flex items-center justify-between mb-4">
				<Text className="text-lg font-semibold">Suppliers</Text>
				<Button
					size="small"
					variant="secondary"
					onClick={() => setIsAddingSupplier(!isAddingSupplier)}
				>
					<Plus className="w-4 h-4" />
					{isAddingSupplier ? 'Cancel' : 'Add Supplier'}
				</Button>
			</div>

			{/* Add Supplier Form */}
			{isAddingSupplier && (
				<div className="mb-4 p-4 border border-ui-border-base rounded-md bg-ui-bg-subtle">
					<Text className="text-sm font-medium mb-2">Add new supplier:</Text>
					<div className="flex gap-2">
						<select
							value={selectedSupplierId}
							onChange={e => setSelectedSupplierId(e.target.value)}
							className="flex-1 px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field"
						>
							<option value="">Select supplier</option>
							{isLoadingAllSuppliers ? (
								<option disabled>Loading suppliers...</option>
							) : (
								allSuppliers?.map((supplier: any) => (
									<option key={supplier.id} value={supplier.id}>
										{supplier.company}
									</option>
								))
							)}
						</select>
						<Button
							size="small"
							variant="primary"
							onClick={() => addSupplierMutation.mutate(selectedSupplierId)}
							disabled={!selectedSupplierId || addSupplierMutation.isPending}
							isLoading={addSupplierMutation.isPending}
						>
							Add
						</Button>
					</div>
				</div>
			)}

			{/* Suppliers List */}
			<div className="space-y-2">
				{groupedSuppliers.length === 0 ? (
					<div className="text-center py-8 border-2 border-dashed border-ui-border-base rounded-lg">
						<Text className="text-ui-fg-subtle">
							No suppliers for this product
						</Text>
						<Text className="text-ui-fg-muted text-sm mt-1">
							Add a supplier to get started
						</Text>
					</div>
				) : (
					<DragDropContext onDragEnd={handleDragEnd}>
						{groupedSuppliers.map(group => (
							<div
								key={group.supplier.id}
								className="border border-ui-border-base rounded-lg overflow-hidden"
							>
								{/* Supplier Header */}
								<div
									className="flex items-center justify-between p-3 bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover cursor-pointer"
									onClick={() => toggleSupplierExpansion(group.supplier.id)}
								>
									<div className="flex items-center gap-2">
										<IconButton size="small" variant="transparent">
											{expandedSuppliers.has(group.supplier.id) ? (
												<ChevronDown className="w-4 h-4" />
											) : (
												<ChevronRight className="w-4 h-4" />
											)}
										</IconButton>
										<Text weight="plus" size="small">
											{group.supplier.company}
										</Text>
										<Badge
											size="small"
											className="bg-ui-bg-subtle-pressed text-ui-fg-subtle"
										>
											{group.totalRelationships}{' '}
											{group.totalRelationships === 1 ? 'entry' : 'entries'}
										</Badge>
										{group.primaryRelationship && (
											<Badge size="small" className="bg-blue-100 text-blue-800">
												Primary
											</Badge>
										)}
									</div>
									<Button
										size="small"
										variant="secondary"
										onClick={e => {
											console.log('🚀 Add Variant button clicked!');
											console.log('🚀 Supplier ID:', group.supplier.id);
											e.stopPropagation();
											e.preventDefault();
											addVariantMutation.mutate(group.supplier.id);
										}}
										disabled={addVariantMutation.isPending}
										isLoading={addVariantMutation.isPending}
									>
										<Plus className="w-4 h-4" />
										Add Variant
									</Button>
								</div>

								{/* Supplier Relationships */}
								{expandedSuppliers.has(group.supplier.id) &&
									group.relationships.length > 0 && (
										<div className="bg-ui-bg-base overflow-x-auto">
											<table className="w-full min-w-[1200px] table-fixed">
												<thead>
													<tr className="border-b border-ui-border-base bg-ui-bg-subtle">
														<th className="w-12 p-2 text-xs font-medium text-ui-fg-subtle text-center">
															Drag
														</th>
														<th className="w-32 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															Variant
														</th>
														<th className="w-24 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															Description
														</th>
														<th className="w-20 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															Netto €
														</th>
														<th className="w-20 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															Brutto €
														</th>
														<th className="w-16 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															VAT %
														</th>
														<th className="w-32 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															SKU
														</th>
														<th className="w-20 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															Lead Time
														</th>
														<th className="w-16 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															Stock
														</th>
														<th className="w-16 p-2 text-xs font-medium text-ui-fg-subtle text-center">
															Primary
														</th>
														<th className="w-16 p-2 text-xs font-medium text-ui-fg-subtle text-center">
															Fav
														</th>
														<th className="w-24 p-2 text-xs font-medium text-ui-fg-subtle text-left">
															Notes
														</th>
														<th className="w-16 p-2 text-xs font-medium text-ui-fg-subtle text-center">
															Actions
														</th>
													</tr>
												</thead>
												<Droppable droppableId={group.supplier.id}>
													{(provided: any) => (
														<tbody
															ref={provided.innerRef}
															{...provided.droppableProps}
														>
															{group.relationships.map(
																(relationship, index) => (
																	<Draggable
																		key={relationship.id}
																		draggableId={relationship.id}
																		index={index}
																	>
																		{(provided: any, snapshot: any) => (
																			<tr
																				ref={provided.innerRef}
																				{...provided.draggableProps}
																				className={`border-b border-ui-border-base hover:bg-ui-bg-subtle ${
																					snapshot.isDragging
																						? 'shadow-lg bg-ui-bg-component'
																						: ''
																				}`}
																			>
																				<td className="p-2 text-center">
																					<div
																						{...provided.dragHandleProps}
																						className="cursor-grab p-1 hover:bg-ui-bg-subtle rounded inline-block"
																					>
																						<span className="text-ui-fg-muted text-sm select-none">
																							⋮⋮
																						</span>
																					</div>
																				</td>
																				<td className="p-2">
																					{/* Display product title instead of custom variant_name since they're the same */}
																					<div className="p-1 h-[32px] flex items-center w-full">
																						<Text
																							size="small"
																							className="truncate w-full"
																							title={productData?.title || '—'}
																						>
																							{productData?.title || '—'}
																						</Text>
																					</div>
																				</td>
																				<td className="p-2">
																					{renderEditableCell(
																						relationship,
																						'variant_description',
																						relationship.variant_description,
																					)}
																				</td>
																				<td className="p-2">
																					{renderEditableCell(
																						relationship,
																						'supplier_price_netto',
																						relationship.supplier_price_netto,
																					)}
																				</td>
																				<td className="p-2">
																					{renderEditableCell(
																						relationship,
																						'supplier_price_brutto',
																						relationship.supplier_price_brutto,
																					)}
																				</td>
																				<td className="p-2">
																					{renderEditableCell(
																						relationship,
																						'supplier_vat_rate',
																						relationship.supplier_vat_rate,
																					)}
																				</td>
																				<td className="p-2">
																					{renderEditableCell(
																						relationship,
																						'supplier_sku',
																						relationship.supplier_sku,
																					)}
																				</td>
																				<td className="p-2">
																					{renderEditableCell(
																						relationship,
																						'supplier_lead_time',
																						relationship.supplier_lead_time,
																					)}
																				</td>
																				<td className="p-2">
																					{renderEditableCell(
																						relationship,
																						'supplier_stock',
																						relationship.supplier_stock,
																					)}
																				</td>
																				<td className="p-2 text-center">
																					{renderEditableCell(
																						relationship,
																						'is_primary',
																						relationship.is_primary,
																					)}
																				</td>
																				<td className="p-2 text-center">
																					{renderEditableCell(
																						relationship,
																						'is_favorite',
																						relationship.is_favorite,
																					)}
																				</td>
																				<td className="p-2">
																					{renderEditableCell(
																						relationship,
																						'notes',
																						relationship.notes,
																					)}
																				</td>
																				<td className="p-2 text-center">
																					<DropdownMenu>
																						<DropdownMenu.Trigger asChild>
																							<button className="flex items-center justify-center w-8 h-8 rounded hover:bg-ui-bg-subtle transition-colors">
																								<EllipsisHorizontal className="w-4 h-4 text-ui-fg-muted" />
																							</button>
																						</DropdownMenu.Trigger>
																						<DropdownMenu.Content>
																							<DropdownMenu.Item
																								onClick={() => {
																									// Copy relationship
																									const copyData = {
																										...relationship,
																									};
																									const {
																										id: _,
																										...dataWithoutId
																									} = copyData;
																									const updatedData = {
																										...dataWithoutId,
																										variant_name: `${copyData.variant_name || 'Copy'} - Copy`,
																									};

																									fetch(
																										`/admin/products/${product.id}/suppliers`,
																										{
																											method: 'POST',
																											headers: {
																												'Content-Type':
																													'application/json',
																											},
																											credentials: 'include',
																											body: JSON.stringify(
																												updatedData,
																											),
																										},
																									).then(() => {
																										queryClient.invalidateQueries(
																											{
																												queryKey: [
																													'product-suppliers-grouped',
																													product.id,
																												],
																											},
																										);
																										toast.success(
																											'Relationship copied',
																										);
																									});
																								}}
																							>
																								<SquareTwoStack className="w-4 h-4" />
																								Copy
																							</DropdownMenu.Item>
																							<DropdownMenu.Separator />
																							<DropdownMenu.Item
																								onClick={() =>
																									deleteRelationshipMutation.mutate(
																										relationship.id,
																									)
																								}
																								className="text-red-600"
																							>
																								<Trash className="w-4 h-4" />
																								Delete
																							</DropdownMenu.Item>
																						</DropdownMenu.Content>
																					</DropdownMenu>
																				</td>
																			</tr>
																		)}
																	</Draggable>
																),
															)}
															<tr>
																<td colSpan={13}>{provided.placeholder}</td>
															</tr>
														</tbody>
													)}
												</Droppable>
											</table>
										</div>
									)}
							</div>
						))}
					</DragDropContext>
				)}
			</div>
		</Container>
	);
};

// Widget configuration
export const config = defineWidgetConfig({
	zone: 'product.details.after',
});

export default ProductSuppliersWidget;
