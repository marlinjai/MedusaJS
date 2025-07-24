/**
 * OfferTable.tsx
 * Enhanced table component with sorting, filtering, and column resizing for offers
 */
import { Badge, Button, Table, Text } from '@medusajs/ui';
import { ArrowDown, ArrowUp, Edit, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type OfferStatus = 'draft' | 'active' | 'accepted' | 'completed' | 'cancelled';

interface OfferItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: 'product' | 'service';
}

interface Offer {
  id: string;
  offer_number: string;
  title: string;
  description?: string;
  status: OfferStatus;
  customer_name?: string;
  customer_email?: string;
  total_amount: number;
  currency_code: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  items: OfferItem[];
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

type ColumnFilter = {
  [key: string]: string;
};

interface OfferTableProps {
  offers: Offer[];
  onEdit: (offer: Offer) => void;
  onDelete: (id: string) => void;
  onView: (offer: Offer) => void;
  isLoading: boolean;
  isFetching?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: ColumnFilter) => void;
  sortConfig?: SortConfig;
  filters?: ColumnFilter;
}

// Column configuration
const columns = [
  { key: 'offer_number', label: 'Angebot', width: 150, sortable: true, filterable: true },
  { key: 'customer_name', label: 'Kunde', width: 200, sortable: true, filterable: true },
  { key: 'status', label: 'Status', width: 120, sortable: false, filterable: false, noMenu: true },
  { key: 'total_amount', label: 'Wert', width: 120, sortable: true, filterable: false },
  { key: 'created_at', label: 'Erstellt', width: 120, sortable: true, filterable: false },
  { key: 'valid_until', label: 'Gültig bis', width: 120, sortable: true, filterable: false },
  { key: 'actions', label: 'Aktionen', width: 120, sortable: false, filterable: false, noMenu: true },
];

