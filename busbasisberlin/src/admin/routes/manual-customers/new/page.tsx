// busbasisberlin/src/admin/routes/manual-customers/new/page.tsx
// Create Manual Customer page (Medusa admin UI pattern, all fields, grouped sections)
import { defineRouteConfig } from '@medusajs/admin-sdk';
import {
	Button,
	Container,
	Input,
	Select,
	Text,
	Textarea,
	toast,
} from '@medusajs/ui';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const config = defineRouteConfig({
	label: 'Neuer manueller Kunde',
});

// All fields from the manual customer model
type ManualCustomerForm = {
	customer_number: string;
	internal_key: string;
	salutation: string;
	title: string;
	first_name: string;
	last_name: string;
	company: string;
	company_addition: string;
	email: string;
	phone: string;
	fax: string;
	mobile: string;
	website: string;
	street: string;
	address_addition: string;
	street_number: string;
	postal_code: string;
	city: string;
	country: string;
	state: string;
	vat_id: string;
	tax_number: string;
	customer_type: string;
	customer_group: string;
	status: string;
	source: string;
	import_reference: string;
	notes: string;
	additional_info: string;
	birthday: string;
	ebay_name: string;
	language: string;
	preferred_contact_method: string;
	total_purchases: number;
	total_spent: number;
	last_purchase_date: string;
	legacy_customer_id: string;
	legacy_system_reference: string;
	first_contact_date: string;
	last_contact_date: string;
	[key: string]: string | number; // Index signature for dynamic access
};

const initialForm: ManualCustomerForm = {
	customer_number: '',
	internal_key: '',
	salutation: '',
	title: '',
	first_name: '',
	last_name: '',
	company: '',
	company_addition: '',
	email: '',
	phone: '',
	fax: '',
	mobile: '',
	website: '',
	street: '',
	address_addition: '',
	street_number: '',
	postal_code: '',
	city: '',
	country: '',
	state: '',
	vat_id: '',
	tax_number: '',
	customer_type: 'walk-in',
	customer_group: '',
	status: 'active',
	source: 'manual-entry',
	import_reference: '',
	notes: '',
	additional_info: '',
	birthday: '',
	ebay_name: '',
	language: 'de',
	preferred_contact_method: '',
	total_purchases: 0,
	total_spent: 0,
	last_purchase_date: '',
	legacy_customer_id: '',
	legacy_system_reference: '',
	first_contact_date: '',
	last_contact_date: '',
};

