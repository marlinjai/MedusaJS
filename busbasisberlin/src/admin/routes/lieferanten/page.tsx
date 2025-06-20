// busbasisberlin/src/admin/routes/lieferanten/page.tsx
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck, Plus } from '@medusajs/icons';
import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { Supplier } from '../../../modules/supplier/models/supplier';
import SupplierTable from './components/SupplierTable';

const SuppliersPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
  const suppliers = data || [];

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

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto px-6 py-4">
          <SupplierTable suppliers={suppliers} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} />
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
