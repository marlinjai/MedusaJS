import { Input, Label, Text, Textarea } from '@medusajs/ui';
import { useEffect, useState } from 'react';

import type { Supplier } from '../../../../modules/supplier/models/supplier';

interface SupplierFormProps {
  formId: string;
  initialData?: Partial<Supplier> | null;
  onSubmit: (data: Partial<Supplier>) => void;
  isSubmitting: boolean;
}

const SupplierForm = ({ formId, initialData, onSubmit, isSubmitting }: SupplierFormProps) => {
  const [formData, setFormData] = useState<Partial<Supplier>>({
    company: '',
    company_addition: '',
    supplier_number: '',
    customer_number: '',
    internal_key: '',
    email: '',
    phone: '',
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

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit(formData);
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <div className="p-6 space-y-8">
        {/* Basic Information */}
        <div>
          <h2 className="text-base font-semibold mb-4">Grundinformationen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">
                Firmenname <span className="text-ui-fg-error">*</span>
              </Label>
              <Input
                id="company"
                placeholder="Firmenname eingeben"
                value={formData.company || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('company', e.target.value)}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('company_addition', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="vat_id">USt-ID</Label>
              <Input
                id="vat_id"
                placeholder="USt-ID"
                value={formData.vat_id || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vat_id', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="supplier_number">Lieferantennummer</Label>
              <Input
                id="supplier_number"
                placeholder="Lieferantennummer"
                value={formData.supplier_number || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('supplier_number', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="customer_number">Kundennummer</Label>
              <Input
                id="customer_number"
                placeholder="Kundennummer"
                value={formData.customer_number || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('customer_number', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="internal_key">Interner Schlüssel</Label>
              <Input
                id="internal_key"
                placeholder="Interner Schlüssel"
                value={formData.internal_key || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('internal_key', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                value={formData.website || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('website', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h2 className="text-base font-semibold mb-4">Kontaktinformationen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="E-Mail Adresse"
                value={formData.email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon (Mobil)</Label>
              <Input
                id="phone"
                placeholder="Mobilnummer"
                value={formData.phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('phone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone_direct">Telefon (Durchwahl)</Label>
              <Input
                id="phone_direct"
                placeholder="Durchwahl"
                value={formData.phone_direct || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('phone_direct', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Additional Contact Person */}
        <div>
          <h2 className="text-base font-semibold mb-4">Zusätzliche Kontaktperson</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_salutation">Anrede</Label>
              <select
                id="contact_salutation"
                value={formData.contact_salutation || 'none'}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleInputChange('contact_salutation', e.target.value === 'none' ? '' : e.target.value)
                }
                className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-subtle hover:bg-ui-bg-field-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive focus:border-ui-border-interactive"
              >
                <option value="none">Keine Anrede</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
              </select>
            </div>
            <div>
              <Label htmlFor="contact_department">Abteilung</Label>
              <Input
                id="contact_department"
                placeholder="Abteilung"
                value={formData.contact_department || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('contact_department', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contact_first_name">Vorname</Label>
              <Input
                id="contact_first_name"
                placeholder="Vorname"
                value={formData.contact_first_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('contact_first_name', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contact_last_name">Nachname</Label>
              <Input
                id="contact_last_name"
                placeholder="Nachname"
                value={formData.contact_last_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('contact_last_name', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contact_email">E-Mail</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="E-Mail Adresse"
                value={formData.contact_email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('contact_email', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Telefon</Label>
              <Input
                id="contact_phone"
                placeholder="Telefonnummer"
                value={formData.contact_phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('contact_phone', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contact_mobile">Mobil</Label>
              <Input
                id="contact_mobile"
                placeholder="Mobilnummer"
                value={formData.contact_mobile || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('contact_mobile', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="contact_fax">Fax</Label>
              <Input
                id="contact_fax"
                placeholder="Faxnummer"
                value={formData.contact_fax || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('contact_fax', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h2 className="text-base font-semibold mb-4">Adresse</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="street">Straße</Label>
              <Input
                id="street"
                placeholder="Straße und Hausnummer"
                value={formData.street || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('street', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="postal_code">PLZ</Label>
              <Input
                id="postal_code"
                placeholder="Postleitzahl"
                value={formData.postal_code || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('postal_code', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="city">Stadt</Label>
              <Input
                id="city"
                placeholder="Stadt"
                value={formData.city || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('city', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="country">Land</Label>
              <Input
                id="country"
                placeholder="Land"
                value={formData.country || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('country', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div>
          <h2 className="text-base font-semibold mb-4">Bankdaten</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank_name">Bankname</Label>
              <Input
                id="bank_name"
                placeholder="Name der Bank"
                value={formData.bank_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('bank_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bank_code">Bankleitzahl</Label>
              <Input
                id="bank_code"
                placeholder="Bankleitzahl"
                value={formData.bank_code || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('bank_code', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="account_number">Kontonummer</Label>
              <Input
                id="account_number"
                placeholder="Kontonummer"
                value={formData.account_number || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('account_number', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="account_holder">Kontoinhaber</Label>
              <Input
                id="account_holder"
                placeholder="Kontoinhaber"
                value={formData.account_holder || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('account_holder', e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                placeholder="IBAN"
                value={formData.iban || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('iban', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bic">BIC</Label>
              <Input
                id="bic"
                placeholder="BIC/SWIFT"
                value={formData.bic || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('bic', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div>
          <h2 className="text-base font-semibold mb-4">Einstellungen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status || 'active'}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-subtle hover:bg-ui-bg-field-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive focus:border-ui-border-interactive"
              >
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
                <option value="pending">Ausstehend</option>
                <option value="blocked">Gesperrt</option>
              </select>
              <Text className="text-xs text-ui-fg-muted mt-1">Aktueller Status: {formData.status || 'active'}</Text>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h2 className="text-base font-semibold mb-4">Notizen</h2>
          <div>
            <Label htmlFor="note">Interne Notizen</Label>
            <Textarea
              id="note"
              placeholder="Zusätzliche Notizen..."
              value={formData.note || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('note', e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default SupplierForm;
