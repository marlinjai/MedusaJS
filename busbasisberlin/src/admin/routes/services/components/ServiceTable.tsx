import { EllipsisHorizontal, PencilSquare, Trash } from '@medusajs/icons';
import { Container, DropdownMenu, IconButton, Table, Text, usePrompt } from '@medusajs/ui';
import type { Service } from '../../../../modules/service/models/service';

interface ServiceTableProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const ServiceTable = ({ services, onEdit, onDelete, isLoading }: ServiceTableProps) => {
  const prompt = usePrompt();

  const handleDelete = async (service: Service) => {
    const shouldDelete = await prompt({
      title: 'Dienstleistung löschen',
      description: `Sind Sie sicher, dass Sie die Dienstleistung "${service.title}" löschen möchten?`,
    });

    if (shouldDelete) {
      onDelete(service.id);
    }
  };

  // Helper function to format price
  const formatPrice = (price: number | null, currency: string = 'EUR') => {
    if (!price) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  // Helper function to format duration
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} Std`;
    return `${hours} Std ${remainingMinutes} Min`;
  };

  if (isLoading) {
    return (
      <Container className="flex items-center justify-center py-16">
        <Text className="text-ui-fg-subtle">Lädt...</Text>
      </Container>
    );
  }

  if (services.length === 0) {
    return (
      <Container className="flex flex-col items-center justify-center py-16 text-center">
        <Text className="text-ui-fg-subtle mb-2">Keine Dienstleistungen gefunden</Text>
        <Text className="text-ui-fg-muted text-sm">Erstellen Sie Ihre erste Dienstleistung</Text>
      </Container>
    );
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Dienstleistung</Table.HeaderCell>
          <Table.HeaderCell>Kategorie</Table.HeaderCell>
          <Table.HeaderCell>Preis</Table.HeaderCell>
          <Table.HeaderCell>Dauer</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell className="w-[32px]"></Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {services.map(service => (
          <Table.Row
            key={service.id}
            className="group cursor-pointer hover:bg-ui-bg-subtle transition-colors"
            onClick={() => onEdit(service)}
          >
            {/* Service Information */}
            <Table.Cell>
              <div className="flex flex-col gap-y-1">
                <Text size="small" weight="plus">
                  🔧 {service.title}
                </Text>
                {service.short_description && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {service.short_description}
                  </Text>
                )}
                {service.is_featured && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    ⭐ Empfohlen
                  </Text>
                )}
              </div>
            </Table.Cell>

            {/* Category */}
            <Table.Cell>
              <div className="flex flex-col gap-y-1">
                {service.category && <Text size="small">📂 {service.category}</Text>}
                {service.service_type && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    📋 {service.service_type}
                  </Text>
                )}
                {!service.category && !service.service_type && (
                  <Text size="small" className="text-ui-fg-muted">
                    -
                  </Text>
                )}
              </div>
            </Table.Cell>

            {/* Pricing */}
            <Table.Cell>
              <div className="flex flex-col gap-y-1">
                {service.base_price && (
                  <Text size="small">💰 {formatPrice(service.base_price, service.currency_code)}</Text>
                )}
                {service.hourly_rate && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    ⏰ {formatPrice(service.hourly_rate, service.currency_code)}/Std
                  </Text>
                )}
                {!service.base_price && !service.hourly_rate && (
                  <Text size="small" className="text-ui-fg-muted">
                    -
                  </Text>
                )}
              </div>
            </Table.Cell>

            {/* Duration */}
            <Table.Cell>
              <div className="flex flex-col gap-y-1">
                {service.estimated_duration && (
                  <Text size="small">⏱️ {formatDuration(service.estimated_duration)}</Text>
                )}
                {!service.estimated_duration && (
                  <Text size="small" className="text-ui-fg-muted">
                    -
                  </Text>
                )}
              </div>
            </Table.Cell>

            {/* Status */}
            <Table.Cell>
              <div className="flex flex-col gap-y-1">
                <div className="flex items-center gap-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      service.is_active && service.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <Text size="small">{service.is_active && service.status === 'active' ? 'Aktiv' : 'Inaktiv'}</Text>
                </div>
                {service.requires_vehicle && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    🚌 Fahrzeug erforderlich
                  </Text>
                )}
                {service.requires_diagnosis && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    🔍 Diagnose erforderlich
                  </Text>
                )}
                {service.requires_approval && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    ✅ Genehmigung erforderlich
                  </Text>
                )}
              </div>
            </Table.Cell>

            {/* Actions */}
            <Table.Cell>
              <div onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <IconButton variant="transparent" size="small">
                      <EllipsisHorizontal />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item onClick={() => onEdit(service)}>
                      <PencilSquare />
                      Bearbeiten
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item variant="danger" onClick={() => handleDelete(service)}>
                      <Trash />
                      Löschen
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

export default ServiceTable;
