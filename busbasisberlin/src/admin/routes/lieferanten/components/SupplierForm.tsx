import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, Text, Textarea } from '@medusajs/ui';
import { Controller, FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import LabelSelect from './LabelSelect';

// --- Zod Schema (Complete) ---
const phoneSchema = z.object({
  number: z.string().optional(),
  label: z.string().optional(),
});

const emailSchema = z.object({
  email: z.string().optional(),
  label: z.string().optional(),
});

const contactSchema = z.object({
  salutation: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  department: z.string().optional(),
  phones: z.array(phoneSchema).default([]),
  emails: z.array(emailSchema).default([]),
});

const addressSchema = z.object({
  label: z.string().optional(),
  street: z.string().optional(),
  street_number: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country_name: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  is_default: z.boolean().default(false),
});

const supplierSchema = z.object({
  // Required fields
  company: z.string().min(1, 'Firmenname ist erforderlich'),

  // Basic identification
  company_addition: z.string().optional(),
  supplier_number: z.string().optional(),
  customer_number: z.string().optional(),
  internal_key: z.string().optional(),

  // Business details
  vat_id: z.string().optional(),
  status: z.string().optional(),
  is_active: z.boolean().default(true),
  language: z.string().optional(),
  lead_time: z.number().optional(),

  // Web & notes
  website: z.string().optional(),
  note: z.string().optional(),

  // Bank details
  bank_name: z.string().optional(),
  bank_code: z.string().optional(),
  account_number: z.string().optional(),
  account_holder: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),

  // Related data
  contacts: z.array(contactSchema).default([]),
  addresses: z.array(addressSchema).default([]),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  formId: string;
  initialData?: Partial<SupplierFormValues>;
  supplierId?: string;
  onSubmit: (data: SupplierFormValues) => void;
  isSubmitting: boolean;
}

// Predefined label options
const PHONE_LABELS = ['Mobil', 'Festnetz', 'Primär', 'Sekundär'];
const EMAIL_LABELS = ['Primär', 'Sekundär', 'Rechnung', 'Support'];
const ADDRESS_LABELS = ['Hauptsitz', 'Lager 1', 'Lager 2', 'Büro', 'Werkstatt'];

// Separate component for contact to avoid hooks violations
const ContactForm = ({
  contactIndex,
  control,
  removeContact,
}: {
  contactIndex: number;
  control: any;
  removeContact: (index: number) => void;
}) => {
  // These hooks are now called at the top level of this component
  const phoneArray = useFieldArray({ control, name: `contacts.${contactIndex}.phones` });
  const emailArray = useFieldArray({ control, name: `contacts.${contactIndex}.emails` });

  return (
    <div className="border rounded-md p-4 mb-4 bg-ui-bg-subtle">
      <div className="flex items-center justify-between mb-2">
        <Text className="font-semibold">Kontaktinformation {contactIndex + 1}</Text>
        <Button type="button" size="small" variant="danger" onClick={() => removeContact(contactIndex)}>
          Entfernen
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div>
          <Label>Anrede</Label>
          <Controller
            control={control}
            name={`contacts.${contactIndex}.salutation`}
            render={({ field }) => (
              <select {...field} className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field">
                <option value="">Anrede wählen</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
              </select>
            )}
          />
        </div>
        <div>
          <Label>Abteilung</Label>
          <Controller
            control={control}
            name={`contacts.${contactIndex}.department`}
            render={({ field }) => <Input placeholder="Abteilung" {...field} />}
          />
        </div>
        <div>
          <Label>Vorname</Label>
          <Controller
            control={control}
            name={`contacts.${contactIndex}.first_name`}
            render={({ field }) => <Input placeholder="Vorname" {...field} />}
          />
        </div>
        <div>
          <Label>Nachname</Label>
          <Controller
            control={control}
            name={`contacts.${contactIndex}.last_name`}
            render={({ field }) => <Input placeholder="Nachname" {...field} />}
          />
        </div>
      </div>

      {/* Phone Numbers */}
      <div className="mb-2">
        <Text className="font-semibold mb-1">Telefonnummern</Text>
        {phoneArray.fields.map((phone, pIdx) => (
          <div key={phone.id} className="flex gap-2 mb-1">
            <Controller
              control={control}
              name={`contacts.${contactIndex}.phones.${pIdx}.number`}
              render={({ field }) => <Input placeholder="Nummer" {...field} />}
            />
            <Controller
              control={control}
              name={`contacts.${contactIndex}.phones.${pIdx}.label`}
              render={({ field }) => (
                <LabelSelect
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={PHONE_LABELS}
                  placeholder="Label wählen"
                />
              )}
            />
            {phoneArray.fields.length > 1 && (
              <Button type="button" size="small" variant="danger" onClick={() => phoneArray.remove(pIdx)}>
                Entfernen
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          size="small"
          variant="secondary"
          onClick={() => phoneArray.append({ number: '', label: '' })}
        >
          Telefonnummer hinzufügen
        </Button>
      </div>

      {/* Emails */}
      <div className="mb-2">
        <Text className="font-semibold mb-1">E-Mail-Adressen</Text>
        {emailArray.fields.map((email, eIdx) => (
          <div key={email.id} className="flex gap-2 mb-1">
            <Controller
              control={control}
              name={`contacts.${contactIndex}.emails.${eIdx}.email`}
              render={({ field }) => <Input placeholder="E-Mail" {...field} />}
            />
            <Controller
              control={control}
              name={`contacts.${contactIndex}.emails.${eIdx}.label`}
              render={({ field }) => (
                <LabelSelect
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={EMAIL_LABELS}
                  placeholder="Label wählen"
                />
              )}
            />
            {emailArray.fields.length > 1 && (
              <Button type="button" size="small" variant="danger" onClick={() => emailArray.remove(eIdx)}>
                Entfernen
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          size="small"
          variant="secondary"
          onClick={() => emailArray.append({ email: '', label: '' })}
        >
          E-Mail-Adresse hinzufügen
        </Button>
      </div>
    </div>
  );
};

const SupplierForm = ({ formId, initialData, onSubmit, isSubmitting }: SupplierFormProps) => {
  // Complete default values matching the schema
  const defaultValues: SupplierFormValues = {
    company: '',
    company_addition: '',
    supplier_number: '',
    customer_number: '',
    internal_key: '',
    vat_id: '',
    status: 'active',
    is_active: true,
    language: 'Deutsch',
    lead_time: undefined,
    website: '',
    note: '',
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_holder: '',
    iban: '',
    bic: '',
    contacts: [],
    addresses: [],
  };

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: initialData ? { ...defaultValues, ...initialData } : defaultValues,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  // Contacts and addresses arrays
  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({ control, name: 'contacts' });

  const {
    fields: addressFields,
    append: appendAddress,
    remove: removeAddress,
  } = useFieldArray({ control, name: 'addresses' });

  return (
    <FormProvider {...form}>
      <form id={formId} onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-base font-semibold mb-4">Grundinformationen</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">
                  Firmenname <span className="text-ui-fg-error">*</span>
                </Label>
                <Controller
                  control={control}
                  name="company"
                  render={({ field }) => (
                    <Input
                      id="company"
                      placeholder="Firmenname eingeben"
                      {...field}
                      className={errors.company ? 'border-ui-error' : ''}
                    />
                  )}
                />
                {errors.company && <Text className="text-ui-fg-error text-xs mt-1">{errors.company.message}</Text>}
              </div>
              <div>
                <Label htmlFor="company_addition">Firmenzusatz</Label>
                <Controller
                  control={control}
                  name="company_addition"
                  render={({ field }) => <Input id="company_addition" placeholder="Firmenzusatz" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="supplier_number">Lieferantennummer</Label>
                <Controller
                  control={control}
                  name="supplier_number"
                  render={({ field }) => <Input id="supplier_number" placeholder="Lieferantennummer" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="customer_number">Kundennummer</Label>
                <Controller
                  control={control}
                  name="customer_number"
                  render={({ field }) => <Input id="customer_number" placeholder="Kundennummer" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="internal_key">Interner Schlüssel</Label>
                <Controller
                  control={control}
                  name="internal_key"
                  render={({ field }) => <Input id="internal_key" placeholder="Interner Schlüssel" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="vat_id">USt-ID</Label>
                <Controller
                  control={control}
                  name="vat_id"
                  render={({ field }) => <Input id="vat_id" placeholder="USt-ID" {...field} />}
                />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div>
            <h2 className="text-base font-semibold mb-4">Geschäftsdetails</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <select
                      {...field}
                      id="status"
                      className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field"
                    >
                      <option value="active">Aktiv</option>
                      <option value="inactive">Inaktiv</option>
                      <option value="pending">Ausstehend</option>
                    </select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="language">Sprache</Label>
                <Controller
                  control={control}
                  name="language"
                  render={({ field }) => (
                    <select
                      {...field}
                      id="language"
                      className="w-full px-3 py-2 border border-ui-border-base rounded-md bg-ui-bg-field"
                    >
                      <option value="Deutsch">Deutsch</option>
                      <option value="English">English</option>
                      <option value="Français">Français</option>
                      <option value="Italiano">Italiano</option>
                      <option value="Español">Español</option>
                      <option value="Português">Português</option>
                      <option value="Русский">Русский</option>
                      <option value="中文">中文</option>
                      <option value="日本語">日本語</option>
                      <option value="한국어">한국어</option>
                    </select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="lead_time">Lieferzeit (Tage)</Label>
                <Controller
                  control={control}
                  name="lead_time"
                  render={({ field }) => (
                    <Input
                      id="lead_time"
                      type="number"
                      placeholder="Lieferzeit in Tagen"
                      {...field}
                      value={field.value || ''}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  )}
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Controller
                  control={control}
                  name="website"
                  render={({ field }) => <Input id="website" placeholder="https://..." {...field} />}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="is_active" className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded border-ui-border-base"
                    />
                  )}
                />
                Lieferant ist aktiv
              </Label>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h2 className="text-base font-semibold mb-4">Bankdaten</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank_name">Bankname</Label>
                <Controller
                  control={control}
                  name="bank_name"
                  render={({ field }) => <Input id="bank_name" placeholder="Bankname" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="bank_code">Bankleitzahl</Label>
                <Controller
                  control={control}
                  name="bank_code"
                  render={({ field }) => <Input id="bank_code" placeholder="BLZ" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="account_number">Kontonummer</Label>
                <Controller
                  control={control}
                  name="account_number"
                  render={({ field }) => <Input id="account_number" placeholder="Kontonummer" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="account_holder">Kontoinhaber</Label>
                <Controller
                  control={control}
                  name="account_holder"
                  render={({ field }) => <Input id="account_holder" placeholder="Kontoinhaber" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="iban">IBAN</Label>
                <Controller
                  control={control}
                  name="iban"
                  render={({ field }) => <Input id="iban" placeholder="IBAN" {...field} />}
                />
              </div>
              <div>
                <Label htmlFor="bic">BIC</Label>
                <Controller
                  control={control}
                  name="bic"
                  render={({ field }) => <Input id="bic" placeholder="BIC" {...field} />}
                />
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          <div>
            <h2 className="text-base font-semibold mb-4">Kontaktinformationen</h2>
            {contactFields.map((contact, cIdx) => (
              <ContactForm key={contact.id} contactIndex={cIdx} control={control} removeContact={removeContact} />
            ))}
            <Button
              type="button"
              size="small"
              variant="primary"
              onClick={() => {
                console.log('Adding new contact...');
                try {
                  appendContact({
                    salutation: '',
                    first_name: '',
                    last_name: '',
                    department: '',
                    phones: [{ number: '', label: '' }], // Start with one empty phone
                    emails: [{ email: '', label: '' }], // Start with one empty email
                  });
                  console.log('Contact added successfully');
                } catch (error) {
                  console.error('Error adding contact:', error);
                }
              }}
            >
              Kontaktinformation hinzufügen
            </Button>
          </div>

          {/* Addresses Section */}
          <div>
            <h2 className="text-base font-semibold mb-4">Adressen</h2>
            {addressFields.map((address, aIdx) => (
              <div key={address.id} className="border rounded-md p-4 mb-4 bg-ui-bg-subtle">
                <div className="flex items-center justify-between mb-2">
                  <Text className="font-semibold">Adresse {aIdx + 1}</Text>
                  <Button type="button" size="small" variant="danger" onClick={() => removeAddress(aIdx)}>
                    Entfernen
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Label</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.label`}
                      render={({ field }) => (
                        <LabelSelect
                          value={field.value || ''}
                          onChange={field.onChange}
                          options={ADDRESS_LABELS}
                          placeholder="Label wählen"
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-center">
                    <Label className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name={`addresses.${aIdx}.is_default`}
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded border-ui-border-base"
                          />
                        )}
                      />
                      Standard-Adresse
                    </Label>
                  </div>
                  <div>
                    <Label>Straße</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.street`}
                      render={({ field }) => <Input placeholder="Straße" {...field} />}
                    />
                  </div>
                  <div>
                    <Label>Hausnummer</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.street_number`}
                      render={({ field }) => <Input placeholder="Hausnummer" {...field} />}
                    />
                  </div>
                  <div>
                    <Label>PLZ</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.postal_code`}
                      render={({ field }) => <Input placeholder="PLZ" {...field} />}
                    />
                  </div>
                  <div>
                    <Label>Stadt</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.city`}
                      render={({ field }) => <Input placeholder="Stadt" {...field} />}
                    />
                  </div>
                  <div>
                    <Label>Land</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.country_name`}
                      render={({ field }) => <Input placeholder="Land" {...field} />}
                    />
                  </div>
                  <div>
                    <Label>Bundesland</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.state`}
                      render={({ field }) => <Input placeholder="Bundesland" {...field} />}
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.phone`}
                      render={({ field }) => <Input placeholder="Telefon" {...field} />}
                    />
                  </div>
                  <div>
                    <Label>E-Mail</Label>
                    <Controller
                      control={control}
                      name={`addresses.${aIdx}.email`}
                      render={({ field }) => <Input placeholder="E-Mail" {...field} />}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              size="small"
              variant="primary"
              onClick={() =>
                appendAddress({
                  label: '',
                  street: '',
                  street_number: '',
                  postal_code: '',
                  city: '',
                  country_name: '',
                  state: '',
                  phone: '',
                  email: '',
                  is_default: false,
                })
              }
            >
              Adresse hinzufügen
            </Button>
          </div>

          {/* Notes */}
          <div>
            <h2 className="text-base font-semibold mb-4">Notizen</h2>
            <div>
              <Label htmlFor="note">Anmerkungen</Label>
              <Controller
                control={control}
                name="note"
                render={({ field }) => <Textarea id="note" placeholder="Anmerkungen..." {...field} rows={3} />}
              />
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default SupplierForm;
