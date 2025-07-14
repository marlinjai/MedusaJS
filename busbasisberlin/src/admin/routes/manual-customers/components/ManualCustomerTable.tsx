/**
 * ManualCustomerTable.tsx
 * Enhanced table component with sorting, filtering, and column resizing
 */
import { Badge, Button, Input, Select, Table, Text } from '@medusajs/ui';
import { ArrowDown, ArrowUp, Edit, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

type ColumnFilter = {
  [key: string]: string;
};

interface ManualCustomerTableProps {
  customers: ManualCustomer[];
  onEdit: (customer: ManualCustomer) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  isFetching?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: ColumnFilter) => void;
  sortConfig?: SortConfig;
  filters?: ColumnFilter;
}

// Column configuration
const columns = [
  { key: 'customer_number', label: 'Kundennummer', width: 90, sortable: true, filterable: true },
  { key: 'name', label: 'Name / Firma', width: 200, sortable: true, filterable: true },
  { key: 'contact', label: 'Kontakt', width: 180, sortable: false, filterable: true },
  { key: 'address', label: 'Adresse', width: 200, sortable: false, filterable: true },
  { key: 'customer_type', label: 'Typ', width: 100, sortable: false, filterable: false, noMenu: true },
  { key: 'status', label: 'Status', width: 100, sortable: false, filterable: false, noMenu: true },
  { key: 'total_purchases', label: 'Käufe', width: 80, sortable: true, filterable: false },
  { key: 'total_spent', label: 'Umsatz', width: 100, sortable: true, filterable: false },
  { key: 'created_at', label: 'Erstellt', width: 120, sortable: true, filterable: false },
  { key: 'actions', label: 'Aktionen', width: 100, sortable: false, filterable: false, noMenu: true },
];

