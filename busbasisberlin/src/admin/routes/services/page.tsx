import { defineRouteConfig } from '@medusajs/admin-sdk';
import { HandTruck, Plus } from '@medusajs/icons';
import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { Service } from '../../../modules/service/models/service';
import ServiceTable from './components/ServiceTable';

const ServicesPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch services
  const { data, isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const res = await fetch('/admin/services', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch services');
      const { services } = await res.json();
      return services as Service[];
    },
  });
  const services = data || [];

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

  const handleCreate = () => navigate('/services/new');
  const handleEdit = (service: Service) => navigate(`/services/${service.id}`);
  const handleDelete = (id: string) => deleteService.mutate(id);

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
    </Container>
  );
};

// Route configuration
export const config = defineRouteConfig({
  label: 'Dienstleistungen',
  icon: HandTruck,
});

export default ServicesPage;
