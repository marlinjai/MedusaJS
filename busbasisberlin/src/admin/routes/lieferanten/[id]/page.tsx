import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import type { Supplier } from '../../../../modules/supplier/models/supplier';
import SupplierForm from '../components/SupplierForm';

const EditSupplierPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formId = 'edit-supplier-form';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-supplier', id],
    queryFn: async () => {
      const res = await fetch(`/admin/suppliers/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Lieferant konnte nicht geladen werden');
      const { supplier } = await res.json();
      return supplier as Supplier;
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async (values: Partial<Supplier>) => {
      const res = await fetch(`/admin/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern des Lieferanten');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-supplier', id] });
      toast.success('Lieferant erfolgreich gespeichert');
      navigate('/lieferanten');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (data: Partial<Supplier>) => {
    updateSupplier.mutate(data);
  };

  if (isLoading) {
    return <Container>Laden...</Container>;
  }

  if (!data) {
    return <Container>Lieferant nicht gefunden.</Container>;
  }

  return (
    <Container className="p-0 h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-x-2">
            <h1 className="text-xl font-semibold">Lieferant bearbeiten</h1>
          </div>
          <div className="flex items-center gap-x-2">
            <Button variant="secondary" size="small" onClick={() => navigate('/lieferanten')}>
              Abbrechen
            </Button>
            <Button variant="primary" size="small" type="submit" form={formId} isLoading={updateSupplier.isPending}>
              Speichern
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto">
          <SupplierForm
            formId={formId}
            initialData={data}
            onSubmit={handleSubmit}
            isSubmitting={updateSupplier.isPending}
          />
        </div>
      </div>
    </Container>
  );
};

export default EditSupplierPage;
