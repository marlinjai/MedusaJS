/**
 * [id]/page.tsx
 * Offer detail page for viewing and editing offers
 * Includes status management, item editing, and comprehensive information display
 */
import { ArrowLeft, Edit, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge, Button, Container, Input, Select, Table, Text, Textarea, toast } from '@medusajs/ui';

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
  available_quantity?: number;
  reserved_quantity?: number;
}

interface Offer {
  id: string;
  offer_number: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'accepted' | 'completed' | 'cancelled';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency_code: string;
  valid_until: string;
  internal_notes: string;
  customer_notes: string;
  created_at: string;
  updated_at: string;
  items: OfferItem[];
  has_reservations: boolean;
}

// Dynamic routes with parameters cannot be added to sidebar menu
// This route is accessed through navigation from the main offers page

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Load offer data
  useEffect(() => {
    if (id) {
      loadOffer();
    }
  }, [id]);

  const loadOffer = async () => {
    try {
      const response = await fetch(`/admin/offers/${id}`);
      if (!response.ok) {
        throw new Error('Angebot nicht gefunden');
      }
      const data = await response.json();
      setOffer(data.offer);
    } catch (error) {
      console.error('Error loading offer:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Laden des Angebots');
      navigate('/admin/offers');
    } finally {
      setLoading(false);
    }
  };

  // Update offer status
  const updateStatus = async (newStatus: string) => {
    if (!offer) return;

    setUpdating(true);
    try {
      const response = await fetch(`/admin/offers/${offer.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fehler beim Aktualisieren des Status');
      }

      const result = await response.json();
      setOffer(result.offer);
      toast.success('Status erfolgreich aktualisiert');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Status');
    } finally {
      setUpdating(false);
    }
  };

  // Get status display text
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Entwurf';
      case 'active':
        return 'Aktiv';
      case 'accepted':
        return 'Angenommen';
      case 'completed':
        return 'Abgeschlossen';
      case 'cancelled':
        return 'Storniert';
      default:
        return status;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'grey' as const;
      case 'active':
        return 'blue' as const;
      case 'accepted':
        return 'green' as const;
      case 'completed':
        return 'green' as const;
      case 'cancelled':
        return 'red' as const;
      default:
        return 'grey' as const;
    }
  };

  // Get available status transitions
  const getAvailableStatusTransitions = (currentStatus: string): string[] => {
    const transitions: { [key: string]: string[] } = {
      draft: ['active', 'cancelled'],
      active: ['accepted', 'cancelled'],
      accepted: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    return transitions[currentStatus] || [];
  };

  // Handle item updates
  const updateItem = (itemId: string, updates: Partial<OfferItem>) => {
    if (!offer) return;

    setOffer(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item => (item.id === itemId ? { ...item, ...updates } : item)),
      };
    });
  };

  // Calculate item total
  const calculateItemTotal = (item: OfferItem): number => {
    const subtotal = item.unit_price * item.quantity;
    const discount = subtotal * (item.discount_percentage / 100);
    return subtotal - discount;
  };

  // Calculate offer totals
  const calculateOfferTotals = () => {
    if (!offer) return { subtotal: 0, tax: 0, total: 0 };

    const subtotal = offer.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const tax = offer.items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + itemTotal * (item.tax_rate / 100);
    }, 0);
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <Text size="small" className="text-ui-fg-muted">
            Wird geladen...
          </Text>
        </div>
      </Container>
    );
  }

  if (!offer) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <Text size="small" className="text-ui-fg-muted">
            Angebot nicht gefunden
          </Text>
        </div>
      </Container>
    );
  }

  const availableTransitions = getAvailableStatusTransitions(offer.status);
  const totals = calculateOfferTotals();

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="small" onClick={() => navigate('/admin/offers')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Text size="xlarge" weight="plus" className="text-ui-fg-base">
                {offer.offer_number}
              </Text>
              <Badge color={getStatusColor(offer.status)}>{getStatusText(offer.status)}</Badge>
              {offer.has_reservations && <Badge color="orange">Reserviert</Badge>}
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {offer.title}
            </Text>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {availableTransitions.length > 0 && (
            <Select onValueChange={updateStatus} disabled={updating}>
              <Select.Trigger>
                <Select.Value placeholder="Status ändern" />
              </Select.Trigger>
              <Select.Content>
                {availableTransitions.map(status => (
                  <Select.Item key={status} value={status}>
                    {getStatusText(status)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          )}
          <Button variant="secondary" size="small" onClick={() => setEditing(!editing)}>
            <Edit className="w-4 h-4 mr-2" />
            {editing ? 'Bearbeitung beenden' : 'Bearbeiten'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-ui-bg-subtle rounded-lg p-6">
            <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
              Grundinformationen
            </Text>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                  Titel
                </Text>
                {editing ? (
                  <Input
                    type="text"
                    value={offer.title}
                    onChange={e => setOffer(prev => (prev ? { ...prev, title: e.target.value } : prev))}
                  />
                ) : (
                  <Text size="small" className="text-ui-fg-base">
                    {offer.title}
                  </Text>
                )}
              </div>

              <div>
                <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                  Gültig bis
                </Text>
                {editing ? (
                  <Input
                    type="date"
                    value={offer.valid_until}
                    onChange={e => setOffer(prev => (prev ? { ...prev, valid_until: e.target.value } : prev))}
                  />
                ) : (
                  <Text size="small" className="text-ui-fg-base">
                    {offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('de-DE') : 'Nicht festgelegt'}
                  </Text>
                )}
              </div>

              <div className="md:col-span-2">
                <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                  Beschreibung
                </Text>
                {editing ? (
                  <Textarea
                    value={offer.description}
                    onChange={e => setOffer(prev => (prev ? { ...prev, description: e.target.value } : prev))}
                    rows={3}
                  />
                ) : (
                  <Text size="small" className="text-ui-fg-base">
                    {offer.description || 'Keine Beschreibung'}
                  </Text>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-ui-bg-subtle rounded-lg p-6">
            <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
              Artikel
            </Text>

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
                  {offer.status === 'active' && <Table.HeaderCell>Verfügbar</Table.HeaderCell>}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {offer.items.map(item => (
                  <Table.Row key={item.id}>
                    <Table.Cell>
                      <Badge color={item.item_type === 'product' ? 'blue' : 'green'}>
                        {item.item_type === 'product' ? 'Produkt' : 'Service'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {editing ? (
                        <Input
                          type="text"
                          value={item.title}
                          onChange={e => updateItem(item.id, { title: e.target.value })}
                          className="w-full"
                        />
                      ) : (
                        <Text size="small" className="text-ui-fg-base">
                          {item.title}
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {editing ? (
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, { quantity: Number(e.target.value) })}
                          min="1"
                          className="w-20"
                        />
                      ) : (
                        <Text size="small" className="text-ui-fg-base">
                          {item.quantity}
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-base">
                        {item.unit}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {editing ? (
                        <Input
                          type="number"
                          value={item.unit_price / 100}
                          onChange={e => updateItem(item.id, { unit_price: Number(e.target.value) * 100 })}
                          min="0"
                          step="0.01"
                          className="w-24"
                        />
                      ) : (
                        <Text size="small" className="text-ui-fg-base">
                          {(item.unit_price / 100).toFixed(2)} €
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-base">
                        {item.discount_percentage}%
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-base">
                        {item.tax_rate}%
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" weight="plus" className="text-ui-fg-base">
                        {(calculateItemTotal(item) / 100).toFixed(2)} €
                      </Text>
                    </Table.Cell>
                    {offer.status === 'active' && (
                      <Table.Cell>
                        <div className="flex flex-col">
                          <Text size="small" className="text-ui-fg-base">
                            {item.available_quantity || 0} verfügbar
                          </Text>
                          {item.reserved_quantity && item.reserved_quantity > 0 && (
                            <Text size="small" className="text-ui-fg-subtle">
                              {item.reserved_quantity} reserviert
                            </Text>
                          )}
                        </div>
                      </Table.Cell>
                    )}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>

          {/* Totals */}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-ui-bg-subtle rounded-lg p-6">
            <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
              Kundeninformationen
            </Text>

            <div className="space-y-3">
              {offer.customer_name && (
                <div>
                  <Text size="small" weight="plus" className="text-ui-fg-base">
                    Name:
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {offer.customer_name}
                  </Text>
                </div>
              )}

              {offer.customer_email && (
                <div>
                  <Text size="small" weight="plus" className="text-ui-fg-base">
                    E-Mail:
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {offer.customer_email}
                  </Text>
                </div>
              )}

              {offer.customer_phone && (
                <div>
                  <Text size="small" weight="plus" className="text-ui-fg-base">
                    Telefon:
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {offer.customer_phone}
                  </Text>
                </div>
              )}

              {offer.customer_address && (
                <div>
                  <Text size="small" weight="plus" className="text-ui-fg-base">
                    Adresse:
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {offer.customer_address}
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-ui-bg-subtle rounded-lg p-6">
            <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
              Wichtige Daten
            </Text>

            <div className="space-y-3">
              <div>
                <Text size="small" weight="plus" className="text-ui-fg-base">
                  Erstellt:
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {new Date(offer.created_at).toLocaleString('de-DE')}
                </Text>
              </div>

              <div>
                <Text size="small" weight="plus" className="text-ui-fg-base">
                  Aktualisiert:
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {new Date(offer.updated_at).toLocaleString('de-DE')}
                </Text>
              </div>

              {offer.valid_until && (
                <div>
                  <Text size="small" weight="plus" className="text-ui-fg-base">
                    Gültig bis:
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {new Date(offer.valid_until).toLocaleDateString('de-DE')}
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-ui-bg-subtle rounded-lg p-6">
            <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
              Aktionen
            </Text>

            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => toast.info('PDF-Generierung wird bald verfügbar sein')}
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF erstellen
              </Button>
            </div>
          </div>

          {/* Notes */}
          {(offer.internal_notes || offer.customer_notes) && (
            <div className="bg-ui-bg-subtle rounded-lg p-6">
              <Text size="large" weight="plus" className="text-ui-fg-base mb-4">
                Notizen
              </Text>

              {offer.internal_notes && (
                <div className="mb-4">
                  <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                    Intern:
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {offer.internal_notes}
                  </Text>
                </div>
              )}

              {offer.customer_notes && (
                <div>
                  <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
                    Kunde:
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {offer.customer_notes}
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
