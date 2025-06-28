import { Button, Container, toast } from '@medusajs/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import SupplierForm from '../components/SupplierForm';

// Type matching the new API structure
interface CreateSupplierData {
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
  lead_time?: number;
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_holder?: string;
  iban?: string;
  bic?: string;
  note?: string;
  contacts?: Array<{
    salutation?: string;
    first_name?: string;
    last_name?: string;
    department?: string;
    phones?: Array<{ number?: string; label?: string }>;
    emails?: Array<{ email?: string; label?: string }>;
  }>;
  addresses?: Array<{
    label?: string;
    street?: string;
    street_number?: string;
    postal_code?: string;
    city?: string;
    country_name?: string;
    state?: string;
    phone?: string;
    email?: string;
    is_default?: boolean;
  }>;
}

const NewSupplierPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formId = 'new-supplier-form';

  const createSupplier = useMutation({
    mutationFn: async (values: CreateSupplierData) => {
      console.log('Form submitting with values:', JSON.stringify(values, null, 2));
      const res = await fetch('/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.message || 'Fehler beim Erstellen des Lieferanten');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success('Lieferant erfolgreich erstellt');
      navigate('/lieferanten');
    },
    onError: (e: any) => {
      console.error('Mutation error:', e);
      toast.error(e.message);
    },
  });

  const handleSubmit = (data: CreateSupplierData) => {
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
