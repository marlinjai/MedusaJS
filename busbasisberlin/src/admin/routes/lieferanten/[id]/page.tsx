import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import type { Supplier } from '../../../../modules/supplier/models/supplier';
import SupplierForm from '../components/SupplierForm';

// Type matching the new API structure
interface UpdateSupplierData {
  company: string;
  company_addition?: string;
  supplier_number?: string;
  customer_number?: string;
  internal_key?: string;
  website?: string;
  vat_id?: string;
  status?: string;
  is_active?: boolean;
  language?: string;
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  iban?: string;
  bic?: string;
  note?: string;
  contacts?: Array<{
    salutation?: string;
    first_name?: string;
    last_name?: string;
    department?: string;
    phones?: Array<{ number: string; label?: string; type?: string }>;
    emails?: Array<{ email: string; label?: string; type?: string }>;
  }>;
  addresses?: Array<any>;
}

const EditSupplierPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formId = 'edit-supplier-form';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-supplier', id],
    queryFn: async () => {
      const res = await fetch(`/admin/suppliers/${id}/details`, { credentials: 'include' });
      if (!res.ok) throw new Error('Lieferant konnte nicht geladen werden');
      const { supplier } = await res.json();
      return supplier as Supplier;
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async (values: UpdateSupplierData) => {
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
      queryClient.invalidateQueries({ queryKey: ['supplier-details', id] });
      toast.success('Lieferant erfolgreich gespeichert');
      navigate('/lieferanten');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (data: UpdateSupplierData) => {
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
            supplierId={id}
            onSubmit={handleSubmit}
            isSubmitting={updateSupplier.isPending}
          />
        </div>
      </div>
    </Container>
  );
};

export default EditSupplierPage;
