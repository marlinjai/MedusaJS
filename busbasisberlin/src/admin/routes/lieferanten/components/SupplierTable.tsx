import { Button, Container, Table, Text } from '@medusajs/ui';
import { Edit, Trash2, Eye, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Supplier } from '../../../../modules/supplier/models/supplier';
import { useIsMobile } from '../../../utils/use-mobile';
import { MobileDataCard } from '../../../components/MobileDataCard';

// Type for supplier with details
type SupplierWithDetails = Supplier & {
	contacts: Array<{
		id: string;
		salutation?: string;
		first_name?: string;
		last_name?: string;
		department?: string;
		phones: Array<{ number: string; label?: string }>;
		emails: Array<{ email: string; label?: string }>;
	}>;
	addresses: Array<{
		id: string;
		label?: string;
		street?: string;
		postal_code?: string;
		city?: string;
		country_name?: string;
	}>;
};

type SortConfig = {
	key: string;
	direction: 'asc' | 'desc';
} | null;

interface SupplierTableProps {
	suppliers: SupplierWithDetails[];
	onEdit: (supplier: Supplier) => void;
	onDelete: (id: string) => void;
	isLoading: boolean;
	isFetching?: boolean;
	onSort?: (key: string, direction: 'asc' | 'desc') => void;
	sortConfig?: SortConfig;
	visibleColumns?: Set<string>;
}

// Column configuration
const columns = [
	{ key: 'company', label: 'Firma', width: 250 },
	{ key: 'contacts', label: 'Kontaktinformation', width: 220 },
	{ key: 'addresses', label: 'Adresse', width: 200 },
	{ key: 'numbers', label: 'Nummern', width: 150 },
	{ key: 'bank_info', label: 'Bankdaten', width: 180 },
	{ key: 'actions', label: 'Aktionen', width: 120 },
];

