import { ArrowLeft } from '@medusajs/icons';
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  StatusBadge,
  Text,
  Textarea,
  usePrompt,
} from '@medusajs/ui';
import { useEffect, useState } from 'react';
import type { Supplier } from '../../../../modules/supplier/models/supplier';

interface SupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSubmit: (data: Partial<Supplier>) => void;
  isSubmitting: boolean;
}

const SupplierModal = ({ open, onOpenChange, supplier, onSubmit, isSubmitting }: SupplierModalProps) => {
  const [formData, setFormData] = useState<Partial<Supplier>>({
    company: '',
    company_addition: '',
    supplier_number: '',
    customer_number: '',
    internal_key: '',
    email: '',
    phone_mobile: '',
    phone_direct: '',
    website: '',
    street: '',
    postal_code: '',
    city: '',
    country: '',
    vat_id: '',
    status: 'active',
    contact_salutation: '',
    contact_first_name: '',
    contact_last_name: '',
    contact_phone: '',
    contact_mobile: '',
    contact_fax: '',
    contact_email: '',
    contact_department: '',
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_holder: '',
    iban: '',
    bic: '',
    note: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const prompt = usePrompt();

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'auto';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.pointerEvents = 'auto';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.pointerEvents = 'auto';
    };
  }, [open]);

  useEffect(() => {
    if (supplier) {
      setFormData(supplier);
    } else {
      setFormData({
        company: '',
        company_addition: '',
        supplier_number: '',
        customer_number: '',
        internal_key: '',
        email: '',
        phone_mobile: '',
        phone_direct: '',
        website: '',
        street: '',
        postal_code: '',
        city: '',
        country: '',
        vat_id: '',
        status: 'active',
        contact_salutation: '',
        contact_first_name: '',
        contact_last_name: '',
        contact_phone: '',
        contact_mobile: '',
        contact_fax: '',
        contact_email: '',
        contact_department: '',
        bank_name: '',
        bank_code: '',
        account_number: '',
        account_holder: '',
        iban: '',
        bic: '',
        note: '',
      });
    }
    setErrors({});
  }, [supplier, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company?.trim()) {
      newErrors.company = 'Firmenname ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const shouldSave = await prompt({
      title: supplier ? 'Änderungen speichern?' : 'Lieferant erstellen?',
      description: supplier
        ? 'Möchten Sie die Änderungen am Lieferanten speichern?'
        : 'Möchten Sie einen neuen Lieferanten erstellen?',
    });

    if (shouldSave) {
      onSubmit(formData);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ pointerEvents: 'auto' }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Modal */}
      <div className="relative w-full h-full flex flex-col bg-ui-bg-base shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b border-ui-border-base px-8 py-6 bg-ui-bg-base sticky top-0 z-10">
          <div className="flex items-center gap-x-4">
            <IconButton size="small" variant="transparent" onClick={() => onOpenChange(false)}>
              <ArrowLeft />
            </IconButton>
            <div>
              <Heading level="h1" className="mb-1">
                {supplier ? 'Lieferant bearbeiten' : 'Neuer Lieferant'}
              </Heading>
              {supplier && (
                <div className="flex items-center gap-2">
                  <StatusBadge color={supplier.status === 'active' ? 'green' : 'red'}>
                    {supplier.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                  </StatusBadge>
                  <Text className="text-ui-fg-subtle">{supplier.company}</Text>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-x-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
              {supplier ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto bg-ui-bg-subtle">
          <Container className="max-w-[800px] mx-auto py-8">
            <div className="bg-ui-bg-base p-8 border border-ui-border-base rounded-lg shadow-sm">
              {/* Basic Information */}
              <div className="mb-8">
                <Heading level="h2" className="mb-4">
                  Grundinformationen
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="company">
                      Firmenname <span className="text-ui-fg-error">*</span>
                    </Label>
                    <Input
                      id="company"
                      placeholder="Firmenname eingeben"
                      value={formData.company || ''}
                      onChange={e => handleInputChange('company', e.target.value)}
                      className={errors.company ? 'border-ui-error' : ''}
                    />
                    {errors.company && <Text className="text-ui-fg-error text-xs mt-1">{errors.company}</Text>}
                  </div>
                  <div>
                    <Label htmlFor="company_addition">Firmenzusatz</Label>
                    <Input
                      id="company_addition"
                      placeholder="Firmenzusatz"
                      value={formData.company_addition || ''}
                      onChange={e => handleInputChange('company_addition', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vat_id">USt-ID</Label>
                    <Input
                      id="vat_id"
                      placeholder="USt-ID"
                      value={formData.vat_id || ''}
                      onChange={e => handleInputChange('vat_id', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_number">Lieferantennummer</Label>
                    <Input
                      id="supplier_number"
                      placeholder="Lieferantennummer"
                      value={formData.supplier_number || ''}
                      onChange={e => handleInputChange('supplier_number', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_number">Kundennummer</Label>
                    <Input
                      id="customer_number"
                      placeholder="Kundennummer"
                      value={formData.customer_number || ''}
                      onChange={e => handleInputChange('customer_number', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="internal_key">Interner Schlüssel</Label>
                    <Input
                      id="internal_key"
                      placeholder="Interner Schlüssel"
                      value={formData.internal_key || ''}
                      onChange={e => handleInputChange('internal_key', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      placeholder="https://example.com"
                      value={formData.website || ''}
                      onChange={e => handleInputChange('website', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-8">
                <Heading level="h2" className="mb-4">
                  Kontaktinformationen
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">E-Mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="E-Mail Adresse"
                      value={formData.email || ''}
                      onChange={e => handleInputChange('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone_mobile">Telefon (Mobil)</Label>
                    <Input
                      id="phone_mobile"
                      placeholder="Mobilnummer"
                      value={formData.phone_mobile || ''}
                      onChange={e => handleInputChange('phone_mobile', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone_direct">Telefon (Durchwahl)</Label>
                    <Input
                      id="phone_direct"
                      placeholder="Durchwahl"
                      value={formData.phone_direct || ''}
                      onChange={e => handleInputChange('phone_direct', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Contact Person */}
              <div className="mb-8">
                <Heading level="h2" className="mb-4">
                  Zusätzliche Kontaktperson
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_salutation">Anrede</Label>
                    <Select
                      value={formData.contact_salutation || 'none'}
                      onValueChange={value => handleInputChange('contact_salutation', value === 'none' ? '' : value)}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Anrede wählen" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="none">Keine Anrede</Select.Item>
                        <Select.Item value="Herr">Herr</Select.Item>
                        <Select.Item value="Frau">Frau</Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="contact_department">Abteilung</Label>
                    <Input
                      id="contact_department"
                      placeholder="Abteilung"
                      value={formData.contact_department || ''}
                      onChange={e => handleInputChange('contact_department', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_first_name">Vorname</Label>
                    <Input
                      id="contact_first_name"
                      placeholder="Vorname"
                      value={formData.contact_first_name || ''}
                      onChange={e => handleInputChange('contact_first_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_last_name">Nachname</Label>
                    <Input
                      id="contact_last_name"
                      placeholder="Nachname"
                      value={formData.contact_last_name || ''}
                      onChange={e => handleInputChange('contact_last_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_email">E-Mail</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      placeholder="E-Mail Adresse"
                      value={formData.contact_email || ''}
                      onChange={e => handleInputChange('contact_email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Telefon</Label>
                    <Input
                      id="contact_phone"
                      placeholder="Telefonnummer"
                      value={formData.contact_phone || ''}
                      onChange={e => handleInputChange('contact_phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_mobile">Mobil</Label>
                    <Input
                      id="contact_mobile"
                      placeholder="Mobilnummer"
                      value={formData.contact_mobile || ''}
                      onChange={e => handleInputChange('contact_mobile', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_fax">Fax</Label>
                    <Input
                      id="contact_fax"
                      placeholder="Faxnummer"
                      value={formData.contact_fax || ''}
                      onChange={e => handleInputChange('contact_fax', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="mb-8">
                <Heading level="h2" className="mb-4">
                  Adresse
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="street">Straße</Label>
                    <Input
                      id="street"
                      placeholder="Straße und Hausnummer"
                      value={formData.street || ''}
                      onChange={e => handleInputChange('street', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">PLZ</Label>
                    <Input
                      id="postal_code"
                      placeholder="Postleitzahl"
                      value={formData.postal_code || ''}
                      onChange={e => handleInputChange('postal_code', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Stadt</Label>
                    <Input
                      id="city"
                      placeholder="Stadt"
                      value={formData.city || ''}
                      onChange={e => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="country">Land</Label>
                    <Input
                      id="country"
                      placeholder="Land"
                      value={formData.country || ''}
                      onChange={e => handleInputChange('country', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Bank Information */}
              <div className="mb-8">
                <Heading level="h2" className="mb-4">
                  Bankdaten
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_name">Bankname</Label>
                    <Input
                      id="bank_name"
                      placeholder="Name der Bank"
                      value={formData.bank_name || ''}
                      onChange={e => handleInputChange('bank_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_code">Bankleitzahl</Label>
                    <Input
                      id="bank_code"
                      placeholder="Bankleitzahl"
                      value={formData.bank_code || ''}
                      onChange={e => handleInputChange('bank_code', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_number">Kontonummer</Label>
                    <Input
                      id="account_number"
                      placeholder="Kontonummer"
                      value={formData.account_number || ''}
                      onChange={e => handleInputChange('account_number', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_holder">Kontoinhaber</Label>
                    <Input
                      id="account_holder"
                      placeholder="Kontoinhaber"
                      value={formData.account_holder || ''}
                      onChange={e => handleInputChange('account_holder', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      placeholder="IBAN"
                      value={formData.iban || ''}
                      onChange={e => handleInputChange('iban', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bic">BIC</Label>
                    <Input
                      id="bic"
                      placeholder="BIC/SWIFT"
                      value={formData.bic || ''}
                      onChange={e => handleInputChange('bic', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="mb-8">
                <Heading level="h2" className="mb-4">
                  Einstellungen
                </Heading>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status || 'active'}
                      onValueChange={value => handleInputChange('status', value)}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="active">Aktiv</Select.Item>
                        <Select.Item value="inactive">Inaktiv</Select.Item>
                        <Select.Item value="pending">Ausstehend</Select.Item>
                        <Select.Item value="blocked">Gesperrt</Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Heading level="h2" className="mb-4">
                  Notizen
                </Heading>
                <div>
                  <Label htmlFor="note">Interne Notizen</Label>
                  <Textarea
                    id="note"
                    placeholder="Zusätzliche Notizen..."
                    value={formData.note || ''}
                    onChange={e => handleInputChange('note', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </Container>
        </div>
      </div>
    </div>
  );
};

export default SupplierModal;
