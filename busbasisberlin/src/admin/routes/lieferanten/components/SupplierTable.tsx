import { EllipsisHorizontal, PencilSquare, Trash } from '@medusajs/icons';
import { Container, DropdownMenu, IconButton, Table, Text, usePrompt } from '@medusajs/ui';
import type { Supplier } from '../../../../modules/supplier/models/supplier';

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const SupplierTable = ({ suppliers, onEdit, onDelete, isLoading }: SupplierTableProps) => {
  const prompt = usePrompt();

  const handleDelete = async (supplier: Supplier) => {
    const shouldDelete = await prompt({
      title: 'Lieferant löschen',
      description: `Sind Sie sicher, dass Sie den Lieferanten "${supplier.company}" löschen möchten?`,
    });

    if (shouldDelete) {
      onDelete(supplier.id);
    }
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
        <Text className="text-ui-fg-subtle mb-2">Keine Lieferanten gefunden</Text>
        <Text className="text-ui-fg-muted text-sm">Erstellen Sie Ihren ersten Lieferanten</Text>
      </Container>
    );
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Firma</Table.HeaderCell>
          <Table.HeaderCell>Hauptkontakt</Table.HeaderCell>
          <Table.HeaderCell>Kontaktperson</Table.HeaderCell>
          <Table.HeaderCell>Adresse</Table.HeaderCell>
          <Table.HeaderCell>Nummern</Table.HeaderCell>
          <Table.HeaderCell>Bankdaten</Table.HeaderCell>
          <Table.HeaderCell className="w-[32px]"></Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {suppliers.map(supplier => (
          <Table.Row key={supplier.id} className="group">
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

            {/* Main Contact Information */}
            <Table.Cell>
              <div className="flex flex-col gap-y-1">
                {supplier.email && <Text size="small">📧 {supplier.email}</Text>}
                {supplier.phone_mobile && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    📱 {supplier.phone_mobile}
                  </Text>
                )}
                {supplier.phone_direct && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    📞 {supplier.phone_direct}
                  </Text>
                )}
                {supplier.website && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    🌐 {supplier.website}
                  </Text>
                )}
                {!supplier.email && !supplier.phone_mobile && !supplier.phone_direct && (
                  <Text size="small" className="text-ui-fg-muted">
                    -
                  </Text>
                )}
              </div>
            </Table.Cell>

            {/* Additional Contact Person */}
            <Table.Cell>
              <div className="flex flex-col gap-y-1">
                {(supplier.contact_first_name || supplier.contact_last_name) && (
                  <Text size="small">
                    👤 {supplier.contact_salutation ? `${supplier.contact_salutation} ` : ''}
                    {supplier.contact_first_name} {supplier.contact_last_name}
                  </Text>
                )}
                {supplier.contact_department && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    🏢 {supplier.contact_department}
                  </Text>
                )}
                {supplier.contact_email && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    📧 {supplier.contact_email}
                  </Text>
                )}
                {supplier.contact_phone && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    📞 {supplier.contact_phone}
                  </Text>
                )}
                {!supplier.contact_first_name && !supplier.contact_last_name && !supplier.contact_email && (
                  <Text size="small" className="text-ui-fg-muted">
                    -
                  </Text>
                )}
              </div>
            </Table.Cell>

            {/* Address */}
            <Table.Cell>
              <div className="flex flex-col gap-y-1">
                {supplier.street && <Text size="small">📍 {supplier.street}</Text>}
                {(supplier.postal_code || supplier.city) && (
                  <Text size="small" className="text-ui-fg-subtle">
                    {supplier.postal_code} {supplier.city}
                  </Text>
                )}
                {supplier.country && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    🌍 {supplier.country}
                  </Text>
                )}
                {!supplier.street && !supplier.postal_code && !supplier.city && (
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
                {supplier.account_holder && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    👤 {supplier.account_holder}
                  </Text>
                )}
                {!supplier.bank_name && !supplier.iban && !supplier.account_holder && (
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
                  <IconButton size="small" variant="transparent">
                    <EllipsisHorizontal />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item onClick={() => onEdit(supplier)}>
                    <PencilSquare className="text-ui-fg-subtle" />
                    Bearbeiten
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="text-ui-fg-error" onClick={() => handleDelete(supplier)}>
                    <Trash className="text-ui-fg-error" />
                    Löschen
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

export default SupplierTable;
