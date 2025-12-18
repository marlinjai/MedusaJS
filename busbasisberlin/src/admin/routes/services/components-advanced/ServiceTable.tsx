/**
 * ServiceTable.tsx
 * Service table component with resizable columns, inline editing, and sorting
 */
import {
	Badge,
	Button,
	Checkbox,
	Input,
	Table,
	Text,
	toast,
} from '@medusajs/ui';
import { Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type Service = {
	id: string;
	title: string;
	service_code: string | null;
	description: string | null;
	category: string | null;
	category_level_2: string | null;
	category_level_3: string | null;
	base_price: number | null;
	service_type: string | null;
	status: string;
	is_active: boolean;
	currency_code: string;
};

type ServiceTableProps = {
	services: Service[];
	onEdit?: (service: Service) => void;
	onUpdate?: (serviceId: string, updates: Partial<Service>) => Promise<void>;
	isLoading: boolean;
	rowSelection?: Record<string, boolean>;
	onRowSelectionChange?: (selection: Record<string, boolean>) => void;
};

// Column configuration
const columns = [
	{ key: 'select', label: '', width: 50 },
	{ key: 'service_code', label: 'Code', width: 120 },
	{ key: 'title', label: 'Titel', width: 300 },
	{ key: 'category', label: 'Kategorie', width: 200 },
	{ key: 'base_price', label: 'Preis', width: 120 },
	{ key: 'service_type', label: 'Typ', width: 120 },
	{ key: 'status', label: 'Status', width: 100 },
	{ key: 'actions', label: 'Aktionen', width: 100 },
];

const STORAGE_KEY = 'services-by-category-column-widths';

export default function ServiceTable({
	services,
	onEdit,
	onUpdate,
	isLoading,
	rowSelection = {},
	onRowSelectionChange,
}: ServiceTableProps) {
	// Column widths state
	const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
		() => {
			const saved = localStorage.getItem(STORAGE_KEY);
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

	// Inline editing state
	const [editingCell, setEditingCell] = useState<{
		serviceId: string;
		field: string;
	} | null>(null);
	const [tempValue, setTempValue] = useState<string>('');

	// Persist column widths
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
	}, [columnWidths]);

	// Handle inline editing
	const startEditing = (serviceId: string, field: string, currentValue: any) => {
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
				const price = parseFloat(tempValue.replace(',', '.'));
				if (!isNaN(price)) {
					updates.base_price = Math.round(price * 100);
				}
			}

			await onUpdate(editingCell.serviceId, updates);
			toast.success('Service aktualisiert');
		} catch (error) {
			toast.error('Fehler beim Aktualisieren');
		} finally {
			setEditingCell(null);
		}
	};

	const cancelEdit = () => {
		setEditingCell(null);
		setTempValue('');
	};

	// Handle row selection
	const toggleSelectAll = () => {
		if (!onRowSelectionChange) return;

		if (Object.keys(rowSelection).length === services.length) {
			onRowSelectionChange({});
		} else {
			const allSelected = services.reduce(
				(acc, service) => ({
					...acc,
					[service.id]: true,
				}),
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

	return (
		<div className="w-full overflow-x-auto">
			<Table>
				<Table.Header>
					<Table.Row>
						{columns.map(col => (
							<Table.HeaderCell
								key={col.key}
								style={{ width: columnWidths[col.key] || col.width }}
							>
								{col.key === 'select' ? (
									<Checkbox
										checked={
											services.length > 0 &&
											Object.keys(rowSelection).length === services.length
										}
										onCheckedChange={toggleSelectAll}
									/>
								) : (
									<Text size="xsmall" weight="plus">
										{col.label}
									</Text>
								)}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{isLoading ? (
						<Table.Row>
							<Table.Cell colSpan={columns.length}>
								<div className="flex items-center justify-center py-8">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ui-fg-base"></div>
								</div>
							</Table.Cell>
						</Table.Row>
					) : services.length === 0 ? (
						<Table.Row>
							<Table.Cell colSpan={columns.length}>
								<div className="text-center py-8">
									<Text size="small" className="text-ui-fg-muted">
										Keine Services gefunden
									</Text>
								</div>
							</Table.Cell>
						</Table.Row>
					) : (
						services.map(service => (
							<Table.Row
								key={service.id}
								className="hover:bg-ui-bg-subtle cursor-pointer"
							>
								{/* Checkbox */}
								<Table.Cell>
									<Checkbox
										checked={rowSelection[service.id] || false}
										onCheckedChange={() => toggleSelectRow(service.id)}
									/>
								</Table.Cell>

								{/* Service Code */}
								<Table.Cell>
									<Text size="small">{service.service_code || '-'}</Text>
								</Table.Cell>

								{/* Title - inline editable */}
								<Table.Cell
									onDoubleClick={() =>
										startEditing(service.id, 'title', service.title)
									}
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
										<Text size="small" className="line-clamp-2">
											{service.title}
										</Text>
									)}
								</Table.Cell>

								{/* Category */}
								<Table.Cell>
									<Text size="small" className="text-ui-fg-subtle">
										{service.category_level_2 || service.category || '-'}
									</Text>
								</Table.Cell>

								{/* Price - inline editable */}
								<Table.Cell
									onDoubleClick={() =>
										startEditing(
											service.id,
											'base_price',
											service.base_price ? service.base_price / 100 : 0,
										)
									}
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

								{/* Service Type */}
								<Table.Cell>
									{service.service_type && (
										<Badge size="small">{service.service_type}</Badge>
									)}
								</Table.Cell>

								{/* Status */}
								<Table.Cell>
									<Badge
										size="small"
										color={service.is_active ? 'green' : 'grey'}
									>
										{service.is_active ? 'Aktiv' : 'Inaktiv'}
									</Badge>
								</Table.Cell>

								{/* Actions */}
								<Table.Cell>
									<div className="flex items-center gap-2">
										{onEdit && (
											<Button
												variant="transparent"
												size="small"
												onClick={() => onEdit(service)}
											>
												<Edit className="w-4 h-4" />
											</Button>
										)}
									</div>
								</Table.Cell>
							</Table.Row>
						))
					)}
				</Table.Body>
			</Table>
		</div>
	);
}


