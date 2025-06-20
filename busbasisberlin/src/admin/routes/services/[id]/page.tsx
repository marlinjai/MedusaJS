import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import type { Service } from '../../../../modules/service/models/service';
import ServiceForm from '../components/ServiceForm';

const EditServicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formId = 'edit-service-form';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-service', id],
    queryFn: async () => {
      const res = await fetch(`/admin/services/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch service');
      const { service } = await res.json();
      return service as Service;
    },
  });

  const updateService = useMutation({
    mutationFn: async (values: Partial<Service>) => {
      const res = await fetch(`/admin/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin-service', id] });
      toast.success('Dienstleistung erfolgreich gespeichert');
      navigate('/services');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (data: Partial<Service>) => {
    updateService.mutate(data);
  };

  if (isLoading) {
    return <Container>Laden...</Container>;
  }

  if (!data) {
    return <Container>Dienstleistung nicht gefunden.</Container>;
  }

  return (
    <Container className="p-0 h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-x-2">
            <h1 className="text-xl font-semibold">Dienstleistung bearbeiten</h1>
          </div>
          <div className="flex items-center gap-x-2">
            <Button variant="secondary" size="small" onClick={() => navigate('/services')}>
              Abbrechen
            </Button>
            <Button variant="primary" size="small" type="submit" form={formId} isLoading={updateService.isPending}>
              Speichern
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto">
          <ServiceForm
            formId={formId}
            initialData={data}
            onSubmit={handleSubmit}
            isSubmitting={updateService.isPending}
          />
        </div>
      </div>
    </Container>
  );
};

export default EditServicePage;