const ManualCustomerTable = ({
  customers,
  onEdit,
  onDelete,
  isLoading,
  isFetching,
  onSort,
  onFilter,
  sortConfig,
  filters = {},
}: ManualCustomerTableProps) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(() => {
    const widths: { [key: string]: number } = {};
    columns.forEach(col => {
      widths[col.key] = col.width;
    });
    return widths;
  });

  const [activeFilters, setActiveFilters] = useState<ColumnFilter>(filters);
  const [openColumnMenu, setOpenColumnMenu] = useState<string | null>(null); // Track which column menu is open
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [filterInputs, setFilterInputs] = useState<{ [key: string]: string }>({}); // Local filter inputs
  const tableRef = useRef<HTMLTableElement>(null);

  // Calculate total table width (sum of all column widths)
  const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

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

  // Handle sort
  const handleSort = (key: string, direction?: 'asc' | 'desc') => {
    if (!onSort) return;

    let sortDirection: 'asc' | 'desc' = direction || 'asc';
    if (!direction) {
      // Toggle logic if no direction specified
      if (sortConfig?.key === key && sortConfig.direction === 'asc') {
        sortDirection = 'desc';
      }
    }

    onSort(key, sortDirection);
    setOpenColumnMenu(null); // Close menu after action
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: value };
    if (!value) {
      delete newFilters[key];
    }
    setActiveFilters(newFilters);
    if (onFilter) {
      onFilter(newFilters);
    }
  };

  // Apply filter from menu
  const applyFilter = (columnKey: string) => {
    const value = filterInputs[columnKey] || '';
    const actualValue = value === 'all' ? '' : value;
    handleFilterChange(columnKey, actualValue);
    setOpenColumnMenu(null); // Close menu after action
  };

  // Clear sort
  const clearSort = () => {
    if (onSort && sortConfig) {
      // Reset sort by calling with a neutral state - we'll handle this in the parent
      onSort('', 'asc'); // Empty key means clear sort
    }
    setOpenColumnMenu(null);
  };

  // Clear filter
  const clearFilter = (columnKey: string) => {
    handleFilterChange(columnKey, '');
    setFilterInputs(prev => ({ ...prev, [columnKey]: 'all' }));
    setOpenColumnMenu(null);
  };

  // Handle column resize
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent other elements from capturing the event

    // Close any open column menus when starting to resize
    setOpenColumnMenu(null);
    setIsResizing(columnKey);

    const startX = e.clientX;
    const startWidth = columnWidths[columnKey];

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      // Set minimum width based on column type
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

  // Get minimum width for each column type - ultra-narrow like Notion
  const getMinimumWidth = (columnKey: string) => {
    switch (columnKey) {
      case 'customer_number':
        return 30; // Ultra-narrow for just the number
      case 'customer_type':
      case 'status':
        return 40; // Very narrow for badges
      case 'total_purchases':
        return 35; // Very narrow for numbers
      case 'total_spent':
        return 45; // Narrow for currency
      case 'created_at':
        return 45; // Narrow for date
      case 'actions':
        return 60; // Minimum for action buttons
      default:
        return 30; // Ultra-narrow default for text columns
    }
  };

  // Toggle column menu
  const toggleColumnMenu = (columnKey: string) => {
    console.log('toggleColumnMenu', columnKey);
    setOpenColumnMenu(openColumnMenu === columnKey ? null : columnKey);
    // Initialize filter input with current filter value
    if (!filterInputs[columnKey]) {
      setFilterInputs(prev => ({ ...prev, [columnKey]: activeFilters[columnKey] || 'all' }));
    }
  };

  // Get filter options for select columns
  const getFilterOptions = (columnKey: string) => {
    switch (columnKey) {
      case 'customer_type':
        return [
          { value: 'legacy', label: 'Legacy' },
          { value: 'walk-in', label: 'Laufkunde' },
          { value: 'business', label: 'Geschäft' },
        ];
      case 'status':
        return [
          { value: 'active', label: 'Aktiv' },
          { value: 'inactive', label: 'Inaktiv' },
          { value: 'blocked', label: 'Blockiert' },
        ];
      default:
        return [];
    }
  };

  // Close menu when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.column-menu') && !target.closest('.column-header')) {
      setOpenColumnMenu(null);
    }
  };

  // Add click outside listener
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render cell content
  const renderCellContent = (customer: ManualCustomer, columnKey: string) => {
    switch (columnKey) {
      case 'customer_number':
        return (
          <Text className="font-medium text-center truncate" title={`Customer #${customer.customer_number}`}>
            {customer.customer_number}
          </Text>
        );
      case 'name':
        return (
          <div className="min-w-0">
            <Text className="font-medium truncate" title={getDisplayName(customer)}>
              {getDisplayName(customer)}
            </Text>
            {customer.company && (customer.first_name || customer.last_name) && (
              <Text
                className="text-sm text-ui-fg-muted truncate"
                title={`${customer.first_name} ${customer.last_name}`}
              >
                {customer.first_name} {customer.last_name}
              </Text>
            )}
          </div>
        );
      case 'contact':
        const contactInfo = getContactInfo(customer) || '-';
        return (
          <Text className="text-sm truncate" title={contactInfo}>
            {contactInfo}
          </Text>
        );
      case 'address':
        const addressInfo = getAddress(customer) || '-';
        return (
          <Text className="text-sm truncate" title={addressInfo}>
            {addressInfo}
          </Text>
        );
      case 'customer_type':
        return (
          <Badge size="small" color={getTypeBadgeVariant(customer.customer_type)}>
            {getTypeDisplayName(customer.customer_type)}
          </Badge>
        );
      case 'status':
        return (
          <Badge size="small" color={getStatusBadgeVariant(customer.status)}>
            {customer.status}
          </Badge>
        );
      case 'total_purchases':
        return <Text className="text-sm">{customer.total_purchases || 0}</Text>;
      case 'total_spent':
        return <Text className="text-sm">{formatCurrency(customer.total_spent || 0)}</Text>;
      case 'created_at':
        return <Text className="text-sm">{formatDate(customer.created_at)}</Text>;
      case 'actions':
        return (
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
        );
      default:
        return null;
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
    <div className="relative overflow-x-auto">
      <Table
        ref={tableRef}
        style={{ width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px`, tableLayout: 'fixed' }}
      >
        <Table.Header>
          <Table.Row>
            {columns.map((column, index) => (
              <Table.HeaderCell
                key={column.key}
                style={{
                  width: `${columnWidths[column.key]}px`,
                  maxWidth: `${columnWidths[column.key]}px`,
                  minWidth: `${columnWidths[column.key]}px`,
                  position: 'relative',
                  overflow: 'visible',
                }}
                className="select-none"
              >
                {/* Clickable header for column menu */}
                <div
                  className={`column-header flex items-center rounded px-2 py-1 -mx-2 -my-1 ${
                    column.noMenu ? '' : 'cursor-pointer hover:bg-ui-bg-subtle'
                  }`}
                  onClick={e => {
                    if (column.noMenu) return;
                    e.stopPropagation();
                    toggleColumnMenu(column.key);
                    console.log('clicked');
                  }}
                  style={{ minWidth: '0px' }}
                >
                  {/* Text content with Notion-style truncation */}
                  <div className="flex items-center line-height-120 min-w-0 text-sm" style={{ flex: '1 1 auto' }}>
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

                  {/* Indicators container */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Sort indicator */}
                    {sortConfig?.key === column.key && (
                      <div className="flex-shrink-0">
                        {sortConfig.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-blue-600" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-blue-600" />
                        )}
                      </div>
                    )}

                    {/* Filter indicator */}
                    {activeFilters[column.key] && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" title="Filtered" />
                    )}
                  </div>
                </div>

                {/* Column Menu Dropdown */}
                {openColumnMenu === column.key && !column.noMenu && (
                  <div className="column-menu absolute top-full left-0 z-40 mt-1 bg-ui-bg-base border border-ui-border-base rounded-md shadow-lg min-w-[200px] py-1">
                    {/* Sort options */}
                    {column.sortable && (
                      <>
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-ui-bg-subtle flex items-center gap-2 text-ui-fg-base"
                          onClick={e => {
                            e.stopPropagation();
                            handleSort(column.key, 'asc');
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                          <span>Sort Ascending</span>
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-ui-bg-subtle flex items-center gap-2 text-ui-fg-base"
                          onClick={e => {
                            e.stopPropagation();
                            handleSort(column.key, 'desc');
                          }}
                        >
                          <ArrowDown className="h-4 w-4" />
                          <span>Sort Descending</span>
                        </button>

                        {sortConfig?.key === column.key && (
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-ui-bg-subtle flex items-center gap-2 text-ui-fg-muted"
                            onClick={e => {
                              e.stopPropagation();
                              clearSort();
                            }}
                          >
                            <X className="h-4 w-4" />
                            <span>Clear Sort</span>
                          </button>
                        )}

                        {column.filterable && <div className="border-t border-ui-border-base my-1" />}
                      </>
                    )}

                    {/* Filter options */}
                    {column.filterable && (
                      <>
                        <div className="px-3 py-2">
                          <Text className="text-sm font-medium mb-2 text-ui-fg-base">Filter</Text>

                          {getFilterOptions(column.key).length > 0 ? (
                            <Select
                              value={filterInputs[column.key] || activeFilters[column.key] || 'all'}
                              onValueChange={value => {
                                const actualValue = value === 'all' ? '' : value;
                                setFilterInputs(prev => ({ ...prev, [column.key]: actualValue }));
                                handleFilterChange(column.key, actualValue);
                                setOpenColumnMenu(null);
                              }}
                            >
                              <Select.Trigger className="w-full">
                                <Select.Value placeholder="Select option" />
                              </Select.Trigger>
                              <Select.Content>
                                <Select.Item value="all">All</Select.Item>
                                {getFilterOptions(column.key).map(option => (
                                  <Select.Item key={option.value} value={option.value}>
                                    {option.label}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Filter value..."
                                value={filterInputs[column.key] || ''}
                                onChange={e => setFilterInputs(prev => ({ ...prev, [column.key]: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    applyFilter(column.key);
                                  }
                                }}
                                className="flex-1"
                                size="small"
                              />
                              <Button
                                size="small"
                                onClick={e => {
                                  e.stopPropagation();
                                  applyFilter(column.key);
                                }}
                                className="px-2"
                              >
                                Apply
                              </Button>
                            </div>
                          )}
                        </div>

                        {activeFilters[column.key] && (
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-ui-bg-subtle flex items-center gap-2 text-ui-fg-muted"
                            onClick={e => {
                              e.stopPropagation();
                              clearFilter(column.key);
                            }}
                          >
                            <X className="h-4 w-4" />
                            <span>Clear Filter</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Resize handle */}
                {index < columns.length - 1 && (
                  <div
                    className={`absolute top-0 right-0 w-4 h-full cursor-col-resize hover:bg-blue-200 hover:border-l-2 hover:border-blue-400 transition-all duration-200 z-30 ${
                      isResizing === column.key ? 'bg-blue-300 border-l-2 border-blue-500' : ''
                    }`}
                    onMouseDown={e => handleMouseDown(e, column.key)}
                    style={{
                      right: '-2px', // Better overlap for easier grabbing
                      zIndex: 30, // Even higher to ensure it's always on top
                    }}
                    title="Drag to resize column"
                  />
                )}
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {customers.map(customer => (
            <Table.Row key={customer.id}>
              {columns.map(column => (
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
                  {renderCellContent(customer, column.key)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
};

export default ManualCustomerTable;
