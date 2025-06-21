/**
 * product-suppliers.tsx
 * Admin widget for managing product-supplier relationships
 * Displays suppliers for a product with their relationship data
 */
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import { Button, Checkbox, Container, FocusModal, Input, Label, Table, Text, Textarea, toast } from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface ProductSupplier {
  id: string;
  product_id: string;
  supplier_id: string;
  is_primary: boolean;
  supplier_price: number | null;
  supplier_sku: string | null;
  lead_time: number | null;
  minimum_order_quantity: number | null;
  maximum_order_quantity: number | null;
  stock_quantity: number | null;
  notes: string | null;
  last_order_date: string | null;
  supplier_rating: number | null;
  is_active: boolean;
  supplier: {
    id: string;
    company: string;
    email: string | null;
    phone: string | null;
  };
}

const ProductSuppliersWidget = ({ data: product }: { data: { id: string } }) => {
  const queryClient = useQueryClient();
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [editingRelationship, setEditingRelationship] = useState<ProductSupplier | null>(null);

  // Fetch suppliers for this product
  const { data, isLoading } = useQuery({
    queryKey: ['product-suppliers', product?.id],
    queryFn: async () => {
      const res = await fetch(`/admin/products/${product.id}/suppliers`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      const { relationships } = await res.json();
      return relationships as ProductSupplier[];
    },
    enabled: !!product?.id,
  });

  // Fetch all suppliers for the dropdown
  const { data: allSuppliers, isLoading: isLoadingAllSuppliers } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: async () => {
      const res = await fetch('/admin/suppliers', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch suppliers');
      const { suppliers } = await res.json();
      return suppliers;
    },
    enabled: isAddingSupplier, // Only fetch when the user wants to add a supplier
  });

  // Link supplier to product
  const linkSupplier = useMutation({
    mutationFn: async (supplierId: string) => {
      const res = await fetch(`/admin/products/${product.id}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ supplier_id: supplierId }),
      });
      if (!res.ok) throw new Error('Failed to link supplier');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers', product.id] });
      toast.success('Lieferant erfolgreich verknüpft');
      setIsAddingSupplier(false);
      setSelectedSupplierId('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Unlink supplier from product
  const unlinkSupplier = useMutation({
    mutationFn: async (supplierId: string) => {
      const res = await fetch(`/admin/products/${product.id}/suppliers/${supplierId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to unlink supplier');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers', product.id] });
      toast.success('Lieferant erfolgreich entfernt');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update product-supplier relationship
  const updateRelationship = useMutation({
    mutationFn: async (data: Partial<ProductSupplier>) => {
      if (!editingRelationship) throw new Error('Keine Beziehung zum Bearbeiten ausgewählt');
      const res = await fetch(`/admin/products/${product.id}/suppliers/${editingRelationship.supplier_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Beziehung konnte nicht aktualisiert werden');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-suppliers', product.id] });
      toast.success('Lieferantendetails erfolgreich aktualisiert');
      setEditingRelationship(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAddSupplier = () => {
    if (selectedSupplierId) {
      linkSupplier.mutate(selectedSupplierId);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price / 100);
  };

  if (isLoading || !product) {
    return (
      <Container className="p-4">
        <Text className="text-ui-fg-subtle">Lädt Lieferanten...</Text>
      </Container>
    );
  }

  const suppliers = data || [];

  return (
    <Container className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Text className="text-lg font-semibold">Lieferanten</Text>
        <Button size="small" variant="secondary" onClick={() => setIsAddingSupplier(!isAddingSupplier)}>
          {isAddingSupplier ? 'Abbrechen' : 'Lieferant hinzufügen'}
        </Button>
      </div>

      {/* Add Supplier Form */}
      {isAddingSupplier && (
        <div className="mb-4 p-4 border border-ui-border-base rounded-md bg-ui-bg-subtle">
          <Text className="text-sm font-medium mb-2">Neuen Lieferanten hinzufügen:</Text>
          <div className="flex gap-2">
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="flex-1 px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field"
            >
              <option value="">Lieferant auswählen</option>
              {isLoadingAllSuppliers ? (
                <option disabled>Lade Lieferanten...</option>
              ) : (
                allSuppliers?.map((supplier: any) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.company}
                  </option>
                ))
              )}
            </select>
            <Button
              size="small"
              variant="primary"
              onClick={handleAddSupplier}
              disabled={!selectedSupplierId || linkSupplier.isPending}
              isLoading={linkSupplier.isPending}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      {suppliers.length === 0 ? (
        <div className="text-center py-8">
          <Text className="text-ui-fg-subtle">Keine Lieferanten für dieses Produkt</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Lieferant</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Preis</Table.HeaderCell>
              <Table.HeaderCell>SKU</Table.HeaderCell>
              <Table.HeaderCell>Lieferzeit</Table.HeaderCell>
              <Table.HeaderCell>Lager</Table.HeaderCell>
              <Table.HeaderCell className="w-[32px]"></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {suppliers.map(relationship => (
              <Table.Row key={relationship.id}>
                <Table.Cell>
                  <div className="flex flex-col gap-y-1">
                    <Text size="small" weight="plus">
                      {relationship.supplier.company}
                    </Text>
                    {relationship.supplier.email && (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        📧 {relationship.supplier.email}
                      </Text>
                    )}
                    {relationship.is_primary && (
                      <Text size="xsmall" className="text-ui-fg-muted">
                        ⭐ Primärer Lieferant
                      </Text>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-x-1">
                    <div
                      className={`w-2 h-2 rounded-full ${relationship.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                    />
                    <Text size="small">{relationship.is_active ? 'Aktiv' : 'Inaktiv'}</Text>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{formatPrice(relationship.supplier_price)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{relationship.supplier_sku || '-'}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{relationship.lead_time ? `${relationship.lead_time} Tage` : '-'}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{relationship.stock_quantity || '-'}</Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-x-2">
                    <FocusModal>
                      <FocusModal.Trigger asChild>
                        <Button size="small" variant="secondary" onClick={() => setEditingRelationship(relationship)}>
                          Bearbeiten
                        </Button>
                      </FocusModal.Trigger>
                      <FocusModal.Content>
                        <FocusModal.Header>
                          <FocusModal.Title>Lieferantendetails bearbeiten</FocusModal.Title>
                          <FocusModal.Description>
                            Spezifische Daten für {relationship.supplier.company} bei diesem Produkt anpassen.
                          </FocusModal.Description>
                        </FocusModal.Header>
                        <FocusModal.Body className="grid grid-cols-1 md:grid-cols-2 gap-4 py-16">
                          <EditRelationshipForm
                            relationship={relationship}
                            onSave={data => {
                              updateRelationship.mutate(data);
                              setEditingRelationship(null);
                            }}
                            isSaving={updateRelationship.isPending}
                          />
                        </FocusModal.Body>
                        <FocusModal.Footer>
                          <div className="flex justify-end gap-x-2">
                            <FocusModal.Close asChild>
                              <Button variant="secondary">Abbrechen</Button>
                            </FocusModal.Close>
                            <Button
                              variant="primary"
                              onClick={() => {
                                // The form will handle the save
                              }}
                              disabled={updateRelationship.isPending}
                            >
                              Speichern
                            </Button>
                          </div>
                        </FocusModal.Footer>
                      </FocusModal.Content>
                    </FocusModal>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => unlinkSupplier.mutate(relationship.supplier_id)}
                      disabled={unlinkSupplier.isPending}
                      isLoading={unlinkSupplier.isPending}
                    >
                      Entfernen
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  );
};

// Edit Relationship Form Component
const EditRelationshipForm = ({
  relationship,
  onSave,
  isSaving,
}: {
  relationship: ProductSupplier;
  onSave: (data: Partial<ProductSupplier>) => void;
  isSaving: boolean;
}) => {
  const [formData, setFormData] = useState<Partial<ProductSupplier>>(relationship);

  useEffect(() => {
    setFormData(relationship);
  }, [relationship]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="col-span-1 md:col-span-2 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supplier_price">Lieferantenpreis (€)</Label>
          <Input
            id="supplier_price"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.supplier_price ? (formData.supplier_price / 100).toString() : ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null;
              handleChange('supplier_price', value);
            }}
          />
        </div>
        <div>
          <Label htmlFor="supplier_sku">Lieferanten-SKU</Label>
          <Input
            id="supplier_sku"
            placeholder="SKU des Lieferanten"
            value={formData.supplier_sku || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('supplier_sku', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lead_time">Lieferzeit (Tage)</Label>
          <Input
            id="lead_time"
            type="number"
            placeholder="z.B. 5"
            value={formData.lead_time?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange('lead_time', e.target.value ? parseInt(e.target.value) : null)
            }
          />
        </div>
        <div>
          <Label htmlFor="stock_quantity">Lagerbestand (Lieferant)</Label>
          <Input
            id="stock_quantity"
            type="number"
            placeholder="z.B. 100"
            value={formData.stock_quantity?.toString() || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange('stock_quantity', e.target.value ? parseInt(e.target.value) : null)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_primary"
            checked={formData.is_primary || false}
            onCheckedChange={(checked: boolean) => handleChange('is_primary', checked)}
          />
          <Label htmlFor="is_primary">Primärer Lieferant</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_active"
            checked={formData.is_active || false}
            onCheckedChange={(checked: boolean) => handleChange('is_active', checked)}
          />
          <Label htmlFor="is_active">Verknüpfung aktiv</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          placeholder="Interne Notizen zu diesem Lieferanten..."
          value={formData.notes || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
        />
      </div>

      <button type="submit" style={{ display: 'none' }} />
    </form>
  );
};

// Widget configuration
export const config = defineWidgetConfig({
  zone: 'product.details.after',
});

export default ProductSuppliersWidget;
