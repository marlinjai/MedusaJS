import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { Supplier } from '../../../../modules/supplier/models/supplier';
import SupplierForm from '../components/SupplierForm';

const NewSupplierPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formId = 'new-supplier-form';

  const createSupplier = useMutation({
    mutationFn: async (values: Partial<Supplier>) => {
      const res = await fetch('/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Fehler beim Erstellen des Lieferanten');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success('Lieferant erfolgreich erstellt');
      navigate('/lieferanten');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (data: Partial<Supplier>) => {
    createSupplier.mutate(data);
  };

  return (
    <Container className="p-0 h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-x-2">
            <h1 className="text-xl font-semibold">Neuer Lieferant</h1>
          </div>
          <div className="flex items-center gap-x-2">
            <Button variant="secondary" size="small" onClick={() => navigate('/lieferanten')}>
              Abbrechen
            </Button>
            <Button variant="primary" size="small" type="submit" form={formId} isLoading={createSupplier.isPending}>
              Erstellen
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto">
          <SupplierForm formId={formId} onSubmit={handleSubmit} isSubmitting={createSupplier.isPending} />
        </div>
      </div>
    </Container>
  );
};

export default NewSupplierPage;