export default function CreateManualCustomerPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [form, setForm] = useState<ManualCustomerForm>(initialForm);
	const [loading, setLoading] = useState(false);

	// Handle field changes
	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setForm(prev => ({ ...prev, [name]: value }));
	};

	// Handle select changes
	const handleSelect = (name: string, value: string) => {
		setForm(prev => ({ ...prev, [name]: value }));
	};

	// Handle form submit
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Require at least one of: first_name, last_name, company, or email
		const hasRequiredField =
			form.first_name?.trim() ||
			form.last_name?.trim() ||
			form.company?.trim() ||
			form.email?.trim();

		if (!hasRequiredField) {
			toast.error(
				'Mindestens ein Feld erforderlich: Vorname, Nachname, Firma oder E-Mail',
			);
			return;
		}

		setLoading(true);
		try {
			// Prepare payload (convert empty strings to null, handle numbers/dates)
			const payload: Record<string, any> = { ...form };

			// Set reasonable defaults for required fields if they're empty
			if (!payload.customer_type) payload.customer_type = 'walk-in';
			if (!payload.status) payload.status = 'active';
			if (!payload.source) payload.source = 'manual-entry';
			if (!payload.language) payload.language = 'de';
			if (!payload.first_contact_date) payload.first_contact_date = new Date();

			// Convert empty strings to null
			Object.keys(payload).forEach(k => {
				if (payload[k] === '') payload[k] = null;
			});
			// Convert numbers
			payload.total_purchases = Number(payload.total_purchases) || 0;
			payload.total_spent = Number(payload.total_spent) || 0;
			// Convert dates (if present)
			[
				'birthday',
				'last_purchase_date',
				'first_contact_date',
				'last_contact_date',
			].forEach(k => {
				if (payload[k]) payload[k] = new Date(payload[k]);
			});

			const res = await fetch('/admin/manual-customers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Fehler beim Erstellen des Kunden');
			}

			toast.success('Kunde erfolgreich erstellt');

			// Invalidate cache to ensure fresh data on the overview page
			queryClient.invalidateQueries({ queryKey: ['admin-manual-customers'] });

			navigate('/manual-customers');
		} catch (err) {
			const error =
				err instanceof Error
					? err
					: new Error('Fehler beim Erstellen des Kunden');
			toast.error(error.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Container>
			{/* Header */}
			<div className="flex items-center gap-4 mb-6">
				<Button
					variant="secondary"
					size="small"
					onClick={() => navigate('/manual-customers')}
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Zurück
				</Button>
				<div>
					<Text size="xlarge" weight="plus" className="text-ui-fg-base">
						Neuen manuellen Kunden anlegen
					</Text>
					<Text size="small" className="text-ui-fg-subtle">
						Mindestens ein Feld erforderlich: Vorname, Nachname, Firma oder
						E-Mail
					</Text>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* Identification */}
				<Section title="Identifikation">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Kundennummer
						</Text>
						<Input
							name="customer_number"
							value={form.customer_number || ''}
							onChange={handleChange}
							placeholder="Automatisch generiert"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Interner Schlüssel
						</Text>
						<Input
							name="internal_key"
							value={form.internal_key || ''}
							onChange={handleChange}
							placeholder="Interner Schlüssel"
						/>
					</div>
				</Section>

				{/* Personal Info */}
				<Section title="Persönliche Informationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Anrede
						</Text>
						<Input
							name="salutation"
							value={form.salutation || ''}
							onChange={handleChange}
							placeholder="Herr/Frau"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Titel
						</Text>
						<Input
							name="title"
							value={form.title || ''}
							onChange={handleChange}
							placeholder="Dr., Prof., etc."
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Vorname <span className="text-ui-fg-error">*</span>
						</Text>
						<Input
							name="first_name"
							value={form.first_name || ''}
							onChange={handleChange}
							placeholder="Vorname"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Nachname <span className="text-ui-fg-error">*</span>
						</Text>
						<Input
							name="last_name"
							value={form.last_name || ''}
							onChange={handleChange}
							placeholder="Nachname"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Firma <span className="text-ui-fg-error">*</span>
						</Text>
						<Input
							name="company"
							value={form.company || ''}
							onChange={handleChange}
							placeholder="Firmenname"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Firmenzusatz
						</Text>
						<Input
							name="company_addition"
							value={form.company_addition || ''}
							onChange={handleChange}
							placeholder="GmbH, AG, etc."
						/>
					</div>
				</Section>

				{/* Contact Info */}
				<Section title="Kontaktinformationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							E-Mail <span className="text-ui-fg-error">*</span>
						</Text>
						<Input
							name="email"
							value={form.email || ''}
							onChange={handleChange}
							type="email"
							placeholder="kunde@beispiel.de"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Telefon
						</Text>
						<Input
							name="phone"
							value={form.phone || ''}
							onChange={handleChange}
							placeholder="+49 30 12345678"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Fax
						</Text>
						<Input
							name="fax"
							value={form.fax || ''}
							onChange={handleChange}
							placeholder="+49 30 12345679"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Mobil
						</Text>
						<Input
							name="mobile"
							value={form.mobile || ''}
							onChange={handleChange}
							placeholder="+49 170 1234567"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Webseite
						</Text>
						<Input
							name="website"
							value={form.website || ''}
							onChange={handleChange}
							placeholder="https://beispiel.de"
						/>
					</div>
				</Section>

				{/* Address Info */}
				<Section title="Adresse">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Straße
						</Text>
						<Input
							name="street"
							value={form.street || ''}
							onChange={handleChange}
							placeholder="Musterstraße"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Adresszusatz
						</Text>
						<Input
							name="address_addition"
							value={form.address_addition || ''}
							onChange={handleChange}
							placeholder="Hinterhof, c/o, etc."
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Hausnummer
						</Text>
						<Input
							name="street_number"
							value={form.street_number || ''}
							onChange={handleChange}
							placeholder="123a"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							PLZ
						</Text>
						<Input
							name="postal_code"
							value={form.postal_code || ''}
							onChange={handleChange}
							placeholder="12345"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Stadt
						</Text>
						<Input
							name="city"
							value={form.city || ''}
							onChange={handleChange}
							placeholder="Berlin"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Land
						</Text>
						<Input
							name="country"
							value={form.country || ''}
							onChange={handleChange}
							placeholder="Deutschland"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Bundesland
						</Text>
						<Input
							name="state"
							value={form.state || ''}
							onChange={handleChange}
							placeholder="Berlin"
						/>
					</div>
				</Section>

				{/* Business Info */}
				<Section title="Geschäftliche Informationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							USt-IdNr.
						</Text>
						<Input
							name="vat_id"
							value={form.vat_id || ''}
							onChange={handleChange}
							placeholder="DE123456789"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Steuernummer
						</Text>
						<Input
							name="tax_number"
							value={form.tax_number || ''}
							onChange={handleChange}
							placeholder="123/456/78901"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Kundengruppe
						</Text>
						<Input
							name="customer_group"
							value={form.customer_group || ''}
							onChange={handleChange}
							placeholder="Privat, Geschäft, VIP"
						/>
					</div>
				</Section>

				{/* Status & Type */}
				<Section title="Typ & Status">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Kundentyp
						</Text>
						<Select
							value={form.customer_type}
							onValueChange={v => handleSelect('customer_type', v)}
						>
							<Select.Trigger className="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="walk-in">Laufkundschaft</Select.Item>
								<Select.Item value="legacy">Legacy</Select.Item>
								<Select.Item value="business">Geschäftskunde</Select.Item>
								<Select.Item value="private">Privatkunde</Select.Item>
								<Select.Item value="online">Online-Kunde</Select.Item>
							</Select.Content>
						</Select>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Status
						</Text>
						<Select
							value={form.status}
							onValueChange={v => handleSelect('status', v)}
						>
							<Select.Trigger className="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="active">Aktiv</Select.Item>
								<Select.Item value="inactive">Inaktiv</Select.Item>
								<Select.Item value="blocked">Blockiert</Select.Item>
								<Select.Item value="pending">Wartend</Select.Item>
							</Select.Content>
						</Select>
					</div>
				</Section>

				{/* Source & Import */}
				<Section title="Quelle & Import">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Quelle
						</Text>
						<Input
							name="source"
							value={form.source || ''}
							onChange={handleChange}
							placeholder="manual-entry, csv-import, etc."
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Import-Referenz
						</Text>
						<Input
							name="import_reference"
							value={form.import_reference || ''}
							onChange={handleChange}
							placeholder="Batch-ID oder Dateiname"
						/>
					</div>
				</Section>

				{/* Additional Info */}
				<Section title="Weitere Informationen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Notizen
						</Text>
						<Textarea
							name="notes"
							value={form.notes || ''}
							onChange={handleChange}
							rows={3}
							placeholder="Interne Notizen zum Kunden"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Zusätzliche Infos (JSON)
						</Text>
						<Textarea
							name="additional_info"
							value={form.additional_info || ''}
							onChange={handleChange}
							rows={3}
							placeholder="JSON-Daten für erweiterte Informationen"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Geburtstag
						</Text>
						<Input
							name="birthday"
							value={form.birthday || ''}
							onChange={handleChange}
							type="date"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							eBay-Name
						</Text>
						<Input
							name="ebay_name"
							value={form.ebay_name || ''}
							onChange={handleChange}
							placeholder="eBay-Benutzername"
						/>
					</div>
				</Section>

				{/* Preferences */}
				<Section title="Präferenzen">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Sprache
						</Text>
						<Select
							value={form.language}
							onValueChange={v => handleSelect('language', v)}
						>
							<Select.Trigger className="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="de">Deutsch</Select.Item>
								<Select.Item value="en">English</Select.Item>
								<Select.Item value="fr">Français</Select.Item>
								<Select.Item value="es">Español</Select.Item>
							</Select.Content>
						</Select>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Bevorzugte Kontaktmethode
						</Text>
						<Select
							value={form.preferred_contact_method}
							onValueChange={v => handleSelect('preferred_contact_method', v)}
						>
							<Select.Trigger className="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="email">E-Mail</Select.Item>
								<Select.Item value="phone">Telefon</Select.Item>
								<Select.Item value="sms">SMS</Select.Item>
								<Select.Item value="letter">Brief</Select.Item>
							</Select.Content>
						</Select>
					</div>
				</Section>

				{/* Purchase History */}
				<Section title="Kaufhistorie">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Anzahl Käufe
						</Text>
						<Input
							name="total_purchases"
							value={form.total_purchases}
							onChange={handleChange}
							type="number"
							min={0}
							placeholder="0"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Gesamtausgaben (Cent)
						</Text>
						<Input
							name="total_spent"
							value={form.total_spent}
							onChange={handleChange}
							type="number"
							min={0}
							placeholder="0"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Letzter Kauf (Datum)
						</Text>
						<Input
							name="last_purchase_date"
							value={form.last_purchase_date || ''}
							onChange={handleChange}
							type="date"
						/>
					</div>
				</Section>

				{/* Legacy Fields */}
				<Section title="Legacy-Kunde">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Legacy-Kunden-ID
						</Text>
						<Input
							name="legacy_customer_id"
							value={form.legacy_customer_id || ''}
							onChange={handleChange}
							placeholder="ID aus altem System"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Legacy-System-Referenz
						</Text>
						<Input
							name="legacy_system_reference"
							value={form.legacy_system_reference || ''}
							onChange={handleChange}
							placeholder="Referenz im alten System"
						/>
					</div>
				</Section>

				{/* Timestamps */}
				<Section title="Kontakt-Zeitstempel">
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Erster Kontakt (Datum)
						</Text>
						<Input
							name="first_contact_date"
							value={form.first_contact_date || ''}
							onChange={handleChange}
							type="date"
						/>
					</div>
					<div>
						<Text size="small" weight="plus" className="text-ui-fg-base mb-2">
							Letzter Kontakt (Datum)
						</Text>
						<Input
							name="last_contact_date"
							value={form.last_contact_date || ''}
							onChange={handleChange}
							type="date"
						/>
					</div>
				</Section>

				{/* Submit */}
				<div className="flex justify-end gap-4">
					<Button
						type="button"
						variant="secondary"
						onClick={() => navigate('/manual-customers')}
					>
						Abbrechen
					</Button>
					<Button type="submit" disabled={loading}>
						{loading ? 'Wird erstellt...' : 'Kunde anlegen'}
					</Button>
				</div>
			</form>
		</Container>
	);
}

// Helper section component for grouping fields
function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-ui-bg-subtle rounded-lg p-6 mb-2">
			<Text size="large" weight="plus" className="text-ui-fg-base mb-4">
				{title}
			</Text>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
		</div>
	);
}
