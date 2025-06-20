import { X } from '@medusajs/icons';
import { Button, IconButton, Input, Label, StatusBadge, Text, Textarea } from '@medusajs/ui';
import { useEffect, useState } from 'react';

import type { Service } from '../../../../modules/service/models/service';

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSubmit: (data: Partial<Service>) => void;
  isSubmitting: boolean;
}

const ServiceModal = ({ open, onOpenChange, service, onSubmit, isSubmitting }: ServiceModalProps) => {
  const [formData, setFormData] = useState<Partial<Service>>({
    title: '',
    description: '',
    short_description: '',
    category: '',
    service_type: '',
    base_price: null,
    hourly_rate: null,
    currency_code: 'EUR',
    estimated_duration: null,
    is_active: true,
    is_featured: false,
    requires_vehicle: false,
    requires_diagnosis: false,
    requires_approval: false,
    requirements: '',
    notes: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (service) {
      setFormData(service);
    } else {
      setFormData({
        title: '',
        description: '',
        short_description: '',
        category: '',
        service_type: '',
        base_price: null,
        hourly_rate: null,
        currency_code: 'EUR',
        estimated_duration: null,
        is_active: true,
        is_featured: false,
        requires_vehicle: false,
        requires_diagnosis: false,
        requires_approval: false,
        requirements: '',
        notes: '',
        status: 'active',
      });
    }
    setErrors({});
  }, [service, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onSubmit(formData);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-25 z-40" onClick={handleBackdropClick} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-ui-bg-base border-l border-ui-border-base shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-ui-border-base flex-shrink-0">
            <div className="flex items-center gap-x-3">
              <div>
                <h1 className="text-lg font-semibold">
                  {service ? 'Dienstleistung bearbeiten' : 'Neue Dienstleistung'}
                </h1>
                {service && (
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge color={service.status === 'active' ? 'green' : 'red'}>
                      {service.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                    </StatusBadge>
                    <Text className="text-ui-fg-subtle text-sm">{service.title}</Text>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-x-2">
              <Button variant="secondary" size="small" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button variant="primary" size="small" onClick={handleSubmit} isLoading={isSubmitting}>
                {service ? 'Speichern' : 'Erstellen'}
              </Button>
              <IconButton size="small" variant="transparent" onClick={() => onOpenChange(false)}>
                <X />
              </IconButton>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-8">
              {/* Basic Information */}
              <div>
                <h2 className="text-base font-semibold mb-4">Grundinformationen</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="title">
                      Titel <span className="text-ui-fg-error">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="z.B. Motorwartung"
                      value={formData.title || ''}
                      onChange={(e: { target: { value: any } }) => handleInputChange('title', e.target.value)}
                      className={errors.title ? 'border-ui-error' : ''}
                    />
                    {errors.title && <Text className="text-ui-fg-error text-xs mt-1">{errors.title}</Text>}
                  </div>
                  <div>
                    <Label htmlFor="short_description">Kurzbeschreibung</Label>
                    <Input
                      id="short_description"
                      placeholder="Kurze Beschreibung der Dienstleistung"
                      value={formData.short_description || ''}
                      onChange={(e: { target: { value: any } }) =>
                        handleInputChange('short_description', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea
                      id="description"
                      placeholder="Detaillierte Beschreibung der Dienstleistung"
                      rows={4}
                      value={formData.description || ''}
                      onChange={(e: { target: { value: any } }) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Kategorie</Label>
                      <select
                        id="category"
                        className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field"
                        value={formData.category || ''}
                        onChange={e => handleInputChange('category', e.target.value)}
                      >
                        <option value="">Kategorie auswählen</option>
                        <option value="Wartung">Wartung</option>
                        <option value="Reparatur">Reparatur</option>
                        <option value="Diagnose">Diagnose</option>
                        <option value="Beratung">Beratung</option>
                        <option value="Inspektion">Inspektion</option>
                        <option value="Reinigung">Reinigung</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="service_type">Service-Typ</Label>
                      <select
                        id="service_type"
                        className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field"
                        value={formData.service_type || ''}
                        onChange={e => handleInputChange('service_type', e.target.value)}
                      >
                        <option value="">Typ auswählen</option>
                        <option value="Stunden">Stunden</option>
                        <option value="Pauschal">Pauschal</option>
                        <option value="Material">Material</option>
                        <option value="Kombiniert">Kombiniert</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h2 className="text-base font-semibold mb-4">Preise</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="base_price">Grundpreis (€)</Label>
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.base_price ? (formData.base_price / 100).toString() : ''}
                        onChange={(e: { target: { value: any } }) => {
                          const value = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null;
                          handleInputChange('base_price', value);
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly_rate">Stundensatz (€)</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.hourly_rate ? (formData.hourly_rate / 100).toString() : ''}
                        onChange={(e: { target: { value: any } }) => {
                          const value = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null;
                          handleInputChange('hourly_rate', value);
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimated_duration">Geschätzte Dauer (Minuten)</Label>
                      <Input
                        id="estimated_duration"
                        type="number"
                        placeholder="120"
                        value={formData.estimated_duration?.toString() || ''}
                        onChange={(e: { target: { value: any } }) => {
                          const value = e.target.value ? parseInt(e.target.value) : null;
                          handleInputChange('estimated_duration', value);
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency_code">Währung</Label>
                      <select
                        id="currency_code"
                        className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field"
                        value={formData.currency_code || 'EUR'}
                        onChange={e => handleInputChange('currency_code', e.target.value)}
                      >
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h2 className="text-base font-semibold mb-4">Anforderungen</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requires_vehicle"
                        checked={formData.requires_vehicle || false}
                        onChange={e => handleInputChange('requires_vehicle', e.target.checked)}
                        className="rounded border-ui-border-base"
                      />
                      <Label htmlFor="requires_vehicle">Fahrzeug erforderlich</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requires_diagnosis"
                        checked={formData.requires_diagnosis || false}
                        onChange={e => handleInputChange('requires_diagnosis', e.target.checked)}
                        className="rounded border-ui-border-base"
                      />
                      <Label htmlFor="requires_diagnosis">Diagnose erforderlich</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requires_approval"
                        checked={formData.requires_approval || false}
                        onChange={e => handleInputChange('requires_approval', e.target.checked)}
                        className="rounded border-ui-border-base"
                      />
                      <Label htmlFor="requires_approval">Genehmigung erforderlich</Label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="requirements">Anforderungen</Label>
                    <Textarea
                      id="requirements"
                      placeholder="Was wird für diese Dienstleistung benötigt?"
                      rows={3}
                      value={formData.requirements || ''}
                      onChange={(e: { target: { value: any } }) => handleInputChange('requirements', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Status & Settings */}
              <div>
                <h2 className="text-base font-semibold mb-4">Status & Einstellungen</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field"
                        value={formData.status || 'active'}
                        onChange={e => handleInputChange('status', e.target.value)}
                      >
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                        <option value="draft">Entwurf</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active || false}
                        onChange={e => handleInputChange('is_active', e.target.checked)}
                        className="rounded border-ui-border-base"
                      />
                      <Label htmlFor="is_active">Aktiv</Label>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_featured"
                      checked={formData.is_featured || false}
                      onChange={e => handleInputChange('is_featured', e.target.checked)}
                      className="rounded border-ui-border-base"
                    />
                    <Label htmlFor="is_featured">Empfohlen</Label>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notizen</Label>
                    <Textarea
                      id="notes"
                      placeholder="Interne Notizen"
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e: { target: { value: any } }) => handleInputChange('notes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ServiceModal;
