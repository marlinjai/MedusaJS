/**
 * new/page.tsx
 * Create new offer page with comprehensive form
 * German UI following the same pattern as suppliers/services
 */
import { defineRouteConfig } from '@medusajs/admin-sdk';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Container, Input, Select, Table, Text, Textarea, toast } from '@medusajs/ui';

interface OfferItem {
  id: string;
  item_type: 'product' | 'service';
  title: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
  total_price: number;
}

interface OfferFormData {
  title: string;
  description: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  valid_until: string;
  internal_notes: string;
  customer_notes: string;
  currency_code: string;
  items: OfferItem[];
}

export const config = defineRouteConfig({
  label: 'Neues Angebot',
});

export default function CreateOfferPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OfferFormData>({
    title: '',
    description: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    valid_until: '',
    internal_notes: '',
    customer_notes: '',
    currency_code: 'EUR',
    items: [],
  });

  // Add new item to the offer
  const addItem = () => {
    const newItem: OfferItem = {
      id: Date.now().toString(),
      item_type: 'product',
      title: '',
      description: '',
      quantity: 1,
      unit: 'STK',
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 19,
      total_price: 0,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  // Remove item from the offer
  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  // Update item in the offer
  const updateItem = (itemId: string, updates: Partial<OfferItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, ...updates, total_price: calculateItemTotal({ ...item, ...updates }) } : item,
      ),
    }));
  };

  // Calculate total price for an item
  const calculateItemTotal = (item: OfferItem): number => {
    const subtotal = item.unit_price * item.quantity;
    const discount = subtotal * (item.discount_percentage / 100);
    return subtotal - discount;
  };

  // Calculate offer totals
  const calculateOfferTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const tax = formData.items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + itemTotal * (item.tax_rate / 100);
    }, 0);
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Mindestens ein Artikel ist erforderlich');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: formData.items.map(item => ({
            ...item,
            unit_price: Math.round(item.unit_price * 100), // Convert to cents
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Erstellen des Angebots');
      }

      await response.json(); // Get response but don't store it
      toast.success('Angebot erfolgreich erstellt');
      navigate('/admin/offers');
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Erstellen des Angebots');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateOfferTotals();

  return (
    <Container>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="secondary" size="small" onClick={() => navigate('/admin/offers')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <div>
          <Text size="xlarge" weight="plus" className="text-ui-fg-base">
            Neues Angebot erstellen
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            Erstellen Sie ein neues Angebot für einen Kunden
          </Text>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-ui-bg-subtle rounded-lg p-6">
          <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
            Grundinformationen
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Titel *
              </Text>
              <Input
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Angebotsbeschreibung"
                required
              />
            </div>

            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Währung
              </Text>
              <Select
                value={formData.currency_code}
                onValueChange={value => setFormData(prev => ({ ...prev, currency_code: value }))}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="EUR">EUR</Select.Item>
                  <Select.Item value="USD">USD</Select.Item>
                </Select.Content>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Beschreibung
              </Text>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detaillierte Beschreibung des Angebots"
                rows={3}
              />
            </div>

            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Gültig bis
              </Text>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={e => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-ui-bg-subtle rounded-lg p-6">
          <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
            Kundeninformationen
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Kundenname
              </Text>
              <Input
                type="text"
                value={formData.customer_name}
                onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Firmenname oder Privatperson"
              />
            </div>

            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                E-Mail
              </Text>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={e => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                placeholder="kunde@beispiel.de"
              />
            </div>

            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Telefon
              </Text>
              <Input
                type="tel"
                value={formData.customer_phone}
                onChange={e => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                placeholder="+49 123 456789"
              />
            </div>

            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Adresse
              </Text>
              <Textarea
                value={formData.customer_address}
                onChange={e => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                placeholder="Straße, PLZ Ort"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-ui-bg-subtle rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Text size="large" weight="plus" className="text-ui-fg-base">
              Artikel
            </Text>
            <Button type="button" variant="secondary" size="small" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Artikel hinzufügen
            </Button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                Keine Artikel vorhanden. Klicken Sie auf "Artikel hinzufügen", um zu beginnen.
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Typ</Table.HeaderCell>
                  <Table.HeaderCell>Titel</Table.HeaderCell>
                  <Table.HeaderCell>Menge</Table.HeaderCell>
                  <Table.HeaderCell>Einheit</Table.HeaderCell>
                  <Table.HeaderCell>Preis</Table.HeaderCell>
                  <Table.HeaderCell>Rabatt %</Table.HeaderCell>
                  <Table.HeaderCell>USt. %</Table.HeaderCell>
                  <Table.HeaderCell>Summe</Table.HeaderCell>
                  <Table.HeaderCell></Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {formData.items.map(item => (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <Select
                        value={item.item_type}
                        onValueChange={value => updateItem(item.id, { item_type: value as 'product' | 'service' })}
                      >
                        <Select.Trigger className="w-24">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="product">Produkt</Select.Item>
                          <Select.Item value="service">Service</Select.Item>
                        </Select.Content>
                      </Select>
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="text"
                        value={item.title}
                        onChange={e => updateItem(item.id, { title: e.target.value })}
                        placeholder="Artikelname"
                        className="w-full"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })}
                        min="1"
                        className="w-20"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="text"
                        value={item.unit}
                        onChange={e => updateItem(item.id, { unit: e.target.value })}
                        placeholder="STK"
                        className="w-16"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updateItem(item.id, { unit_price: Number(e.target.value) })}
                        min="0"
                        step="0.01"
                        className="w-24"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="number"
                        value={item.discount_percentage}
                        onChange={e => updateItem(item.id, { discount_percentage: Number(e.target.value) })}
                        min="0"
                        max="100"
                        className="w-20"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="number"
                        value={item.tax_rate}
                        onChange={e => updateItem(item.id, { tax_rate: Number(e.target.value) })}
                        min="0"
                        max="100"
                        className="w-20"
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" weight="plus">
                        {(calculateItemTotal(item) / 100).toFixed(2)} €
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Button type="button" variant="transparent" size="small" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>

        {/* Totals */}
        {formData.items.length > 0 && (
          <div className="bg-ui-bg-subtle rounded-lg p-6">
            <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
              Gesamtsumme
            </Text>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Zwischensumme:
                </Text>
                <Text size="small" weight="plus">
                  {(totals.subtotal / 100).toFixed(2)} €
                </Text>
              </div>
              <div className="flex justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Umsatzsteuer:
                </Text>
                <Text size="small" weight="plus">
                  {(totals.tax / 100).toFixed(2)} €
                </Text>
              </div>
              <div className="flex justify-between border-t border-ui-border-base pt-2">
                <Text size="base" weight="plus" className="text-ui-fg-base">
                  Gesamtsumme:
                </Text>
                <Text size="base" weight="plus" className="text-ui-fg-base">
                  {(totals.total / 100).toFixed(2)} €
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-ui-bg-subtle rounded-lg p-6">
          <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
            Zusätzliche Informationen
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Interne Notizen
              </Text>
              <Textarea
                value={formData.internal_notes}
                onChange={e => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                placeholder="Notizen für interne Verwendung"
                rows={3}
              />
            </div>

            <div>
              <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                Kundennotizen
              </Text>
              <Textarea
                value={formData.customer_notes}
                onChange={e => setFormData(prev => ({ ...prev, customer_notes: e.target.value }))}
                placeholder="Notizen für den Kunden"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/offers')}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Wird erstellt...' : 'Angebot erstellen'}
          </Button>
        </div>
      </form>
    </Container>
  );
}
