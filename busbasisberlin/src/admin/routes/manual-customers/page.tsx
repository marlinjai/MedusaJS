/**
 * page.tsx
 * Main manual customers page for admin UI
 * Displays customer list with filtering, statistics, and management actions
 */
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { MagnifyingGlass, Plus, User, XMark } from '@medusajs/icons';
import { Button, Container, Input, Select, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ManualCustomerTable from './components/ManualCustomerTable';

// TypeScript types for our manual customer data
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

type ManualCustomerStats = {
  total: number;
  active: number;
  inactive: number;
  legacy: number;
  walkIn: number;
  business: number;
  withEmail: number;
  withPhone: number;
  totalSpent: number;
};

const ManualCustomersPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // Show 50 customers per page
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState({ current: 0, total: 0 });

  // Fetch manual customers with pagination
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin-manual-customers', searchTerm, typeFilter, statusFilter, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'all') params.append('customer_type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());

      const res = await fetch(`/admin/manual-customers?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch manual customers');
      return res.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    placeholderData: previousData => previousData, // Keep previous data while loading
  });

  // Prefetch adjacent pages for seamless navigation
  const prefetchAdjacentPages = async (centerPage: number, totalPages: number) => {
    setIsPrefetching(true);

    const pagesToPrefetch = [];

    // Prefetch next 5 pages
    for (let i = 1; i <= 5; i++) {
      const nextPage = centerPage + i;
      if (nextPage <= totalPages) {
        pagesToPrefetch.push(nextPage);
      }
    }

    // Prefetch previous 5 pages
    for (let i = 1; i <= 5; i++) {
      const prevPage = centerPage - i;
      if (prevPage >= 1) {
        pagesToPrefetch.push(prevPage);
      }
    }

    setPrefetchProgress({ current: 0, total: pagesToPrefetch.length });

    // Prefetch each page (with some delay to avoid overwhelming the server)
    const prefetchPromises = pagesToPrefetch.map((page, index) => {
      return new Promise(resolve => {
        setTimeout(async () => {
          const params = new URLSearchParams();
          if (searchTerm) params.append('search', searchTerm);
          if (typeFilter !== 'all') params.append('customer_type', typeFilter);
          if (statusFilter !== 'all') params.append('status', statusFilter);
          params.append('limit', pageSize.toString());
          params.append('offset', ((page - 1) * pageSize).toString());

          try {
            await queryClient.prefetchQuery({
              queryKey: ['admin-manual-customers', searchTerm, typeFilter, statusFilter, page, pageSize],
              queryFn: async () => {
                const res = await fetch(`/admin/manual-customers?${params.toString()}`, {
                  credentials: 'include',
                });
                if (!res.ok) throw new Error('Failed to fetch manual customers');
                return res.json();
              },
              staleTime: 30000,
            });
          } catch (error) {
            console.warn(`Failed to prefetch page ${page}:`, error);
          }

          // Update progress
          setPrefetchProgress(prev => ({ ...prev, current: prev.current + 1 }));
          resolve(page);
        }, index * 50); // 50ms delay between each prefetch
      });
    });

    // Wait for all prefetching to complete
    await Promise.all(prefetchPromises);
    setIsPrefetching(false);
  };

  const customers = data?.customers || [];
  const stats = data?.stats || {
    total: 0,
    active: 0,
    inactive: 0,
    legacy: 0,
    walkIn: 0,
    business: 0,
    withEmail: 0,
    withPhone: 0,
    totalSpent: 0,
  };

  const totalPages = Math.ceil((data?.total || 0) / pageSize);
  const hasMore = data?.has_more || false;

  // Trigger prefetching when current page loads successfully
  useEffect(() => {
    if (data && !isLoading && !isFetching && totalPages > 1) {
      // Small delay to avoid overwhelming the server
      const timer = setTimeout(() => {
        prefetchAdjacentPages(currentPage, totalPages);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [data, isLoading, isFetching, currentPage, totalPages, searchTerm, typeFilter, statusFilter]);

  // Delete manual customer
  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/admin/manual-customers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Fehler beim Löschen des Kunden');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-manual-customers'] });
      toast.success('Kunde erfolgreich gelöscht');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Handlers
  const handleCreate = () => navigate('/manual-customers/new');
  const handleEdit = (customer: ManualCustomer) => navigate(`/manual-customers/${customer.id}`);
  const handleDelete = (id: string) => deleteCustomer.mutate(id);
  const handleImport = () => navigate('/manual-customers/import');
  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Reset page when filters change
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Check if we have prefetched data for this page
      const queryKey = ['admin-manual-customers', searchTerm, typeFilter, statusFilter, currentPage - 1, pageSize];
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData) {
        // Data is already available, navigation will be instant
        console.log('Using prefetched data for page', currentPage - 1);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Check if we have prefetched data for this page
      const queryKey = ['admin-manual-customers', searchTerm, typeFilter, statusFilter, currentPage + 1, pageSize];
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData) {
        // Data is already available, navigation will be instant
        console.log('Using prefetched data for page', currentPage + 1);
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Check if we have prefetched data for this page
    const queryKey = ['admin-manual-customers', searchTerm, typeFilter, statusFilter, page, pageSize];
    const cachedData = queryClient.getQueryData(queryKey);
    if (cachedData) {
      // Data is already available, navigation will be instant
      console.log('Using prefetched data for page', page);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount / 100);
  };

  if (error) {
    return (
      <Container>
        <Text className="text-red-500">Fehler beim Laden der Kunden: {error.message}</Text>
      </Container>
    );
  }

  return (
    <Container className="divide-y p-0 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-x-2">
          <User className="text-ui-fg-subtle" />
          <h1 className="text-lg font-semibold">Manuelle Kunden</h1>
        </div>
        <div className="flex items-center gap-x-2">
          <Button size="small" variant="secondary" onClick={handleImport}>
            <Plus />
            CSV Import
          </Button>
          <Button size="small" variant="secondary" onClick={handleCreate}>
            <Plus />
            Neuer Kunde
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="px-6 py-4 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <Text className="text-xs font-medium text-ui-fg-subtle">Kunden gesamt</Text>
                <Text className="text-lg font-semibold">{stats.total}</Text>
              </div>
            </div>
          </div>

          <div className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <Text className="text-xs font-medium text-ui-fg-subtle">Aktive</Text>
                <Text className="text-lg font-semibold">{stats.active}</Text>
              </div>
            </div>
          </div>

          <div className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <Text className="text-xs font-medium text-ui-fg-subtle">Legacy</Text>
                <Text className="text-lg font-semibold">{stats.legacy}</Text>
              </div>
            </div>
          </div>

          <div className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <Text className="text-xs font-medium text-ui-fg-subtle">Laufkundschaft</Text>
                <Text className="text-lg font-semibold">{stats.walkIn}</Text>
              </div>
            </div>
          </div>

          <div className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <Text className="text-xs font-medium text-ui-fg-subtle">Mit E-Mail</Text>
                <Text className="text-lg font-semibold">{stats.withEmail}</Text>
              </div>
            </div>
          </div>

          <div className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <Text className="text-xs font-medium text-ui-fg-subtle">Gesamtumsatz</Text>
                <Text className="text-lg font-semibold">{formatCurrency(stats.totalSpent)}</Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b bg-ui-bg-subtle">
        <div className="flex items-center gap-x-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlass className="h-4 w-4 text-ui-fg-muted" />
            </div>
            <Input
              placeholder="Suchen nach Name, Firma, E-Mail, Telefon, Kundennummer..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button onClick={handleClearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <XMark className="h-4 w-4 text-ui-fg-muted hover:text-ui-fg-base" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <Select.Trigger className="w-40">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">Alle Typen</Select.Item>
              <Select.Item value="legacy">Legacy</Select.Item>
              <Select.Item value="walk-in">Laufkundschaft</Select.Item>
              <Select.Item value="business">Geschäftskunde</Select.Item>
            </Select.Content>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <Select.Trigger className="w-32">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">Alle Status</Select.Item>
              <Select.Item value="active">Aktiv</Select.Item>
              <Select.Item value="inactive">Inaktiv</Select.Item>
              <Select.Item value="blocked">Blockiert</Select.Item>
            </Select.Content>
          </Select>
        </div>

        {/* Filter Results Info */}
        <div className="mt-2 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Text className="text-sm text-ui-fg-muted">
              {isFetching ? 'Wird geladen...' : `${customers.length} Kunden auf Seite ${currentPage} von ${totalPages}`}
              {searchTerm && ` • Suche: "${searchTerm}"`}
              {typeFilter !== 'all' && ` • Typ: ${typeFilter}`}
              {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
              {data?.total && ` • Gesamt: ${data.total} Kunden`}
            </Text>

            {/* Prefetching indicator */}
            {isPrefetching && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-ui-border-base border-t-ui-fg-interactive"></div>
                <Text className="text-xs text-ui-fg-interactive">
                  Lädt weitere Seiten... ({prefetchProgress.current}/{prefetchProgress.total})
                </Text>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || isFetching}
              >
                Zurück
              </Button>

              <div className="flex items-center gap-1">
                {/* Show page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (page > totalPages) return null;

                  // Check if this page has prefetched data
                  const queryKey = ['admin-manual-customers', searchTerm, typeFilter, statusFilter, page, pageSize];
                  const hasPrefetchedData = queryClient.getQueryData(queryKey) !== undefined;

                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'primary' : 'secondary'}
                      size="small"
                      onClick={() => handlePageChange(page)}
                      disabled={isFetching}
                      className={`min-w-[36px] ${hasPrefetchedData && page !== currentPage ? 'ring-1 ring-ui-fg-interactive ring-opacity-30' : ''}`}
                      title={hasPrefetchedData ? 'Seite bereits geladen - sofortige Navigation' : 'Seite wird geladen'}
                    >
                      {page}
                    </Button>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <Text className="text-sm text-ui-fg-muted mx-1">...</Text>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={isFetching}
                      className="min-w-[36px]"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="secondary"
                size="small"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || isFetching}
              >
                Weiter
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto px-6 py-4">
          <ManualCustomerTable
            customers={customers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading && currentPage === 1} // Only show loading on initial load
            isFetching={isFetching}
          />
        </div>
      </div>
    </Container>
  );
};

// Route configuration
export const config = defineRouteConfig({
  label: 'Manuelle Kunden',
  icon: User,
});

export default ManualCustomersPage;
