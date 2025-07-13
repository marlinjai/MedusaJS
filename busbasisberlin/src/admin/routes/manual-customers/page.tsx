/**
 * page.tsx
 * Main manual customers page for admin UI
 * Displays customer list with filtering, statistics, and management actions
 */
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { MagnifyingGlass, Plus, User, XMark } from '@medusajs/icons';
import { Button, Container, Input, Select, Text, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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

  // Fetch manual customers
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-manual-customers', searchTerm, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'all') params.append('customer_type', typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/admin/manual-customers?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch manual customers');
      return res.json();
    },
  });

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
  const handleClearSearch = () => setSearchTerm('');

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
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button onClick={handleClearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <XMark className="h-4 w-4 text-ui-fg-muted hover:text-ui-fg-base" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        <div className="mt-2">
          <Text className="text-sm text-ui-fg-muted">
            {customers.length} Kunden {searchTerm && `gefunden für "${searchTerm}"`}
            {typeFilter !== 'all' && ` • Typ: ${typeFilter}`}
            {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
          </Text>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto px-6 py-4">
          <ManualCustomerTable
            customers={customers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
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
