import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck, Plus } from '@medusajs/icons';
import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Service } from '../../../modules/service/models/service';

import ServiceModal from './components/ServiceModal';
import ServiceTable from './components/ServiceTable';

const ServicesPage = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Fetch services
  const { data, isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const res = await fetch('/admin/services', { credentials: 'include' });

      if (!res.ok) throw new Error('Failed to fetch services');

      return (await res.json()).services as Service[];
    },
  });
  const services = data || [];

  // Create service
  const createService = useMutation({
    mutationFn: async (values: Partial<Service>) => {
      const res = await fetch('/admin/services', {
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
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      toast.success('Dienstleistung erfolgreich erstellt');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Edit service
  const updateService = useMutation({
    mutationFn: async (values: Partial<Service>) => {
      if (!editingService) throw new Error('Keine Dienstleistung ausgewählt');
      const res = await fetch(`/admin/services/${editingService.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      toast.success('Dienstleistung erfolgreich aktualisiert');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete service
  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/admin/services/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Fehler beim Löschen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      toast.success('Dienstleistung erfolgreich gelöscht');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Modal handlers
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingService(null);
  };

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
    } else {
      setEditingService(null);
    }
    setModalOpen(true);
  };

  // Form submission handler
  const handleSubmit = (data: Partial<Service>) => {
    if (editingService) {
      updateService.mutate(data);
    } else {
      createService.mutate(data);
    }
  };

  // Handlers
  const handleCreate = () => handleOpenModal();
  const handleEdit = (service: Service) => handleOpenModal(service);
  const handleDelete = (id: string) => {
    deleteService.mutate(id);
  };

  return (
    <Container className="divide-y p-0 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-x-2">
          <HandTruck className="text-ui-fg-subtle" />
          <h1 className="text-lg font-semibold">Dienstleistungen</h1>
        </div>
        <Button size="small" variant="secondary" onClick={handleCreate}>
          <Plus />
          Neue Dienstleistung
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto px-6 py-4">
          <ServiceTable services={services} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} />
        </div>
      </div>

      {/* Modal */}
      <ServiceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        service={editingService}
        onSubmit={handleSubmit}
        isSubmitting={createService.isPending || updateService.isPending}
      />
    </Container>
  );
};

// Route configuration
export const config = defineRouteConfig({
  label: 'Dienstleistungen',
  icon: HandTruck,
});

export default ServicesPage;
