import { EllipsisHorizontal, PencilSquare, Trash } from '@medusajs/icons';
import { Container, DropdownMenu, IconButton, Table, Text } from '@medusajs/ui';
import type { Supplier } from '../../../../modules/supplier/models/supplier';

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

interface SupplierTableProps {
	suppliers: SupplierWithDetails[];
	onEdit: (supplier: Supplier) => void;
	onDelete: (id: string) => void;
	isLoading: boolean;
}

// Separate component for each supplier row
const SupplierRow = ({
	supplier,
	onEdit,
	onDelete,
}: {
	supplier: SupplierWithDetails;
	onEdit: (supplier: Supplier) => void;
	onDelete: (id: string) => void;
}) => {
	return (
		<Table.Row
			key={supplier.id}
			className="group cursor-pointer hover:bg-ui-bg-subtle transition-colors"
			onClick={() => onEdit(supplier)}
		>
			{/* Company Information */}
			<Table.Cell>
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
			</Table.Cell>

			{/* Contact Information Details */}
			<Table.Cell>
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
									{/* Show first email */}
									{contact.emails &&
										contact.emails.length > 0 &&
										contact.emails[0].email && (
											<Text size="xsmall" className="text-ui-fg-muted">
												📧 {contact.emails[0].email}{' '}
												{contact.emails[0].label
													? `(${contact.emails[0].label})`
													: ''}
											</Text>
										)}
									{/* Show first phone */}
									{contact.phones &&
										contact.phones.length > 0 &&
										contact.phones[0].number && (
											<Text size="xsmall" className="text-ui-fg-muted">
												📞 {contact.phones[0].number}{' '}
												{contact.phones[0].label
													? `(${contact.phones[0].label})`
													: ''}
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
			</Table.Cell>

			{/* Address */}
			<Table.Cell>
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
			</Table.Cell>

			{/* Numbers */}
			<Table.Cell>
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
			</Table.Cell>

			{/* Bank Information */}
			<Table.Cell>
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
			</Table.Cell>

			{/* Actions */}
			<Table.Cell>
				<DropdownMenu>
					<DropdownMenu.Trigger asChild>
						<IconButton variant="transparent" size="small">
							<EllipsisHorizontal />
						</IconButton>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item onClick={() => onEdit(supplier)}>
							<PencilSquare />
							Bearbeiten
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							onClick={e => {
								e.stopPropagation();
								onDelete(supplier.id);
							}}
							className="text-ui-fg-error"
						>
							<Trash />
							Löschen
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu>
			</Table.Cell>
		</Table.Row>
	);
};

const SupplierTable = ({
	suppliers,
	onEdit,
	onDelete,
	isLoading,
}: SupplierTableProps) => {
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

	return (
		<Table>
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell>Firma</Table.HeaderCell>
					<Table.HeaderCell>Kontaktinformation</Table.HeaderCell>
					<Table.HeaderCell>Adresse</Table.HeaderCell>
					<Table.HeaderCell>Nummern</Table.HeaderCell>
					<Table.HeaderCell>Bankdaten</Table.HeaderCell>
					<Table.HeaderCell className="w-[32px]"></Table.HeaderCell>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{suppliers.map(supplier => (
					<SupplierRow
						key={supplier.id}
						supplier={supplier}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
				))}
			</Table.Body>
		</Table>
	);
};

export default SupplierTable;
