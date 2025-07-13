/**
 * ManualCustomerTable.tsx
 * Table component for displaying manual customers with actions
 */
import { Badge, Button, Table, Text } from '@medusajs/ui';
import { Edit, Trash2 } from 'lucide-react';

type ManualCustomer = {
  id: string;
  customer_number: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  customer_type: string;
  status: string;
  source: string | null;
  total_purchases: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
};

interface ManualCustomerTableProps {
  customers: ManualCustomer[];
  onEdit: (customer: ManualCustomer) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  isFetching?: boolean;
}

const ManualCustomerTable = ({ customers, onEdit, onDelete, isLoading, isFetching }: ManualCustomerTableProps) => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Get display name for customer
  const getDisplayName = (customer: ManualCustomer) => {
    if (customer.company) {
      return customer.company;
    }
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return 'Unbekannt';
  };

  // Get display contact info
  const getContactInfo = (customer: ManualCustomer) => {
    const contacts = [];
    if (customer.email) contacts.push(customer.email);
    if (customer.phone) contacts.push(customer.phone);
    if (customer.mobile) contacts.push(customer.mobile);
    return contacts.join(' • ');
  };

  // Get display address
  const getAddress = (customer: ManualCustomer) => {
    const parts = [];
    if (customer.street) parts.push(customer.street);
    if (customer.postal_code && customer.city) {
      parts.push(`${customer.postal_code} ${customer.city}`);
    } else if (customer.city) {
      parts.push(customer.city);
    }
    return parts.join(', ');
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'orange';
      case 'blocked':
        return 'red';
      default:
        return 'grey';
    }
  };

  // Get type badge variant
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'legacy':
        return 'purple';
      case 'walk-in':
        return 'blue';
      case 'business':
        return 'green';
      default:
        return 'grey';
    }
  };

  // Get type display name
  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'legacy':
        return 'Legacy';
      case 'walk-in':
        return 'Laufkunde';
      case 'business':
        return 'Geschäft';
      default:
        return type;
    }
  };

  if (isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Lade Kunden...</Text>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Keine Kunden gefunden</Text>
      </div>
    );
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Kundennummer</Table.HeaderCell>
          <Table.HeaderCell>Name / Firma</Table.HeaderCell>
          <Table.HeaderCell>Kontakt</Table.HeaderCell>
          <Table.HeaderCell>Adresse</Table.HeaderCell>
          <Table.HeaderCell>Typ</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Käufe</Table.HeaderCell>
          <Table.HeaderCell>Umsatz</Table.HeaderCell>
          <Table.HeaderCell>Erstellt</Table.HeaderCell>
          <Table.HeaderCell>Aktionen</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {customers.map(customer => (
          <Table.Row key={customer.id}>
            <Table.Cell>
              <Text className="font-medium">{customer.customer_number}</Text>
            </Table.Cell>
            <Table.Cell>
              <div>
                <Text className="font-medium">{getDisplayName(customer)}</Text>
                {customer.company && (customer.first_name || customer.last_name) && (
                  <Text className="text-sm text-ui-fg-muted">
                    {customer.first_name} {customer.last_name}
                  </Text>
                )}
              </div>
            </Table.Cell>
            <Table.Cell>
              <Text className="text-sm">{getContactInfo(customer) || '-'}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text className="text-sm">{getAddress(customer) || '-'}</Text>
            </Table.Cell>
            <Table.Cell>
              <Badge size="small" color={getTypeBadgeVariant(customer.customer_type)}>
                {getTypeDisplayName(customer.customer_type)}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Badge size="small" color={getStatusBadgeVariant(customer.status)}>
                {customer.status}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Text className="text-sm">{customer.total_purchases || 0}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text className="text-sm">{formatCurrency(customer.total_spent || 0)}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text className="text-sm">{formatDate(customer.created_at)}</Text>
            </Table.Cell>
            <Table.Cell>
              <div className="flex items-center gap-2">
                <Button variant="transparent" size="small" onClick={() => onEdit(customer)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="transparent"
                  size="small"
                  onClick={() => onDelete(customer.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
};

export default ManualCustomerTable;