const SupplierTable = ({
	suppliers,
	onEdit,
	onDelete,
	isLoading,
	isFetching,
	onSort,
	sortConfig,
	visibleColumns,
}: SupplierTableProps) => {
	// Load column widths from localStorage or use defaults
	const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(() => {
		const saved = localStorage.getItem('suppliers-column-widths');
		const widths: { [key: string]: number } = {};
		columns.forEach(col => {
			widths[col.key] = col.width;
		});

		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				// Merge saved widths but ensure actions column has minimum 120px
				Object.keys(parsed).forEach(key => {
					if (key === 'actions') {
						widths[key] = Math.max(120, parsed[key]); // Force minimum 120px for actions
					} else {
						widths[key] = parsed[key];
					}
				});
			} catch {}
		}

		return widths;
	});

	// Load column order from localStorage or use default order
	const [columnOrder, setColumnOrder] = useState<string[]>(() => {
		const saved = localStorage.getItem('suppliers-column-order');
		if (saved) {
			try {
				return JSON.parse(saved);
			} catch {
				return columns.map(c => c.key);
			}
		}
		return columns.map(c => c.key);
	});

	// Column drag state
	const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
	const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
	const [isResizing, setIsResizing] = useState<string | null>(null);

	// Persist column widths
	useEffect(() => {
		localStorage.setItem('suppliers-column-widths', JSON.stringify(columnWidths));
	}, [columnWidths]);

	// Persist column order
	useEffect(() => {
		localStorage.setItem('suppliers-column-order', JSON.stringify(columnOrder));
	}, [columnOrder]);

	// Get ordered and filtered columns
	const orderedColumns = columnOrder
		.map(key => columns.find(c => c.key === key))
		.filter((c): c is typeof columns[0] => c !== undefined)
		.filter(c => !visibleColumns || visibleColumns.has(c.key));

	// Column drag handlers
	const handleColumnDragStart = (columnKey: string) => {
		setDraggedColumn(columnKey);
	};

	const handleColumnDragOver = (e: React.DragEvent, columnKey: string) => {
		e.preventDefault();
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

		newOrder.splice(draggedIndex, 1);
		newOrder.splice(targetIndex, 0, draggedColumn);

		setColumnOrder(newOrder);
		setDraggedColumn(null);
		setDragOverColumn(null);
	};

	const handleColumnDragEnd = () => {
		setDraggedColumn(null);
		setDragOverColumn(null);
	};

	// Handle column resize
	const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
		e.preventDefault();
		e.stopPropagation();
		setIsResizing(columnKey);

		const startX = e.clientX;
		const startWidth = columnWidths[columnKey];

		const handleMouseMove = (e: MouseEvent) => {
			const diff = e.clientX - startX;
			const minWidth = 80;
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

	// Render cell content
	const renderCell = (supplier: SupplierWithDetails, columnKey: string) => {
		switch (columnKey) {
			case 'company':
				return (
					<div className="flex flex-col gap-y-1">
						<Text size="small" weight="plus">
							🏢 {supplier.company}
						</Text>
						{supplier.company_addition && (
							<Text size="xsmall" className="text-ui-fg-subtle">
								{supplier.company_addition}
							</Text>
						)}
						{supplier.vat_id && (
							<Text size="xsmall" className="text-ui-fg-muted">
								🆔 USt-ID: {supplier.vat_id}
							</Text>
						)}
						{supplier.internal_key && (
							<Text size="xsmall" className="text-ui-fg-muted">
								🔑 {supplier.internal_key}
							</Text>
						)}
					</div>
				);
			case 'contacts':
				return (
					<div className="flex flex-col gap-y-1">
						{supplier.contacts && supplier.contacts.length > 0 ? (
							(() => {
								const contact = supplier.contacts[0];
								const hasPerson =
									contact.salutation || contact.first_name || contact.last_name;
								return (
									<div>
										{hasPerson && (
											<Text size="small">
												👤 {contact.salutation ? `${contact.salutation} ` : ''}
												{contact.first_name} {contact.last_name}
											</Text>
										)}
										{contact.department && (
											<Text size="xsmall" className="text-ui-fg-subtle">
												🏢 {contact.department}
											</Text>
										)}
										{contact.emails &&
											contact.emails.length > 0 &&
											contact.emails[0].email && (
												<Text size="xsmall" className="text-ui-fg-muted">
													📧 {contact.emails[0].email}
												</Text>
											)}
										{contact.phones &&
											contact.phones.length > 0 &&
											contact.phones[0].number && (
												<Text size="xsmall" className="text-ui-fg-muted">
													📞 {contact.phones[0].number}
												</Text>
											)}
									</div>
								);
							})()
						) : (
							<Text size="small" className="text-ui-fg-muted">
								-
							</Text>
						)}
					</div>
				);
			case 'addresses':
				return (
					<div className="flex flex-col gap-y-1">
						{supplier.addresses && supplier.addresses.length > 0 ? (
							(() => {
								const address = supplier.addresses[0];
								return (
									<div>
										{address.street && (
											<Text size="small">📍 {address.street}</Text>
										)}
										{(address.postal_code || address.city) && (
											<Text size="small" className="text-ui-fg-subtle">
												{address.postal_code} {address.city}
											</Text>
										)}
										{address.country_name && (
											<Text size="xsmall" className="text-ui-fg-muted">
												🌍 {address.country_name}
											</Text>
										)}
									</div>
								);
							})()
						) : (
							<Text size="small" className="text-ui-fg-muted">
								-
							</Text>
						)}
					</div>
				);
			case 'numbers':
				return (
					<div className="flex flex-col gap-y-1">
						{supplier.supplier_number && (
							<Text size="xsmall" className="text-ui-fg-subtle">
								📦 Lief.: {supplier.supplier_number}
							</Text>
						)}
						{supplier.customer_number && (
							<Text size="xsmall" className="text-ui-fg-subtle">
								👤 Kund.: {supplier.customer_number}
							</Text>
						)}
						{!supplier.supplier_number && !supplier.customer_number && (
							<Text size="small" className="text-ui-fg-muted">
								-
							</Text>
						)}
					</div>
				);
			case 'bank_info':
				return (
					<div className="flex flex-col gap-y-1">
						{supplier.bank_name && (
							<Text size="xsmall" className="text-ui-fg-subtle">
								🏦 {supplier.bank_name}
							</Text>
						)}
						{supplier.iban && (
							<Text size="xsmall" className="text-ui-fg-muted">
								💳 {supplier.iban.substring(0, 8)}...
							</Text>
						)}
						{!supplier.bank_name && !supplier.iban && (
							<Text size="small" className="text-ui-fg-muted">
								-
							</Text>
						)}
					</div>
				);
			case 'actions':
				return (
					<div className="flex items-center gap-2">
						<Button
							variant="transparent"
							size="small"
							onClick={(e) => {
								e.stopPropagation();
								onEdit(supplier);
							}}
						>
							<Edit className="w-5 h-5" />
						</Button>
						<Button
							variant="transparent"
							size="small"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(supplier.id);
							}}
						>
							<Trash2 className="w-5 h-5" />
						</Button>
					</div>
				);
			default:
				return null;
		}
	};

	const isMobile = useIsMobile();

	// Render mobile card view
	const renderMobileCards = () => {
		return (
			<div className="space-y-2 p-2">
				{suppliers.map((supplier) => (
					<MobileDataCard
						key={supplier.id}
					recordId={supplier.company}
					actions={[
						{
							icon: <Edit className="w-4 h-4" />,
							onClick: () => onEdit(supplier),
							label: 'Bearbeiten',
						},
						{
							icon: <Trash2 className="w-4 h-4" />,
							onClick: () => {
								if (window.confirm(`Lieferant ${supplier.company} wirklich löschen?`)) {
									onDelete(supplier.id);
								}
							},
							label: 'Löschen',
						},
					]}
						rows={[
							...((!visibleColumns || visibleColumns.has('company')) && supplier.supplier_number
								? [{
										label: "Lieferantennr.",
										value: supplier.supplier_number,
								  }]
								: []),
							...((!visibleColumns || visibleColumns.has('addresses')) && supplier.addresses?.[0]?.city
								? [{
								label: "Ort",
										value: supplier.addresses[0].city,
								  }]
								: []),
							...((!visibleColumns || visibleColumns.has('contacts')) && supplier.contacts?.[0]?.emails?.[0]?.email
								? [{
								label: "E-Mail",
										value: supplier.contacts[0].emails[0].email,
								  }]
								: []),
							...((!visibleColumns || visibleColumns.has('contacts')) && supplier.contacts?.[0]?.phones?.[0]?.number
								? [{
								label: "Telefon",
										value: supplier.contacts[0].phones[0].number,
								  }]
								: []),
							...((!visibleColumns || visibleColumns.has('numbers')) && supplier.vat_id
								? [{
										label: "USt-ID",
										value: supplier.vat_id,
								  }]
								: []),
							...((!visibleColumns || visibleColumns.has('bank_info')) && supplier.bank_name
								? [{
										label: "Bank",
										value: supplier.bank_name,
								  }]
								: []),
						]}
					/>
				))}
			</div>
		);
	};

	if (isLoading) {
		return (
			<Container className="flex items-center justify-center py-16">
				<Text className="text-ui-fg-subtle">Lädt...</Text>
			</Container>
		);
	}

	if (suppliers.length === 0) {
		return (
			<Container className="flex flex-col items-center justify-center py-16 text-center">
				<Text className="text-ui-fg-subtle mb-2">
					Keine Lieferanten gefunden
				</Text>
				<Text className="text-ui-fg-muted text-sm">
					Erstellen Sie Ihren ersten Lieferanten
				</Text>
			</Container>
		);
	}

	if (isMobile) {
		return (
			<div className="flex-1 overflow-auto pb-20">
				{renderMobileCards()}
			</div>
		);
	}

	const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

	return (
		<div className="relative overflow-x-auto">
			<Table
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
								draggable={true}
								onDragStart={() => handleColumnDragStart(column.key)}
								onDragOver={(e) => handleColumnDragOver(e, column.key)}
								onDrop={(e) => handleColumnDrop(e, column.key)}
								onDragEnd={handleColumnDragEnd}
								style={{
									width: `${columnWidths[column.key]}px`,
									maxWidth: `${columnWidths[column.key]}px`,
									minWidth: `${columnWidths[column.key]}px`,
									position: 'relative',
									overflow: 'visible',
									opacity: draggedColumn === column.key ? 0.5 : 1,
									backgroundColor: dragOverColumn === column.key ? 'rgba(59, 130, 246, 0.1)' : undefined,
								}}
								className="select-none cursor-move"
							>
								{column.label}

								{/* Resize handle */}
								{index < orderedColumns.length - 1 && (
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
										title="Spaltenbreite anpassen"
									/>
								)}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{suppliers.map(supplier => (
						<Table.Row
							key={supplier.id}
							className="group cursor-pointer hover:bg-ui-bg-subtle transition-colors"
							onClick={() => onEdit(supplier)}
						>
							{orderedColumns.map(column => (
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
									{renderCell(supplier, column.key)}
								</Table.Cell>
							))}
						</Table.Row>
					))}
				</Table.Body>
			</Table>
		</div>
	);
};

export default SupplierTable;
