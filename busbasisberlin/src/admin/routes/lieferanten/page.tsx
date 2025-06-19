// busbasisberlin/src/admin/routes/lieferanten/page.tsx
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck, Plus } from '@medusajs/icons';
import { Button, Container, Heading, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Supplier } from '../../../modules/supplier/models/supplier';
import SupplierModal from './components/SupplierModal';
import SupplierTable from './components/SupplierTable';

const SuppliersPage = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Fetch suppliers
  const { data, isLoading } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const res = await fetch('/admin/suppliers', { credentials: 'include' });

      if (!res.ok) throw new Error('Failed to fetch suppliers');

      return (await res.json()).suppliers as Supplier[];
    },
  });
  const suppliers = data || [];

  // Create supplier
  const createSupplier = useMutation({
    mutationFn: async (values: Partial<Supplier>) => {
      const res = await fetch('/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error('Fehler beim Erstellen');

      return res.json();
    },
    onSuccess: () => {
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success('Lieferant erfolgreich erstellt');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Edit supplier
  const updateSupplier = useMutation({
    mutationFn: async (values: Partial<Supplier>) => {
      if (!editingSupplier) throw new Error('Kein Lieferant ausgewählt');
      const res = await fetch(`/admin/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error('Fehler beim Bearbeiten');

      return res.json();
    },
    onSuccess: () => {
      handleCloseModal();
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success('Lieferant erfolgreich aktualisiert');
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  // Modal handlers
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingSupplier(null);
    // Remove pointer events after modal closes to prevent unwanted clicks
    setTimeout(() => {
      document.body.style.pointerEvents = '';
    }, 500);
  };

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
    } else {
      setEditingSupplier(null);
    }
    setModalOpen(true);
  };

  // Form submission handler
  const handleSubmit = (data: Partial<Supplier>) => {
    if (editingSupplier) {
      updateSupplier.mutate(data);
    } else {
      createSupplier.mutate(data);
    }
  };

  // Handlers
  const handleCreate = () => handleOpenModal();
  const handleEdit = (supplier: Supplier) => handleOpenModal(supplier);
  const handleDelete = (id: string) => {
    deleteSupplier.mutate(id);
  };

  return (
    <Container className="divide-y p-0 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-x-2">
          <HandTruck className="text-ui-fg-subtle" />
          <Heading level="h1">Lieferanten</Heading>
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

      {/* Modal */}
      <SupplierModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        supplier={editingSupplier}
        onSubmit={handleSubmit}
        isSubmitting={createSupplier.isPending || updateSupplier.isPending}
      />
    </Container>
  );
};

// Route configuration
export const config = defineRouteConfig({
  label: 'Lieferanten',
  icon: HandTruck,
});

export default SuppliersPage;