const OfferTable = ({
  offers,
  onEdit,
  onDelete,
  onView,
  isLoading,
  isFetching,
  onSort,
  onFilter,
  sortConfig,
  filters = {},
}: OfferTableProps) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(() => {
    const widths: { [key: string]: number } = {};
    columns.forEach(col => {
      widths[col.key] = col.width;
    });
    return widths;
  });

  const [activeFilters, setActiveFilters] = useState<ColumnFilter>(filters);
  const [openColumnMenu, setOpenColumnMenu] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [filterInputs, setFilterInputs] = useState<{ [key: string]: string }>({});
  const tableRef = useRef<HTMLTableElement>(null);

  // Calculate total table width
  const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
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

  // Status color mapping for badges
  const getStatusBadgeProps = (status: OfferStatus) => {
    switch (status) {
      case 'draft':
        return { color: 'grey' as const };
      case 'active':
        return { color: 'blue' as const };
      case 'accepted':
        return { color: 'green' as const };
      case 'completed':
        return { color: 'green' as const };
      case 'cancelled':
        return { color: 'red' as const };
      default:
        return { color: 'grey' as const };
    }
  };

  // Status translation
  const getStatusText = (status: OfferStatus) => {
    switch (status) {
      case 'draft':
        return 'Entwurf';
      case 'active':
        return 'Aktiv';
      case 'accepted':
        return 'Angenommen';
      case 'completed':
        return 'Abgeschlossen';
      case 'cancelled':
        return 'Storniert';
      default:
        return status;
    }
  };

  // Handle sort
  const handleSort = (key: string, direction?: 'asc' | 'desc') => {
    if (!onSort) return;

    let sortDirection: 'asc' | 'desc' = direction || 'asc';
    if (!direction) {
      if (sortConfig?.key === key && sortConfig.direction === 'asc') {
        sortDirection = 'desc';
      }
    }

    onSort(key, sortDirection);
    setOpenColumnMenu(null);
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters };
    if (value) {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  // Apply filter
  const applyFilter = (columnKey: string) => {
    const value = filterInputs[columnKey];
    handleFilterChange(columnKey, value || '');
    setFilterInputs(prev => ({ ...prev, [columnKey]: '' }));
  };

  // Clear sort
  const clearSort = () => {
    if (onSort) {
      onSort('', 'asc');
    }
  };

  // Clear filter
  const clearFilter = (columnKey: string) => {
    handleFilterChange(columnKey, '');
    setFilterInputs(prev => ({ ...prev, [columnKey]: '' }));
  };

  // Handle column resizing
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    setIsResizing(columnKey);

    const startX = e.clientX;
    const startWidth = columnWidths[columnKey];

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(getMinimumWidth(columnKey), startWidth + deltaX);

      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Get minimum width for column
  const getMinimumWidth = (columnKey: string) => {
    switch (columnKey) {
      case 'offer_number':
        return 100;
      case 'customer_name':
        return 150;
      case 'status':
        return 80;
      case 'total_amount':
        return 100;
      case 'created_at':
        return 100;
      case 'valid_until':
        return 100;
      case 'actions':
        return 100;
      default:
        return 80;
    }
  };

  // Toggle column menu
  const toggleColumnMenu = (columnKey: string) => {
    setOpenColumnMenu(openColumnMenu === columnKey ? null : columnKey);
  };

  // Get filter options for specific columns
  const getFilterOptions = (columnKey: string) => {
    switch (columnKey) {
      case 'status':
        return [
          { value: 'draft', label: 'Entwurf' },
          { value: 'active', label: 'Aktiv' },
          { value: 'accepted', label: 'Angenommen' },
          { value: 'completed', label: 'Abgeschlossen' },
          { value: 'cancelled', label: 'Storniert' },
        ];
      default:
        return [];
    }
  };

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openColumnMenu && !(e.target as Element).closest('.column-menu')) {
        setOpenColumnMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openColumnMenu]);

  // Render cell content
  const renderCellContent = (offer: Offer, columnKey: string) => {
    switch (columnKey) {
      case 'offer_number':
        return (
          <div className="flex flex-col">
            <Text size="small" weight="plus" className="text-ui-fg-base">
              {offer.offer_number}
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {offer.title}
            </Text>
          </div>
        );
      case 'customer_name':
        return (
          <Text size="small" className="text-ui-fg-base">
            {offer.customer_name || 'Kein Name'}
          </Text>
        );
      case 'status':
        return <Badge color={getStatusBadgeProps(offer.status).color}>{getStatusText(offer.status)}</Badge>;
      case 'total_amount':
        return (
          <Text size="small" weight="plus" className="text-ui-fg-base">
            {formatCurrency(offer.total_amount, offer.currency_code)}
          </Text>
        );
      case 'created_at':
        return (
          <Text size="small" className="text-ui-fg-base">
            {formatDate(offer.created_at)}
          </Text>
        );
      case 'valid_until':
        return (
          <Text size="small" className="text-ui-fg-base">
            {offer.valid_until ? formatDate(offer.valid_until) : '-'}
          </Text>
        );
      case 'actions':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="transparent"
              size="small"
              onClick={e => {
                e.stopPropagation();
                onEdit(offer);
              }}
            >
              <Edit className="w-5 h-5" />
            </Button>
            <Button
              variant="transparent"
              size="small"
              onClick={e => {
                e.stopPropagation();
                onDelete(offer.id);
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

  if (isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Lade Angebote...</Text>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Text>Keine Angebote gefunden</Text>
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
                  }}
                  style={{ minWidth: '0px' }}
                >
                  {/* Text content with truncation */}
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
                          <span>Aufsteigend sortieren</span>
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-ui-bg-subtle flex items-center gap-2 text-ui-fg-base"
                          onClick={e => {
                            e.stopPropagation();
                            handleSort(column.key, 'desc');
                          }}
                        >
                          <ArrowDown className="h-4 w-4" />
                          <span>Absteigend sortieren</span>
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
                            <span>Sortierung löschen</span>
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
                            <select
                              value={filterInputs[column.key] || activeFilters[column.key] || 'all'}
                              onChange={e => {
                                const actualValue = e.target.value === 'all' ? '' : e.target.value;
                                setFilterInputs(prev => ({ ...prev, [column.key]: actualValue }));
                                handleFilterChange(column.key, actualValue);
                                setOpenColumnMenu(null);
                              }}
                              className="w-full px-2 py-1 border border-ui-border-base rounded text-sm"
                            >
                              <option value="all">Alle</option>
                              {getFilterOptions(column.key).map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                placeholder="Filterwert..."
                                value={filterInputs[column.key] || ''}
                                onChange={e => setFilterInputs(prev => ({ ...prev, [column.key]: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    applyFilter(column.key);
                                  }
                                }}
                                className="flex-1 px-2 py-1 border border-ui-border-base rounded text-sm"
                              />
                              <Button
                                size="small"
                                onClick={e => {
                                  e.stopPropagation();
                                  applyFilter(column.key);
                                }}
                                className="px-2"
                              >
                                Anwenden
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
                            <span>Filter löschen</span>
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
                      right: '-2px',
                      zIndex: 30,
                    }}
                    title="Spalte in der Breite ändern"
                  />
                )}
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {offers.map(offer => (
            <Table.Row key={offer.id}>
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
                  {renderCellContent(offer, column.key)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
};

export default OfferTable;
