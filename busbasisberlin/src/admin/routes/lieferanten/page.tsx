// busbasisberlin/src/admin/routes/lieferanten/page.tsx
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck, MagnifyingGlass, Plus, XMark } from '@medusajs/icons';
import { Button, Container, Input, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Supplier } from '../../../modules/supplier/models/supplier';
import SupplierTable from './components/SupplierTable';

const SuppliersPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch suppliers
  const { data, isLoading } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const res = await fetch('/admin/suppliers', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      const { suppliers } = await res.json();
      return suppliers as Supplier[];
    },
  });

  // Fetch all supplier details for search
  const { data: suppliersWithDetails } = useQuery({
    queryKey: ['admin-suppliers-with-details'],
    queryFn: async () => {
      if (!data || data.length === 0) return [];

      const detailsPromises = data.map(async supplier => {
        try {
          const res = await fetch(`/admin/suppliers/${supplier.id}/details`, { credentials: 'include' });
          if (!res.ok) return { ...supplier, contacts: [], addresses: [] };
          const { supplier: detailedSupplier } = await res.json();
          return detailedSupplier;
        } catch (error) {
          console.error(`Error fetching details for supplier ${supplier.id}:`, error);
          return { ...supplier, contacts: [], addresses: [] };
        }
      });

      return Promise.all(detailsPromises);
    },
    enabled: !!data && data.length > 0,
  });

  const suppliers = data || [];

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;

    const searchLower = searchTerm.toLowerCase().trim();

    return suppliers.filter(supplier => {
      // Find the detailed supplier data
      const detailedSupplier = suppliersWithDetails?.find(s => s.id === supplier.id);

      // Search in basic supplier fields
      const basicMatch =
        supplier.company?.toLowerCase().includes(searchLower) ||
        supplier.company_addition?.toLowerCase().includes(searchLower) ||
        supplier.supplier_number?.toLowerCase().includes(searchLower) ||
        supplier.customer_number?.toLowerCase().includes(searchLower) ||
        supplier.internal_key?.toLowerCase().includes(searchLower) ||
        supplier.vat_id?.toLowerCase().includes(searchLower) ||
        supplier.website?.toLowerCase().includes(searchLower) ||
        supplier.bank_name?.toLowerCase().includes(searchLower) ||
        supplier.iban?.toLowerCase().includes(searchLower) ||
        supplier.note?.toLowerCase().includes(searchLower);

      if (basicMatch) return true;

      // Search in contacts
      if (detailedSupplier?.contacts) {
        const contactMatch = detailedSupplier.contacts.some(
          (contact: any) =>
            contact.first_name?.toLowerCase().includes(searchLower) ||
            contact.last_name?.toLowerCase().includes(searchLower) ||
            contact.department?.toLowerCase().includes(searchLower) ||
            contact.emails?.some((email: any) => email.email?.toLowerCase().includes(searchLower)) ||
            contact.phones?.some((phone: any) => phone.number?.includes(searchTerm)),
        );
        if (contactMatch) return true;
      }

      // Search in addresses
      if (detailedSupplier?.addresses) {
        const addressMatch = detailedSupplier.addresses.some(
          (address: any) =>
            address.street?.toLowerCase().includes(searchLower) ||
            address.city?.toLowerCase().includes(searchLower) ||
            address.postal_code?.includes(searchTerm) ||
            address.country_name?.toLowerCase().includes(searchLower),
        );
        if (addressMatch) return true;
      }

      return false;
    });
  }, [suppliers, suppliersWithDetails, searchTerm]);

  // Delete supplier
  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/admin/suppliers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Fehler beim Löschen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers-with-details'] });
      toast.success('Lieferant erfolgreich gelöscht');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Handlers
  const handleCreate = () => navigate('/lieferanten/new');
  const handleEdit = (supplier: Supplier) => navigate(`/lieferanten/${supplier.id}`);
  const handleDelete = (id: string) => {
    deleteSupplier.mutate(id);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <Container className="divide-y p-0 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-x-2">
          <HandTruck className="text-ui-fg-subtle" />
          <h1>Lieferanten</h1>
        </div>
        <Button size="small" variant="secondary" onClick={handleCreate}>
          <Plus />
          Neuer Lieferant
        </Button>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4 border-b bg-ui-bg-subtle">
        <div className="flex items-center gap-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlass className="h-4 w-4 text-ui-fg-muted" />
            </div>
            <Input
              placeholder="Suchen nach Firma, Lieferantennummer, Kontakt, E-Mail, Adresse..."
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
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="mt-2 text-sm text-ui-fg-subtle">
            {filteredSuppliers.length === 0 ? (
              <span>Keine Ergebnisse für "{searchTerm}"</span>
            ) : filteredSuppliers.length === 1 ? (
              <span>1 Ergebnis für "{searchTerm}"</span>
            ) : (
              <span>
                {filteredSuppliers.length} Ergebnisse für "{searchTerm}"
              </span>
            )}
            {filteredSuppliers.length !== suppliers.length && (
              <span className="ml-2 text-ui-fg-muted">(von {suppliers.length} gesamt)</span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto px-6 py-4">
          <SupplierTable
            suppliers={filteredSuppliers}
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
  label: 'Lieferanten',
  icon: HandTruck,
});

export default SuppliersPage;
